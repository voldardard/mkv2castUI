"""
Models for video conversion jobs.
"""
import os
import uuid
from django.db import models
from django.conf import settings


def upload_to_path(instance, filename):
    """Generate upload path for original files."""
    ext = os.path.splitext(filename)[1]
    return f'uploads/{instance.user.id}/{instance.id}{ext}'


def output_to_path(instance, filename):
    """Generate path for converted output files."""
    ext = os.path.splitext(filename)[1]
    return f'outputs/{instance.user.id}/{instance.id}{ext}'


class ConversionJob(models.Model):
    """
    Represents a video conversion job.
    
    Maps mkv2cast CLI options to database fields for web-based conversion.
    """
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('queued', 'Queued'),
        ('analyzing', 'Analyzing'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
    ]
    
    CONTAINER_CHOICES = [
        ('mkv', 'MKV'),
        ('mp4', 'MP4'),
    ]
    
    HW_BACKEND_CHOICES = [
        ('auto', 'Auto'),
        ('nvenc', 'NVENC'),
        ('vaapi', 'VAAPI'),
        ('qsv', 'QSV'),
        ('cpu', 'CPU'),
    ]
    
    PRESET_CHOICES = [
        ('ultrafast', 'Ultra Fast'),
        ('superfast', 'Super Fast'),
        ('veryfast', 'Very Fast'),
        ('faster', 'Faster'),
        ('fast', 'Fast'),
        ('medium', 'Medium'),
        ('slow', 'Slow'),
        ('slower', 'Slower'),
        ('veryslow', 'Very Slow'),
    ]

    # Primary key
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # User relationship
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='conversion_jobs'
    )
    
    # File fields
    original_filename = models.CharField(max_length=500)
    original_file = models.FileField(upload_to=upload_to_path, max_length=500)
    original_file_size = models.BigIntegerField(default=0)
    output_file = models.FileField(upload_to=output_to_path, max_length=500, null=True, blank=True)
    output_file_size = models.BigIntegerField(default=0)
    
    # Status tracking
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    progress = models.IntegerField(default=0)  # 0-100
    current_stage = models.CharField(max_length=50, blank=True)  # e.g., "TRANSCODE", "AUDIO", "REMUX"
    
    # =========================================================================
    # Conversion Options (maps to mkv2cast CLI arguments)
    # =========================================================================
    
    # Output settings
    container = models.CharField(max_length=10, choices=CONTAINER_CHOICES, default='mkv')
    suffix = models.CharField(max_length=20, default='.cast')
    
    # Hardware acceleration
    hw_backend = models.CharField(max_length=10, choices=HW_BACKEND_CHOICES, default='auto')
    vaapi_qp = models.IntegerField(default=23)
    qsv_quality = models.IntegerField(default=23)
    nvenc_cq = models.IntegerField(default=23)  # NVENC constant quality (0-51)
    
    # Encoding quality
    crf = models.IntegerField(default=20)
    preset = models.CharField(max_length=20, choices=PRESET_CHOICES, default='slow')
    audio_bitrate = models.CharField(max_length=10, default='192k')
    
    # Codec decisions
    force_h264 = models.BooleanField(default=False)
    allow_hevc = models.BooleanField(default=False)
    force_aac = models.BooleanField(default=False)
    keep_surround = models.BooleanField(default=False)
    
    # Integrity checks
    integrity_check = models.BooleanField(default=True)
    deep_check = models.BooleanField(default=False)
    
    # =========================================================================
    # Audio/Subtitle Selection (new mkv2cast v1.1+ options)
    # =========================================================================
    audio_lang = models.CharField(max_length=50, blank=True, default='')  # e.g., "fre,fra,eng"
    audio_track = models.IntegerField(null=True, blank=True)  # Explicit track index (0-based)
    subtitle_lang = models.CharField(max_length=50, blank=True, default='')  # e.g., "fre,eng"
    subtitle_track = models.IntegerField(null=True, blank=True)  # Explicit track index (0-based)
    prefer_forced_subs = models.BooleanField(default=True)  # Prefer forced subtitles
    no_subtitles = models.BooleanField(default=False)  # Disable all subtitles
    
    # =========================================================================
    # Optimization Options
    # =========================================================================
    skip_when_ok = models.BooleanField(default=True)  # Skip if already compatible
    no_silence = models.BooleanField(default=False)  # Keep silence in audio
    
    # =========================================================================
    # Analysis results (from mkv2cast's decide_for function)
    # =========================================================================
    needs_video_transcode = models.BooleanField(null=True)
    needs_audio_transcode = models.BooleanField(null=True)
    video_codec = models.CharField(max_length=50, blank=True)
    audio_codec = models.CharField(max_length=50, blank=True)
    video_reason = models.CharField(max_length=200, blank=True)
    duration_ms = models.BigIntegerField(default=0)
    
    # =========================================================================
    # Timing and logging
    # =========================================================================
    created_at = models.DateTimeField(auto_now_add=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    error_message = models.TextField(blank=True)
    
    # Celery task tracking
    celery_task_id = models.CharField(max_length=50, blank=True)

    class Meta:
        db_table = 'conversions_job'
        ordering = ['-created_at']
        verbose_name = 'Conversion Job'
        verbose_name_plural = 'Conversion Jobs'

    def __str__(self):
        return f'{self.original_filename} ({self.status})'

    @property
    def output_filename(self):
        """Generate the expected output filename."""
        if not self.original_filename:
            return None
        name, _ = os.path.splitext(self.original_filename)
        tag = ''
        if self.needs_video_transcode:
            tag += '.h264'
        if self.needs_audio_transcode:
            tag += '.aac'
        if not tag:
            tag = '.remux'
        return f'{name}{tag}{self.suffix}.{self.container}'

    @property
    def eta_seconds(self):
        """Estimate remaining time based on progress and elapsed time."""
        if self.progress <= 0 or not self.started_at:
            return None
        from django.utils import timezone
        elapsed = (timezone.now() - self.started_at).total_seconds()
        if elapsed <= 0:
            return None
        total_estimated = elapsed / (self.progress / 100)
        return max(0, total_estimated - elapsed)

    def cancel(self):
        """Cancel the conversion job."""
        from .tasks import cancel_conversion
        if self.celery_task_id and self.status in ('pending', 'queued', 'processing'):
            cancel_conversion(self.celery_task_id)
        self.status = 'cancelled'
        self.save(update_fields=['status'])


class ConversionLog(models.Model):
    """
    Stores log entries for conversion jobs.
    """
    LEVEL_CHOICES = [
        ('debug', 'Debug'),
        ('info', 'Info'),
        ('warning', 'Warning'),
        ('error', 'Error'),
    ]

    job = models.ForeignKey(
        ConversionJob,
        on_delete=models.CASCADE,
        related_name='logs'
    )
    level = models.CharField(max_length=10, choices=LEVEL_CHOICES, default='info')
    message = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'conversions_log'
        ordering = ['timestamp']
        verbose_name = 'Conversion Log'
        verbose_name_plural = 'Conversion Logs'

    def __str__(self):
        return f'[{self.level}] {self.message[:50]}'
