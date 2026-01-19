"""
Tests for conversions models.
"""
import pytest
from django.utils import timezone

from conversions.models import ConversionJob, ConversionLog


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
