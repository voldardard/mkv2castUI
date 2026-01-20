"""
Tests for conversions models.
"""
import pytest
from django.utils import timezone

from conversions.models import ConversionJob, ConversionLog, PendingFile


class TestConversionJobModel:
    """Tests for the ConversionJob model."""
    
    def test_create_job(self, db, user):
        """Test creating a conversion job."""
        job = ConversionJob.objects.create(
            user=user,
            original_filename='test.mkv',
            original_file_size=1024 * 1024,
            container='mp4',
            hw_backend='auto',
        )
        assert job.id is not None
        assert job.status == 'pending'
        assert job.progress == 0
    
    def test_job_status_choices(self, db, user):
        """Test valid job status values."""
        valid_statuses = ['pending', 'queued', 'analyzing', 'processing', 'completed', 'failed', 'cancelled']
        
        for status in valid_statuses:
            job = ConversionJob.objects.create(
                user=user,
                original_filename='test.mkv',
                original_file_size=1024,
                status=status,
            )
            assert job.status == status
    
    def test_job_container_choices(self, db, user):
        """Test valid container formats."""
        for container in ['mp4', 'mkv']:
            job = ConversionJob.objects.create(
                user=user,
                original_filename='test.mkv',
                original_file_size=1024,
                container=container,
            )
            assert job.container == container
    
    def test_job_hw_backend_choices(self, db, user):
        """Test valid hardware backends."""
        for backend in ['auto', 'cpu', 'vaapi', 'qsv']:
            job = ConversionJob.objects.create(
                user=user,
                original_filename='test.mkv',
                original_file_size=1024,
                hw_backend=backend,
            )
            assert job.hw_backend == backend
    
    def test_job_timestamps(self, db, user):
        """Test job timestamp fields."""
        job = ConversionJob.objects.create(
            user=user,
            original_filename='test.mkv',
            original_file_size=1024,
        )
        assert job.created_at is not None
        assert job.started_at is None
        assert job.completed_at is None
        
        # Simulate job start
        job.started_at = timezone.now()
        job.save()
        assert job.started_at is not None
        
        # Simulate job completion
        job.completed_at = timezone.now()
        job.save()
        assert job.completed_at is not None
    
    def test_job_quality_settings(self, db, user):
        """Test job quality settings."""
        job = ConversionJob.objects.create(
            user=user,
            original_filename='test.mkv',
            original_file_size=1024,
            crf=18,
            preset='slow',
            audio_bitrate='256k',
            vaapi_qp=20,
            qsv_quality=20,
        )
        assert job.crf == 18
        assert job.preset == 'slow'
        assert job.audio_bitrate == '256k'
        assert job.vaapi_qp == 20
        assert job.qsv_quality == 20
    
    def test_job_codec_flags(self, db, user):
        """Test job codec flags."""
        job = ConversionJob.objects.create(
            user=user,
            original_filename='test.mkv',
            original_file_size=1024,
            force_h264=True,
            allow_hevc=False,
            force_aac=True,
            keep_surround=True,
        )
        assert job.force_h264 is True
        assert job.allow_hevc is False
        assert job.force_aac is True
        assert job.keep_surround is True
    
    def test_job_progress_update(self, db, user):
        """Test updating job progress."""
        job = ConversionJob.objects.create(
            user=user,
            original_filename='test.mkv',
            original_file_size=1024,
        )
        
        for progress in [0, 25, 50, 75, 100]:
            job.progress = progress
            job.save()
            job.refresh_from_db()
            assert job.progress == progress
    
    def test_job_error_message(self, db, user):
        """Test storing error message on failed job."""
        job = ConversionJob.objects.create(
            user=user,
            original_filename='test.mkv',
            original_file_size=1024,
            status='failed',
            error_message='FFmpeg error: codec not found',
        )
        assert job.error_message == 'FFmpeg error: codec not found'
    
    def test_job_string_representation(self, conversion_job):
        """Test job string representation."""
        str_repr = str(conversion_job)
        assert conversion_job.original_filename in str_repr or str(conversion_job.id) in str_repr


class TestConversionLogModel:
    """Tests for the ConversionLog model."""
    
    def test_create_log(self, db, conversion_job):
        """Test creating a conversion log entry."""
        log = ConversionLog.objects.create(
            job=conversion_job,
            level='info',
            message='Starting conversion',
        )
        assert log.id is not None
        assert log.timestamp is not None
    
    def test_log_levels(self, db, conversion_job):
        """Test different log levels."""
        levels = ['debug', 'info', 'warning', 'error']
        
        for level in levels:
            log = ConversionLog.objects.create(
                job=conversion_job,
                level=level,
                message=f'Test {level} message',
            )
            assert log.level == level
    
    def test_logs_ordering(self, db, conversion_job):
        """Test that logs are ordered by timestamp."""
        log1 = ConversionLog.objects.create(job=conversion_job, level='info', message='First')
        log2 = ConversionLog.objects.create(job=conversion_job, level='info', message='Second')
        log3 = ConversionLog.objects.create(job=conversion_job, level='info', message='Third')
        
        logs = list(conversion_job.logs.all())
        # Should be ordered by timestamp (ascending or descending depending on model)
        assert len(logs) == 3
    
    def test_log_cascade_delete(self, db, user):
        """Test that logs are deleted when job is deleted."""
        job = ConversionJob.objects.create(
            user=user,
            original_filename='test.mkv',
            original_file_size=1024,
        )
        ConversionLog.objects.create(job=job, level='info', message='Test log')
        
        job_id = job.id
        job.delete()
        
        # Logs should be deleted
        assert ConversionLog.objects.filter(job_id=job_id).count() == 0


class TestPendingFileModel:
    """Tests for the PendingFile model."""
    
    def test_create_pending_file(self, db, user):
        """Test creating a pending file."""
        from django.utils import timezone
        from datetime import timedelta
        
        pending_file = PendingFile.objects.create(
            user=user,
            original_filename='test_video.mkv',
            file_key='upload/test-uuid/test_video.mkv',
            file_size=1024 * 1024,  # 1MB
            status='uploading',
            expires_at=timezone.now() + timedelta(hours=24),
        )
        assert pending_file.id is not None
        assert pending_file.request_id is not None
        assert pending_file.user == user
        assert pending_file.status == 'uploading'
    
    def test_pending_file_status_choices(self, db, user):
        """Test valid pending file status values."""
        from django.utils import timezone
        from datetime import timedelta
        
        valid_statuses = ['uploading', 'analyzing', 'ready', 'expired', 'used']
        
        for status in valid_statuses:
            pending_file = PendingFile.objects.create(
                user=user,
                original_filename='test.mkv',
                file_key=f'upload/test-{status}.mkv',
                file_size=1024,
                status=status,
                expires_at=timezone.now() + timedelta(hours=24),
            )
            assert pending_file.status == status
    
    def test_pending_file_expiry(self, db, user, site_settings):
        """Test that expires_at is set automatically if not provided."""
        from django.utils import timezone
        
        pending_file = PendingFile.objects.create(
            user=user,
            original_filename='test.mkv',
            file_key='upload/test.mkv',
            file_size=1024,
            status='uploading',
        )
        assert pending_file.expires_at is not None
        # Should be approximately 24 hours from now (default from SiteSettings)
        expected_expiry = timezone.now() + timezone.timedelta(hours=site_settings.pending_file_expiry_hours)
        # Allow 1 minute tolerance
        assert abs((pending_file.expires_at - expected_expiry).total_seconds()) < 60
    
    def test_pending_file_user_relationship(self, db, user):
        """Test pending file user relationship."""
        from django.utils import timezone
        from datetime import timedelta
        
        pending_file = PendingFile.objects.create(
            user=user,
            original_filename='test.mkv',
            file_key='upload/test.mkv',
            file_size=1024,
            status='ready',
            expires_at=timezone.now() + timedelta(hours=24),
        )
        
        # Test reverse relationship
        assert pending_file in user.pending_files.all()
        assert user.pending_files.count() >= 1
    
    def test_pending_file_to_conversion_job(self, db, user):
        """Test linking pending file to conversion job."""
        from django.utils import timezone
        from datetime import timedelta
        
        pending_file = PendingFile.objects.create(
            user=user,
            original_filename='test.mkv',
            file_key='upload/test.mkv',
            file_size=1024 * 1024,
            status='ready',
            expires_at=timezone.now() + timedelta(hours=24),
        )
        
        # Create conversion job linked to pending file
        job = ConversionJob.objects.create(
            user=user,
            original_filename=pending_file.original_filename,
            original_file_size=pending_file.file_size,
            pending_file=pending_file,
            status='pending',
        )
        
        assert job.pending_file == pending_file
        assert job in pending_file.conversion_jobs.all()
        
        # Update pending file status to 'used'
        pending_file.status = 'used'
        pending_file.save()
        assert pending_file.status == 'used'
    
    def test_pending_file_metadata(self, db, user):
        """Test storing metadata in pending file."""
        from django.utils import timezone
        from datetime import timedelta
        
        metadata = {
            'duration': 120.5,
            'video_codec': 'hevc',
            'audio_codec': 'ac3',
            'streams': [
                {'codec_type': 'video', 'codec_name': 'hevc'},
                {'codec_type': 'audio', 'codec_name': 'ac3'},
            ]
        }
        
        pending_file = PendingFile.objects.create(
            user=user,
            original_filename='test.mkv',
            file_key='upload/test.mkv',
            file_size=1024,
            status='analyzing',
            metadata=metadata,
            expires_at=timezone.now() + timedelta(hours=24),
        )
        
        assert pending_file.metadata == metadata
        assert pending_file.metadata['duration'] == 120.5
        assert pending_file.metadata['video_codec'] == 'hevc'
    
    def test_pending_file_string_representation(self, db, user):
        """Test pending file string representation."""
        from django.utils import timezone
        from datetime import timedelta
        
        pending_file = PendingFile.objects.create(
            user=user,
            original_filename='test_video.mkv',
            file_key='upload/test.mkv',
            file_size=1024,
            status='ready',
            expires_at=timezone.now() + timedelta(hours=24),
        )
        
        str_repr = str(pending_file)
        assert 'test_video.mkv' in str_repr
        assert 'ready' in str_repr
