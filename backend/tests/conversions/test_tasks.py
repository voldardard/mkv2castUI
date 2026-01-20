"""
Tests for conversion tasks.
"""
import pytest
from unittest.mock import patch, MagicMock
from django.conf import settings

from conversions.tasks import (
    build_mkv2cast_config,
    send_progress_update,
    add_log,
    validate_and_adjust_tracks,
)
from conversions.models import ConversionJob, ConversionLog, PendingFile


class TestBuildMkv2castConfig:
    """Tests for building mkv2cast Config object."""
    
    def test_basic_config(self, conversion_job):
        """Test building a basic conversion config."""
        config = build_mkv2cast_config(conversion_job)
        
        assert config is not None
        assert config.container == conversion_job.container
        assert config.hw == conversion_job.hw_backend
    
    def test_cpu_encoding_options(self, conversion_job):
        """Test CPU encoding includes CRF and preset."""
        conversion_job.hw_backend = 'cpu'
        conversion_job.crf = 20
        conversion_job.preset = 'slow'
        conversion_job.save()
        
        config = build_mkv2cast_config(conversion_job)
        
        assert config.hw == 'cpu'
        assert config.crf == 20
        assert config.preset == 'slow'
    
    def test_vaapi_encoding_options(self, conversion_job):
        """Test VAAPI encoding includes QP."""
        conversion_job.hw_backend = 'vaapi'
        conversion_job.vaapi_qp = 25
        conversion_job.save()
        
        config = build_mkv2cast_config(conversion_job)
        
        assert config.hw == 'vaapi'
        assert config.vaapi_qp == 25
    
    def test_qsv_encoding_options(self, conversion_job):
        """Test QSV encoding includes quality."""
        conversion_job.hw_backend = 'qsv'
        conversion_job.qsv_quality = 22
        conversion_job.save()
        
        config = build_mkv2cast_config(conversion_job)
        
        assert config.hw == 'qsv'
        assert config.qsv_quality == 22
    
    def test_audio_options(self, conversion_job):
        """Test audio options are included."""
        conversion_job.audio_bitrate = '256k'
        conversion_job.save()
        
        config = build_mkv2cast_config(conversion_job)
        
        assert config.abr == '256k'
    
    def test_codec_flags(self, conversion_job):
        """Test codec flags are included."""
        conversion_job.force_h264 = True
        conversion_job.allow_hevc = True
        conversion_job.force_aac = True
        conversion_job.keep_surround = True
        conversion_job.save()
        
        config = build_mkv2cast_config(conversion_job)
        
        assert config.force_h264 is True
        assert config.allow_hevc is True
        assert config.force_aac is True
        assert config.keep_surround is True
    
    def test_integrity_check_disabled(self, conversion_job):
        """Test integrity check can be disabled."""
        conversion_job.integrity_check = False
        conversion_job.save()
        
        config = build_mkv2cast_config(conversion_job)
        
        assert config.integrity_check is False
    
    def test_deep_check_enabled(self, conversion_job):
        """Test deep check can be enabled."""
        conversion_job.deep_check = True
        conversion_job.save()
        
        config = build_mkv2cast_config(conversion_job)
        
        assert config.deep_check is True
    
    def test_config_includes_all_job_settings(self, conversion_job):
        """Test that config includes all relevant job settings."""
        conversion_job.container = 'mp4'
        conversion_job.suffix = '.cast'
        conversion_job.skip_when_ok = False
        conversion_job.no_subtitles = True
        conversion_job.prefer_forced_subs = False
        conversion_job.save()
        
        config = build_mkv2cast_config(conversion_job)
        
        assert config.container == 'mp4'
        assert config.suffix == '.cast'
        assert config.skip_when_ok is False
        assert config.no_subtitles is True
        assert config.prefer_forced_subs is False


# Note: parse_ffmpeg_progress function was removed from tasks.py
# These tests are kept for reference but are currently disabled


class TestSendProgressUpdate:
    """Tests for WebSocket progress updates."""
    
    @patch('conversions.tasks.async_to_sync')
    @patch('conversions.tasks.get_channel_layer')
    def test_send_progress_calls_channel_layer(self, mock_get_channel, mock_async_to_sync):
        """Test that progress update uses channel layer."""
        mock_layer = MagicMock()
        mock_get_channel.return_value = mock_layer
        mock_sync_call = MagicMock()
        mock_async_to_sync.return_value = mock_sync_call
        
        send_progress_update('test-job-id', 50, 'processing', 'VIDEO', 120)
        
        mock_async_to_sync.assert_called_once()
        mock_sync_call.assert_called_once()
    
    @patch('conversions.tasks.async_to_sync')
    @patch('conversions.tasks.get_channel_layer')
    def test_send_progress_message_format(self, mock_get_channel, mock_async_to_sync):
        """Test the format of the progress message."""
        mock_layer = MagicMock()
        mock_get_channel.return_value = mock_layer
        mock_sync_call = MagicMock()
        mock_async_to_sync.return_value = mock_sync_call
        
        send_progress_update('test-job-id', 75, 'processing', 'AUDIO', 60, '')
        
        # Check that async_to_sync was called with group_send
        mock_async_to_sync.assert_called_with(mock_layer.group_send)
        
        # Check the arguments passed to the sync call
        call_args = mock_sync_call.call_args
        group_name = call_args[0][0]
        message = call_args[0][1]
        
        assert group_name == 'conversion_test-job-id'
        assert message['type'] == 'conversion_progress'
        assert message['progress'] == 75
        assert message['status'] == 'processing'


class TestAddLog:
    """Tests for adding conversion logs."""
    
    def test_add_log_creates_entry(self, conversion_job):
        """Test that add_log creates a log entry."""
        initial_count = ConversionLog.objects.filter(job=conversion_job).count()
        
        add_log(conversion_job, 'info', 'Test message')
        
        new_count = ConversionLog.objects.filter(job=conversion_job).count()
        assert new_count == initial_count + 1
    
    def test_add_log_content(self, conversion_job):
        """Test log entry content."""
        add_log(conversion_job, 'error', 'Error occurred')
        
        log = ConversionLog.objects.filter(job=conversion_job).last()
        assert log.level == 'error'
        assert log.message == 'Error occurred'
    
    def test_add_log_with_none_job(self, caplog):
        """Test that add_log with None job does not create DB logs when job is None."""
        # Should not raise IntegrityError and should not create ConversionLog entries
        add_log(None, 'debug', 'Test message for pending file analysis')
        add_log(None, 'info', 'Info message')
        add_log(None, 'warning', 'Warning message')
        add_log(None, 'error', 'Error message')
        
        # Verify no ConversionLog was created
        assert ConversionLog.objects.count() == 0


@pytest.mark.django_db
class TestValidateAndAdjustTracks:
    """Tests for validate_and_adjust_tracks function."""
    
    def test_valid_tracks_unchanged(self, user, db):
        """Test that valid tracks are not changed."""
        metadata = {
            'audio_tracks': [
                {
                    'index': 0,
                    'ffmpeg_index': 0,
                    'language': 'eng',
                    'codec': 'aac',
                    'channels': 2,
                    'default': True,
                }
            ],
            'subtitle_tracks': [],
        }
        
        pending = PendingFile.objects.create(
            user=user,
            original_filename='test.mkv',
            file_key='upload/test/test.mkv',
            file_size=1024,
            status='ready',
            metadata=metadata,
        )
        
        job = ConversionJob.objects.create(
            user=user,
            original_filename='test.mkv',
            original_file_size=1024,
            pending_file=pending,
            audio_track=0,  # Valid track
        )
        
        result = validate_and_adjust_tracks(job)
        
        assert result['audio_track'] == 0
        assert not result['audio_adjusted']
        assert result['audio_reason'] is None
    
    def test_invalid_audio_track_fallback(self, user, db):
        """Test that invalid audio track falls back to first available track."""
        metadata = {
            'audio_tracks': [
                {
                    'index': 0,
                    'ffmpeg_index': 0,
                    'language': 'fre',
                    'codec': 'aac',
                    'channels': 2,
                    'default': True,
                },
                {
                    'index': 1,
                    'ffmpeg_index': 1,
                    'language': 'eng',
                    'codec': 'aac',
                    'channels': 2,
                    'default': False,
                }
            ],
            'subtitle_tracks': [],
        }
        
        pending = PendingFile.objects.create(
            user=user,
            original_filename='test.mkv',
            file_key='upload/test/test.mkv',
            file_size=1024,
            status='ready',
            metadata=metadata,
        )
        
        job = ConversionJob.objects.create(
            user=user,
            original_filename='test.mkv',
            original_file_size=1024,
            pending_file=pending,
            audio_track=5,  # Invalid track (doesn't exist)
        )
        
        result = validate_and_adjust_tracks(job)
        
        assert result['audio_track'] == 0  # Fallback to first track
        assert result['audio_adjusted'] is True
        assert 'not found' in result['audio_reason']
        assert '5' in result['audio_reason']
        assert '0' in result['audio_reason']
    
    def test_invalid_subtitle_track_fallback(self, user, db):
        """Test that invalid subtitle track falls back to first available track."""
        metadata = {
            'audio_tracks': [],
            'subtitle_tracks': [
                {
                    'index': 0,
                    'ffmpeg_index': 2,
                    'language': 'fre',
                    'codec': 'srt',
                    'forced': False,
                    'default': True,
                }
            ],
        }
        
        pending = PendingFile.objects.create(
            user=user,
            original_filename='test.mkv',
            file_key='upload/test/test.mkv',
            file_size=1024,
            status='ready',
            metadata=metadata,
        )
        
        job = ConversionJob.objects.create(
            user=user,
            original_filename='test.mkv',
            original_file_size=1024,
            pending_file=pending,
            subtitle_track=99,  # Invalid track
        )
        
        result = validate_and_adjust_tracks(job)
        
        assert result['subtitle_track'] == 2  # Fallback to first track's ffmpeg_index
        assert result['subtitle_adjusted'] is True
        assert 'not found' in result['subtitle_reason']
    
    def test_no_metadata_skips_validation(self, user, db):
        """Test that missing metadata skips validation."""
        pending = PendingFile.objects.create(
            user=user,
            original_filename='test.mkv',
            file_key='upload/test/test.mkv',
            file_size=1024,
            status='ready',
            metadata={},  # Empty metadata
        )
        
        job = ConversionJob.objects.create(
            user=user,
            original_filename='test.mkv',
            original_file_size=1024,
            pending_file=pending,
            audio_track=5,
        )
        
        result = validate_and_adjust_tracks(job)
        
        # Should return original values without adjustment
        assert result['audio_track'] == 5
        assert not result['audio_adjusted']
    
    def test_no_pending_file_skips_validation(self, user, db):
        """Test that job without pending_file skips validation."""
        job = ConversionJob.objects.create(
            user=user,
            original_filename='test.mkv',
            original_file_size=1024,
            pending_file=None,  # No pending file
            audio_track=3,
        )
        
        result = validate_and_adjust_tracks(job)
        
        # Should return original values
        assert result['audio_track'] == 3
        assert not result['audio_adjusted']
    
    def test_audio_track_fallback_by_language(self, user, db):
        """Test that fallback prefers tracks matching audio_lang."""
        metadata = {
            'audio_tracks': [
                {
                    'index': 0,
                    'ffmpeg_index': 0,
                    'language': 'eng',
                    'codec': 'aac',
                    'channels': 2,
                    'default': False,
                },
                {
                    'index': 1,
                    'ffmpeg_index': 1,
                    'language': 'fre',
                    'codec': 'aac',
                    'channels': 2,
                    'default': True,
                }
            ],
            'subtitle_tracks': [],
        }
        
        pending = PendingFile.objects.create(
            user=user,
            original_filename='test.mkv',
            file_key='upload/test/test.mkv',
            file_size=1024,
            status='ready',
            metadata=metadata,
        )
        
        job = ConversionJob.objects.create(
            user=user,
            original_filename='test.mkv',
            original_file_size=1024,
            pending_file=pending,
            audio_track=5,  # Invalid
            audio_lang='fre',  # Prefer French
        )
        
        result = validate_and_adjust_tracks(job)
        
        # Should fallback to French track (ffmpeg_index 1)
        assert result['audio_track'] == 1
        assert result['audio_adjusted'] is True
