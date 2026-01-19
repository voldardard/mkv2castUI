"""
Tests for conversion tasks.
"""
import pytest
from unittest.mock import patch, MagicMock
from django.conf import settings

from conversions.tasks import (
    build_mkv2cast_command,
    parse_ffmpeg_progress,
    send_progress_update,
    add_log,
)
from conversions.models import ConversionJob, ConversionLog


class TestBuildMkv2castCommand:
    """Tests for building mkv2cast commands."""
    
    def test_basic_command(self, conversion_job):
        """Test building a basic conversion command."""
        cmd = build_mkv2cast_command(conversion_job, '/input/file.mkv', '/output/file.mp4')
        
        assert 'mkv2cast' in cmd
        assert '--container' in cmd
        assert 'mp4' in cmd
    
    def test_cpu_encoding_options(self, conversion_job):
        """Test CPU encoding includes CRF and preset."""
        conversion_job.hw_backend = 'cpu'
        conversion_job.crf = 20
        conversion_job.preset = 'slow'
        
        cmd = build_mkv2cast_command(conversion_job, '/input.mkv', '/output.mp4')
        
        assert '--crf' in cmd
        assert '20' in cmd
        assert '--preset' in cmd
        assert 'slow' in cmd
    
    def test_vaapi_encoding_options(self, conversion_job):
        """Test VAAPI encoding includes QP."""
        conversion_job.hw_backend = 'vaapi'
        conversion_job.vaapi_qp = 25
        
        cmd = build_mkv2cast_command(conversion_job, '/input.mkv', '/output.mp4')
        
        assert '--hw' in cmd
        assert 'vaapi' in cmd
        assert '--vaapi-qp' in cmd
        assert '25' in cmd
    
    def test_qsv_encoding_options(self, conversion_job):
        """Test QSV encoding includes quality."""
        conversion_job.hw_backend = 'qsv'
        conversion_job.qsv_quality = 22
        
        cmd = build_mkv2cast_command(conversion_job, '/input.mkv', '/output.mp4')
        
        assert '--hw' in cmd
        assert 'qsv' in cmd
        assert '--qsv-quality' in cmd
        assert '22' in cmd
    
    def test_audio_options(self, conversion_job):
        """Test audio options are included."""
        conversion_job.audio_bitrate = '256k'
        
        cmd = build_mkv2cast_command(conversion_job, '/input.mkv', '/output.mp4')
        
        assert '--abr' in cmd
        assert '256k' in cmd
    
    def test_codec_flags(self, conversion_job):
        """Test codec flags are included."""
        conversion_job.force_h264 = True
        conversion_job.allow_hevc = True
        conversion_job.force_aac = True
        conversion_job.keep_surround = True
        
        cmd = build_mkv2cast_command(conversion_job, '/input.mkv', '/output.mp4')
        
        assert '--force-h264' in cmd
        assert '--allow-hevc' in cmd
        assert '--force-aac' in cmd
        assert '--keep-surround' in cmd
    
    def test_integrity_check_disabled(self, conversion_job):
        """Test integrity check can be disabled."""
        conversion_job.integrity_check = False
        
        cmd = build_mkv2cast_command(conversion_job, '/input.mkv', '/output.mp4')
        
        assert '--no-integrity-check' in cmd
    
    def test_deep_check_enabled(self, conversion_job):
        """Test deep check can be enabled."""
        conversion_job.deep_check = True
        
        cmd = build_mkv2cast_command(conversion_job, '/input.mkv', '/output.mp4')
        
        assert '--deep-check' in cmd
    
    def test_input_file_included(self, conversion_job):
        """Test input file is the last argument."""
        cmd = build_mkv2cast_command(conversion_job, '/input/test.mkv', '/output.mp4')
        
        assert '/input/test.mkv' in cmd
        assert cmd[-1] == '/input/test.mkv'


class TestParseFFmpegProgress:
    """Tests for FFmpeg progress parsing."""
    
    def test_parse_valid_time(self):
        """Test parsing valid time format."""
        line = 'frame=100 time=00:01:30.50 bitrate=1000kbits/s'
        progress, time_ms = parse_ffmpeg_progress(line, 300000)  # 5 min duration
        
        assert progress is not None
        assert time_ms == 90500  # 1:30.50 in ms
    
    def test_parse_calculates_progress(self):
        """Test that progress percentage is calculated."""
        line = 'time=00:02:30.00'
        progress, time_ms = parse_ffmpeg_progress(line, 300000)  # 5 min duration
        
        assert progress == 50  # 2:30 of 5:00 = 50%
    
    def test_parse_invalid_line(self):
        """Test parsing line without time."""
        line = 'frame=100 bitrate=1000kbits/s'
        progress, time_ms = parse_ffmpeg_progress(line, 300000)
        
        assert progress is None
        assert time_ms is None
    
    def test_parse_caps_at_99(self):
        """Test that progress caps at 99% during encoding."""
        line = 'time=00:05:00.00'
        progress, time_ms = parse_ffmpeg_progress(line, 300000)  # Exactly 5 min
        
        assert progress == 99  # Should not reach 100 during encoding
    
    def test_parse_zero_duration(self):
        """Test handling zero duration."""
        line = 'time=00:01:00.00'
        progress, time_ms = parse_ffmpeg_progress(line, 0)
        
        # With zero duration, returns None for both values
        assert progress is None
        assert time_ms is None


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
