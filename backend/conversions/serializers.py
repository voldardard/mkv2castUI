"""
Serializers for conversion jobs.
"""
from rest_framework import serializers
from .models import ConversionJob, ConversionLog


class ConversionLogSerializer(serializers.ModelSerializer):
    """Serializer for conversion log entries."""
    
    class Meta:
        model = ConversionLog
        fields = ['level', 'message', 'timestamp']
        read_only_fields = ['level', 'message', 'timestamp']


class ConversionJobCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating new conversion jobs.
    
    Only includes the options that can be set by the user.
    """
    
    class Meta:
        model = ConversionJob
        fields = [
            # Output settings
            'container',
            # Hardware acceleration
            'hw_backend',
            'vaapi_qp',
            'qsv_quality',
            # Encoding quality
            'crf',
            'preset',
            'audio_bitrate',
            # Codec decisions
            'force_h264',
            'allow_hevc',
            'force_aac',
            'keep_surround',
            # Integrity checks
            'integrity_check',
            'deep_check',
        ]

    def validate_crf(self, value):
        """Validate CRF is within acceptable range."""
        if not 0 <= value <= 51:
            raise serializers.ValidationError('CRF must be between 0 and 51')
        return value

    def validate_vaapi_qp(self, value):
        """Validate VAAPI QP is within acceptable range."""
        if not 0 <= value <= 51:
            raise serializers.ValidationError('VAAPI QP must be between 0 and 51')
        return value


class ConversionJobSerializer(serializers.ModelSerializer):
    """
    Full serializer for conversion jobs (read operations).
    """
    output_filename = serializers.ReadOnlyField()
    eta_seconds = serializers.ReadOnlyField()
    logs = ConversionLogSerializer(many=True, read_only=True)
    
    class Meta:
        model = ConversionJob
        fields = [
            'id',
            'original_filename',
            'original_file_size',
            'output_file_size',
            'output_filename',
            'status',
            'progress',
            'current_stage',
            # Options
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
            # Analysis
            'needs_video_transcode',
            'needs_audio_transcode',
            'video_codec',
            'audio_codec',
            'video_reason',
            'duration_ms',
            # Timing
            'created_at',
            'started_at',
            'completed_at',
            'eta_seconds',
            'error_message',
            'logs',
        ]
        read_only_fields = fields


class ConversionJobListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for listing jobs.
    """
    output_filename = serializers.ReadOnlyField()
    
    class Meta:
        model = ConversionJob
        fields = [
            'id',
            'original_filename',
            'original_file_size',
            'output_filename',
            'output_file_size',
            'status',
            'progress',
            'current_stage',
            'created_at',
            'completed_at',
        ]
        read_only_fields = fields


class ConversionOptionsSerializer(serializers.Serializer):
    """
    Serializer for returning available conversion options.
    """
    containers = serializers.ListField(child=serializers.DictField())
    hw_backends = serializers.ListField(child=serializers.DictField())
    presets = serializers.ListField(child=serializers.DictField())
    quality_presets = serializers.ListField(child=serializers.DictField())
