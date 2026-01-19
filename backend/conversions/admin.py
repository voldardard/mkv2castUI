"""
Admin configuration for conversions.
"""
from django.contrib import admin
from .models import ConversionJob, ConversionLog


class ConversionLogInline(admin.TabularInline):
    """Inline display of conversion logs."""
    model = ConversionLog
    extra = 0
    readonly_fields = ['level', 'message', 'timestamp']
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(ConversionJob)
class ConversionJobAdmin(admin.ModelAdmin):
    """Admin for ConversionJob model."""
    
    list_display = [
        'id',
        'user',
        'original_filename',
        'status',
        'progress',
        'hw_backend',
        'created_at',
        'completed_at',
    ]
    list_filter = ['status', 'hw_backend', 'container', 'created_at']
    search_fields = ['original_filename', 'user__email', 'user__username']
    readonly_fields = [
        'id',
        'original_file_size',
        'output_file_size',
        'progress',
        'current_stage',
        'needs_video_transcode',
        'needs_audio_transcode',
        'video_codec',
        'audio_codec',
        'video_reason',
        'duration_ms',
        'created_at',
        'started_at',
        'completed_at',
        'celery_task_id',
    ]
    ordering = ['-created_at']
    inlines = [ConversionLogInline]

    fieldsets = (
        ('Job Info', {
            'fields': ('id', 'user', 'status', 'progress', 'current_stage')
        }),
        ('Files', {
            'fields': (
                'original_filename',
                'original_file',
                'original_file_size',
                'output_file',
                'output_file_size',
            )
        }),
        ('Conversion Options', {
            'fields': (
                'container',
                'hw_backend',
                'crf',
                'preset',
                'audio_bitrate',
                'force_h264',
                'allow_hevc',
                'force_aac',
                'keep_surround',
                'integrity_check',
                'deep_check',
            )
        }),
        ('Analysis Results', {
            'fields': (
                'needs_video_transcode',
                'needs_audio_transcode',
                'video_codec',
                'audio_codec',
                'video_reason',
                'duration_ms',
            ),
            'classes': ('collapse',),
        }),
        ('Timing', {
            'fields': (
                'created_at',
                'started_at',
                'completed_at',
                'celery_task_id',
            )
        }),
        ('Error', {
            'fields': ('error_message',),
            'classes': ('collapse',),
        }),
    )

    def has_add_permission(self, request):
        return False


@admin.register(ConversionLog)
class ConversionLogAdmin(admin.ModelAdmin):
    """Admin for ConversionLog model."""
    
    list_display = ['job', 'level', 'message_preview', 'timestamp']
    list_filter = ['level', 'timestamp']
    search_fields = ['message', 'job__original_filename']
    readonly_fields = ['job', 'level', 'message', 'timestamp']
    ordering = ['-timestamp']

    def message_preview(self, obj):
        return obj.message[:100] + '...' if len(obj.message) > 100 else obj.message
    message_preview.short_description = 'Message'

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
