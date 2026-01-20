"""
API views for conversion jobs.
"""
import os
import re
import uuid
from django.http import FileResponse, Http404, HttpResponse
from urllib.parse import quote, unquote
from django.utils import timezone
from rest_framework import viewsets, status, generics
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.views import APIView

from .models import ConversionJob, PendingFile
from .serializers import (
    ConversionJobSerializer,
    ConversionJobListSerializer,
    ConversionJobCreateSerializer,
    ConversionOptionsSerializer,
)
from .tasks import run_conversion, analyze_pending_file


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

    @action(detail=True, methods=['post'], url_path='cancel')
    def cancel(self, request, pk=None, lang=None):
        """Cancel a running or queued job.
        
        Note: 'lang' parameter is captured from URL but not used.
        It's included to avoid TypeError when called with language prefix.
        """
        job = self.get_object()
        if job.status not in ('pending', 'queued', 'processing', 'analyzing'):
            return Response(
                {'detail': 'Job cannot be cancelled in its current state.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        job.cancel()
        return Response({'detail': 'Job cancelled.'})

    @action(detail=True, methods=['get'], url_path='download')
    def download(self, request, pk=None, lang=None, filename=None):
        """Download the converted file.
        
        Returns a presigned URL for S3/MinIO files, or FileResponse for local files (legacy).
        
        Supports optional filename in URL: /download/<filename>
        If filename is provided, it's validated against the actual output filename.
        
        Note: 'lang' parameter is captured from URL but not used.
        It's included to avoid TypeError when called with language prefix.
        """
        job = self.get_object()
        
        if job.status != 'completed':
            return Response(
                {'detail': 'Job is not completed yet.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not job.output_file:
            raise Http404('Output file not found.')
        
        # Get the expected filename
        expected_filename = job.output_filename or job.original_filename.replace('.mkv', '.mp4')
        
        # If filename is provided in URL, decode it and validate
        if filename:
            try:
                # Decode URL-encoded filename
                decoded_filename = unquote(filename)
                # Basic validation: check if it matches expected filename (case-insensitive)
                # This is a security measure to prevent arbitrary file downloads
                if decoded_filename.lower() != expected_filename.lower():
                    # Allow if it's just a different extension or similar
                    # But log a warning
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.warning(f'Filename mismatch: URL={decoded_filename}, Expected={expected_filename}')
            except Exception:
                # If decoding fails, use expected filename
                pass
        
        # Check if file is on S3/MinIO (file name doesn't start with / and is not a local path)
        file_key = job.output_file.name
        is_s3_file = (
            file_key and 
            not file_key.startswith('/') and 
            not hasattr(job.output_file, 'path') or 
            not os.path.exists(getattr(job.output_file, 'path', ''))
        )
        
        # Try to check if file exists locally first (for migration support)
        try:
            local_path = job.output_file.path if hasattr(job.output_file, 'path') else None
            is_local_file = local_path and os.path.exists(local_path)
        except Exception:
            is_local_file = False
        
        if is_s3_file and not is_local_file:
            # Generate presigned URL for S3/MinIO
            from accounts.storage_service import get_storage_service
            from accounts.models import SiteSettings
            
            storage_service = get_storage_service()
            site_settings = SiteSettings.get_settings()
            expiry = site_settings.signed_url_expiry_seconds
            
            try:
                download_url = storage_service.generate_presigned_get_url(
                    key=file_key,
                    expiry=expiry
                )
                
                return Response({
                    'download_url': download_url,
                    'expires_in': expiry,
                    'filename': expected_filename,
                }, status=status.HTTP_200_OK)
            except Exception as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f'Failed to generate presigned URL: {e}')
                # Fall through to FileResponse as fallback
        elif is_local_file:
            # Legacy: Use FileResponse for local files (migration support)
            response = FileResponse(
                job.output_file.open('rb'),
                content_type='application/octet-stream',
                as_attachment=True,
                filename=expected_filename
            )
            
            # Override Content-Disposition with proper encoding for Firefox compatibility
            ascii_filename = re.sub(r'[^\x20-\x7E]', '_', expected_filename)
            encoded_filename = quote(expected_filename, safe='', encoding='utf-8')
            ascii_filename_escaped = ascii_filename.replace('"', '\\"')
            content_disposition = f'attachment; filename="{ascii_filename_escaped}"; filename*=UTF-8\'\'{encoded_filename}'
            response['Content-Disposition'] = content_disposition
            
            return response
        else:
            # File not found
            raise Http404('Output file not found.')


class PresignedUploadView(APIView):
    """
    Generate presigned PUT URL for direct file upload to S3/MinIO.
    
    POST /api/upload/presigned/
    
    Accepts:
    {
        "filename": "video.mkv",
        "size": 123456789
    }
    
    Returns:
    {
        "file_id": "uuid",
        "upload_url": "https://...",
        "key": "upload/{request_id}/video.mkv",
        "expires_in": 3600
    }
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, **kwargs):
        filename = request.data.get('filename')
        file_size = request.data.get('size')
        
        if not filename:
            return Response(
                {'detail': 'Filename is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not file_size or file_size <= 0:
            return Response(
                {'detail': 'File size is required and must be greater than 0.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate file extension
        ext = os.path.splitext(filename)[1].lower()
        if ext != '.mkv':
            return Response(
                {'detail': 'Only MKV files are supported.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check user storage limit
        if request.user.storage_remaining < file_size:
            return Response(
                {'detail': 'Storage limit exceeded.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Generate request_id (UUID)
        from conversions.models import PendingFile
        from accounts.storage_service import get_storage_service
        from accounts.models import SiteSettings
        
        request_id = uuid.uuid4()
        file_key = f'upload/{request_id}/{filename}'
        
        # Create PendingFile record
        site_settings = SiteSettings.get_settings()
        pending_file = PendingFile.objects.create(
            user=request.user,
            request_id=request_id,
            original_filename=filename,
            file_key=file_key,
            file_size=file_size,
            status='uploading',
        )
        
        # Generate presigned PUT URL
        storage_service = get_storage_service()
        expiry = site_settings.signed_url_expiry_seconds
        
        try:
            upload_url = storage_service.generate_presigned_put_url(
                key=file_key,
                expiry=expiry,
                content_type='video/x-matroska'
            )
        except Exception as e:
            pending_file.delete()
            return Response(
                {'detail': f'Failed to generate upload URL: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        return Response({
            'file_id': str(pending_file.id),
            'upload_url': upload_url,
            'key': file_key,
            'expires_in': expiry,
        }, status=status.HTTP_200_OK)


class ConfirmUploadView(APIView):
    """
    Confirm that file upload is complete and trigger analysis.
    
    POST /api/upload/{file_id}/complete/
    
    Returns:
    {
        "status": "analyzing",
        "file_id": "uuid"
    }
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, file_id, **kwargs):
        try:
            pending_file = PendingFile.objects.get(id=file_id, user=request.user)
        except PendingFile.DoesNotExist:
            return Response(
                {'detail': 'Pending file not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if pending_file.status != 'uploading':
            return Response(
                {'detail': f'File is already in status: {pending_file.status}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verify file exists in S3
        from accounts.storage_service import get_storage_service
        storage_service = get_storage_service()
        
        if not storage_service.file_exists(pending_file.file_key):
            return Response(
                {'detail': 'File not found in storage. Upload may have failed.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update status and trigger analysis
        pending_file.status = 'analyzing'
        pending_file.save(update_fields=['status'])
        
        # Queue analysis task
        analyze_pending_file.delay(str(pending_file.id))
        
        return Response({
            'status': 'analyzing',
            'file_id': str(pending_file.id),
        }, status=status.HTTP_200_OK)


class FileMetadataView(APIView):
    """
    Get extracted metadata for a pending file.
    
    GET /api/upload/{file_id}/metadata/
    
    Returns:
    {
        "status": "ready",
        "metadata": {
            "audio_tracks": [...],
            "subtitle_tracks": [...],
            "video_codec": "...",
            "duration": 123,
            ...
        }
    }
    Status 202 if analyzing, 200 if ready
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, file_id, **kwargs):
        try:
            pending_file = PendingFile.objects.get(id=file_id, user=request.user)
        except PendingFile.DoesNotExist:
            return Response(
                {'detail': 'Pending file not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if pending_file.status == 'analyzing':
            return Response({
                'status': 'analyzing',
                'message': 'File analysis in progress. Please check again in a moment.',
            }, status=status.HTTP_202_ACCEPTED)
        
        if pending_file.status == 'uploading':
            return Response({
                'status': 'uploading',
                'message': 'File upload in progress. Please wait for upload to complete.',
            }, status=status.HTTP_202_ACCEPTED)
        
        if pending_file.status != 'ready':
            return Response(
                {'detail': f'File is not ready. Current status: {pending_file.status}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return Response({
            'status': 'ready',
            'metadata': pending_file.metadata,
        }, status=status.HTTP_200_OK)


class CreateJobFromFileView(APIView):
    """
    Create a conversion job from a pending file.
    
    POST /api/jobs/create-from-file/
    
    Accepts:
    {
        "file_id": "uuid",
        "options": {
            "container": "mkv",
            "hw_backend": "auto",
            ...
        }
    }
    
    Returns:
    ConversionJob data
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, **kwargs):
        file_id = request.data.get('file_id')
        options = request.data.get('options', {})
        
        if not file_id:
            return Response(
                {'detail': 'file_id is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            pending_file = PendingFile.objects.get(id=file_id, user=request.user)
        except PendingFile.DoesNotExist:
            return Response(
                {'detail': 'Pending file not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if pending_file.status != 'ready':
            return Response(
                {'detail': f'File is not ready. Current status: {pending_file.status}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Parse options
        serializer = ConversionJobCreateSerializer(data=options)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        options_data = serializer.validated_data
        
        # Use metadata from pending_file to set audio/subtitle tracks if available
        metadata = pending_file.metadata or {}
        if 'audio_tracks' in metadata and metadata['audio_tracks']:
            # Set default audio track if not specified
            if 'audio_track' not in options_data and 'audio_lang' not in options_data:
                # Use first track or preferred language
                first_track = metadata['audio_tracks'][0]
                options_data['audio_track'] = first_track.get('index', 0)
        
        if 'subtitle_tracks' in metadata and metadata['subtitle_tracks']:
            # Set default subtitle track if not specified
            if 'subtitle_track' not in options_data and 'subtitle_lang' not in options_data:
                # Use first track or preferred language
                first_track = metadata['subtitle_tracks'][0]
                options_data['subtitle_track'] = first_track.get('index', 0)
        
        # Create conversion job
        job = ConversionJob.objects.create(
            user=request.user,
            original_filename=pending_file.original_filename,
            original_file_size=pending_file.file_size,
            pending_file=pending_file,
            status='queued',
            **options_data
        )
        
        # Mark pending_file as used
        pending_file.status = 'used'
        pending_file.save(update_fields=['status'])
        
        # Update user storage
        request.user.storage_used += pending_file.file_size
        request.user.save(update_fields=['storage_used'])
        
        # Queue conversion task
        task = run_conversion.delay(str(job.id))
        job.celery_task_id = task.id
        job.save(update_fields=['celery_task_id'])
        
        return Response(
            ConversionJobSerializer(job).data,
            status=status.HTTP_201_CREATED
        )


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
