"""
API views for conversion jobs.
"""
import os
from django.http import FileResponse, Http404
from django.utils import timezone
from rest_framework import viewsets, status, generics
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser

from .models import ConversionJob
from .serializers import (
    ConversionJobSerializer,
    ConversionJobListSerializer,
    ConversionJobCreateSerializer,
    ConversionOptionsSerializer,
)
from .tasks import run_conversion


class ConversionJobViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing conversion jobs.
    
    Endpoints:
    - GET /api/jobs/ - List user's jobs
    - POST /api/jobs/ - Create new job (after upload)
    - GET /api/jobs/{id}/ - Get job details
    - DELETE /api/jobs/{id}/ - Cancel/delete job
    - POST /api/jobs/{id}/cancel/ - Cancel running job
    - GET /api/jobs/{id}/download/ - Download converted file
    """
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filter jobs to only show current user's jobs."""
        return ConversionJob.objects.filter(user=self.request.user)
    
    def get_serializer_class(self):
        """Use different serializers for different actions."""
        if self.action == 'list':
            return ConversionJobListSerializer
        if self.action == 'create':
            return ConversionJobCreateSerializer
        return ConversionJobSerializer

    def perform_create(self, serializer):
        """Create job and queue for processing."""
        job = serializer.save(user=self.request.user)
        # Note: File upload is handled separately via /api/upload/
        return job

    def perform_destroy(self, instance):
        """Cancel job if running, then delete."""
        if instance.status in ('pending', 'queued', 'processing'):
            instance.cancel()
        
        # Delete associated files
        if instance.original_file:
            instance.original_file.delete(save=False)
        if instance.output_file:
            instance.output_file.delete(save=False)
        
        # Update user storage
        instance.user.storage_used -= (instance.original_file_size + instance.output_file_size)
        instance.user.save(update_fields=['storage_used'])
        
        instance.delete()

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel a running or queued job."""
        job = self.get_object()
        if job.status not in ('pending', 'queued', 'processing', 'analyzing'):
            return Response(
                {'detail': 'Job cannot be cancelled in its current state.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        job.cancel()
        return Response({'detail': 'Job cancelled.'})

    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        """Download the converted file."""
        job = self.get_object()
        
        if job.status != 'completed':
            return Response(
                {'detail': 'Job is not completed yet.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not job.output_file:
            raise Http404('Output file not found.')
        
        response = FileResponse(
            job.output_file.open('rb'),
            as_attachment=True,
            filename=job.output_filename
        )
        return response


class FileUploadView(generics.CreateAPIView):
    """
    Handle file uploads for conversion jobs.
    
    POST /api/upload/
    
    Accepts multipart form data with:
    - file: The MKV file to convert
    - options: JSON object with conversion options
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def create(self, request, *args, **kwargs):
        file = request.FILES.get('file')
        
        if not file:
            return Response(
                {'detail': 'No file provided.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate file extension
        ext = os.path.splitext(file.name)[1].lower()
        if ext != '.mkv':
            return Response(
                {'detail': 'Only MKV files are supported.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check user storage limit
        file_size = file.size
        if request.user.storage_remaining < file_size:
            return Response(
                {'detail': 'Storage limit exceeded.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Parse conversion options from request
        options_data = {}
        options_serializer = ConversionJobCreateSerializer(data=request.data)
        if options_serializer.is_valid():
            options_data = options_serializer.validated_data
        
        # Create the job
        job = ConversionJob.objects.create(
            user=request.user,
            original_filename=file.name,
            original_file=file,
            original_file_size=file_size,
            status='queued',
            **options_data
        )
        
        # Update user storage
        request.user.storage_used += file_size
        request.user.save(update_fields=['storage_used'])
        
        # Queue the conversion task
        task = run_conversion.delay(str(job.id))
        job.celery_task_id = task.id
        job.save(update_fields=['celery_task_id'])
        
        return Response(
            ConversionJobSerializer(job).data,
            status=status.HTTP_201_CREATED
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def conversion_options(request):
    """
    Get available conversion options for the UI.
    
    Returns all available containers, backends, presets, etc.
    """
    options = {
        'containers': [
            {'value': 'mkv', 'label': 'MKV', 'description': 'Matroska container (recommended)'},
            {'value': 'mp4', 'label': 'MP4', 'description': 'MPEG-4 container'},
        ],
        'hw_backends': [
            {'value': 'auto', 'label': 'Auto', 'description': 'Automatically select best backend'},
            {'value': 'vaapi', 'label': 'VAAPI', 'description': 'Intel/AMD hardware acceleration'},
            {'value': 'qsv', 'label': 'QSV', 'description': 'Intel Quick Sync Video'},
            {'value': 'cpu', 'label': 'CPU', 'description': 'Software encoding (slower, best quality)'},
        ],
        'presets': [
            {'value': 'ultrafast', 'label': 'Ultra Fast', 'speed': 10, 'quality': 1},
            {'value': 'superfast', 'label': 'Super Fast', 'speed': 9, 'quality': 2},
            {'value': 'veryfast', 'label': 'Very Fast', 'speed': 8, 'quality': 3},
            {'value': 'faster', 'label': 'Faster', 'speed': 7, 'quality': 4},
            {'value': 'fast', 'label': 'Fast', 'speed': 6, 'quality': 5},
            {'value': 'medium', 'label': 'Medium', 'speed': 5, 'quality': 6},
            {'value': 'slow', 'label': 'Slow', 'speed': 4, 'quality': 7},
            {'value': 'slower', 'label': 'Slower', 'speed': 3, 'quality': 8},
            {'value': 'veryslow', 'label': 'Very Slow', 'speed': 2, 'quality': 9},
        ],
        'quality_presets': [
            {
                'value': 'fast',
                'label': 'Fast',
                'description': 'Quick conversion, good for previews',
                'settings': {'preset': 'fast', 'crf': 23}
            },
            {
                'value': 'balanced',
                'label': 'Balanced',
                'description': 'Good balance of speed and quality',
                'settings': {'preset': 'slow', 'crf': 20}
            },
            {
                'value': 'quality',
                'label': 'High Quality',
                'description': 'Best quality, slower encoding',
                'settings': {'preset': 'veryslow', 'crf': 18}
            },
        ],
        'audio_bitrates': [
            {'value': '128k', 'label': '128 kbps'},
            {'value': '192k', 'label': '192 kbps (recommended)'},
            {'value': '256k', 'label': '256 kbps'},
            {'value': '320k', 'label': '320 kbps'},
        ],
        'crf_range': {'min': 0, 'max': 51, 'default': 20},
    }
    
    serializer = ConversionOptionsSerializer(options)
    return Response(options)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_stats(request):
    """
    Get conversion statistics for the current user.
    """
    jobs = ConversionJob.objects.filter(user=request.user)
    
    stats = {
        'total_jobs': jobs.count(),
        'completed_jobs': jobs.filter(status='completed').count(),
        'failed_jobs': jobs.filter(status='failed').count(),
        'pending_jobs': jobs.filter(status__in=['pending', 'queued', 'processing']).count(),
        'storage_used': request.user.storage_used,
        'storage_limit': request.user.storage_limit,
        'storage_used_percent': request.user.storage_used_percent,
    }
    
    return Response(stats)
