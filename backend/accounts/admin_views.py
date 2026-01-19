"""
Admin API views for mkv2cast.

These endpoints are protected and only accessible to users with is_admin=True.
"""
from datetime import timedelta
from django.contrib.auth import get_user_model
from django.db.models import Count, Sum, Avg, Q
from django.db.models.functions import TruncDate, TruncMonth
from django.utils import timezone
from rest_framework import status, viewsets, generics
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser

from .permissions import IsAdminUser
from .serializers import AdminUserSerializer, SiteSettingsSerializer
from .models import SiteSettings
from conversions.models import ConversionJob

User = get_user_model()


# =============================================================================
# Dashboard Statistics
# =============================================================================

class AdminDashboardView(APIView):
    """
    Get dashboard overview statistics.
    """
    permission_classes = [IsAuthenticated, IsAdminUser]
    
    def get(self, request):
        now = timezone.now()
        thirty_days_ago = now - timedelta(days=30)
        seven_days_ago = now - timedelta(days=7)
        
        # User statistics
        total_users = User.objects.count()
        new_users_7d = User.objects.filter(created_at__gte=seven_days_ago).count()
        new_users_30d = User.objects.filter(created_at__gte=thirty_days_ago).count()
        
        # User tier breakdown
        tier_breakdown = User.objects.values('subscription_tier').annotate(
            count=Count('id')
        )
        
        # Conversion statistics
        total_conversions = ConversionJob.objects.count()
        conversions_7d = ConversionJob.objects.filter(created_at__gte=seven_days_ago).count()
        conversions_30d = ConversionJob.objects.filter(created_at__gte=thirty_days_ago).count()
        
        # Active conversions
        active_conversions = ConversionJob.objects.filter(
            status__in=['pending', 'queued', 'analyzing', 'processing']
        ).count()
        
        # Conversion status breakdown
        status_breakdown = ConversionJob.objects.values('status').annotate(
            count=Count('id')
        )
        
        # Success rate (last 30 days)
        completed_30d = ConversionJob.objects.filter(
            created_at__gte=thirty_days_ago,
            status='completed'
        ).count()
        failed_30d = ConversionJob.objects.filter(
            created_at__gte=thirty_days_ago,
            status='failed'
        ).count()
        
        success_rate = 0
        if completed_30d + failed_30d > 0:
            success_rate = round((completed_30d / (completed_30d + failed_30d)) * 100, 1)
        
        # Storage statistics
        total_storage = User.objects.aggregate(
            total_used=Sum('storage_used'),
            total_limit=Sum('storage_limit')
        )
        
        # Files statistics
        total_original_size = ConversionJob.objects.aggregate(
            total=Sum('original_file_size')
        )['total'] or 0
        
        total_output_size = ConversionJob.objects.aggregate(
            total=Sum('output_file_size')
        )['total'] or 0
        
        return Response({
            'users': {
                'total': total_users,
                'new_7d': new_users_7d,
                'new_30d': new_users_30d,
                'tier_breakdown': {item['subscription_tier']: item['count'] for item in tier_breakdown},
            },
            'conversions': {
                'total': total_conversions,
                'last_7d': conversions_7d,
                'last_30d': conversions_30d,
                'active': active_conversions,
                'success_rate_30d': success_rate,
                'status_breakdown': {item['status']: item['count'] for item in status_breakdown},
            },
            'storage': {
                'total_used': total_storage['total_used'] or 0,
                'total_limit': total_storage['total_limit'] or 0,
                'original_files_size': total_original_size,
                'output_files_size': total_output_size,
            },
        })


class AdminConversionStatsView(APIView):
    """
    Get detailed conversion statistics with charts data.
    """
    permission_classes = [IsAuthenticated, IsAdminUser]
    
    def get(self, request):
        days = int(request.query_params.get('days', 30))
        start_date = timezone.now() - timedelta(days=days)
        
        # Daily conversions
        daily_stats = ConversionJob.objects.filter(
            created_at__gte=start_date
        ).annotate(
            date=TruncDate('created_at')
        ).values('date').annotate(
            total=Count('id'),
            completed=Count('id', filter=Q(status='completed')),
            failed=Count('id', filter=Q(status='failed')),
        ).order_by('date')
        
        # Hardware backend usage
        hw_backend_stats = ConversionJob.objects.filter(
            created_at__gte=start_date
        ).values('hw_backend').annotate(
            count=Count('id')
        )
        
        # Container format usage
        container_stats = ConversionJob.objects.filter(
            created_at__gte=start_date
        ).values('container').annotate(
            count=Count('id')
        )
        
        # Average processing time (completed jobs)
        avg_duration = ConversionJob.objects.filter(
            created_at__gte=start_date,
            status='completed',
            started_at__isnull=False,
            completed_at__isnull=False
        ).aggregate(
            avg_seconds=Avg(
                (timezone.now() - timezone.now())  # Placeholder for F expression
            )
        )
        
        return Response({
            'daily': list(daily_stats),
            'hw_backend': {item['hw_backend']: item['count'] for item in hw_backend_stats},
            'container': {item['container']: item['count'] for item in container_stats},
        })


# =============================================================================
# User Management
# =============================================================================

class AdminUserViewSet(viewsets.ModelViewSet):
    """
    ViewSet for admin user management.
    """
    queryset = User.objects.all().order_by('-created_at')
    serializer_class = AdminUserSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Search
        search = self.request.query_params.get('search', '')
        if search:
            queryset = queryset.filter(
                Q(email__icontains=search) |
                Q(username__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search)
            )
        
        # Filter by tier
        tier = self.request.query_params.get('tier', '')
        if tier:
            queryset = queryset.filter(subscription_tier=tier)
        
        # Filter by status
        is_active = self.request.query_params.get('is_active', '')
        if is_active:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        # Filter by admin
        is_admin = self.request.query_params.get('is_admin', '')
        if is_admin:
            queryset = queryset.filter(is_admin=is_admin.lower() == 'true')
        
        return queryset
    
    @action(detail=True, methods=['post'])
    def change_tier(self, request, pk=None):
        """Change a user's subscription tier."""
        user = self.get_object()
        tier = request.data.get('tier')
        duration_days = request.data.get('duration_days', 30)
        
        if tier not in ['free', 'pro', 'enterprise']:
            return Response(
                {'detail': 'Invalid tier.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if tier == 'free':
            user.subscription_tier = 'free'
            user.subscription_expires_at = None
        else:
            user.upgrade_to_tier(tier, duration_days)
        
        user.apply_tier_limits()
        
        return Response({
            'message': f'User tier changed to {tier}.',
            'user': AdminUserSerializer(user).data
        })
    
    @action(detail=True, methods=['post'])
    def toggle_admin(self, request, pk=None):
        """Toggle admin status for a user."""
        user = self.get_object()
        
        # Prevent self-demotion
        if user == request.user:
            return Response(
                {'detail': 'Cannot modify your own admin status.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user.is_admin = not user.is_admin
        user.save(update_fields=['is_admin'])
        
        return Response({
            'message': f'Admin status {"enabled" if user.is_admin else "disabled"}.',
            'user': AdminUserSerializer(user).data
        })
    
    @action(detail=True, methods=['post'])
    def unlock(self, request, pk=None):
        """Unlock a locked user account."""
        user = self.get_object()
        user.failed_login_attempts = 0
        user.locked_until = None
        user.save(update_fields=['failed_login_attempts', 'locked_until'])
        
        return Response({
            'message': 'User account unlocked.',
            'user': AdminUserSerializer(user).data
        })
    
    @action(detail=True, methods=['post'])
    def disable_2fa(self, request, pk=None):
        """Disable 2FA for a user (admin override)."""
        user = self.get_object()
        
        if not user.totp_enabled:
            return Response(
                {'detail': '2FA is not enabled for this user.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user.totp_secret = None
        user.totp_enabled = False
        user.backup_codes = []
        user.save(update_fields=['totp_secret', 'totp_enabled', 'backup_codes'])
        
        return Response({
            'message': '2FA disabled for user.',
            'user': AdminUserSerializer(user).data
        })


# =============================================================================
# Files Management
# =============================================================================

class AdminFilesView(generics.ListAPIView):
    """
    List all conversion jobs/files with admin access.
    """
    permission_classes = [IsAuthenticated, IsAdminUser]
    
    def get_queryset(self):
        queryset = ConversionJob.objects.select_related('user').order_by('-created_at')
        
        # Filter by user
        user_id = self.request.query_params.get('user_id', '')
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        
        # Filter by status
        status_filter = self.request.query_params.get('status', '')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Search by filename
        search = self.request.query_params.get('search', '')
        if search:
            queryset = queryset.filter(original_filename__icontains=search)
        
        return queryset
    
    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        
        # Pagination
        page_size = int(request.query_params.get('page_size', 20))
        page = int(request.query_params.get('page', 1))
        
        total = queryset.count()
        start = (page - 1) * page_size
        end = start + page_size
        
        jobs = queryset[start:end]
        
        data = [{
            'id': str(job.id),
            'user': {
                'id': job.user.id,
                'email': job.user.email,
                'username': job.user.username,
            },
            'original_filename': job.original_filename,
            'original_file_size': job.original_file_size,
            'output_file_size': job.output_file_size,
            'status': job.status,
            'container': job.container,
            'hw_backend': job.hw_backend,
            'progress': job.progress,
            'created_at': job.created_at.isoformat(),
            'completed_at': job.completed_at.isoformat() if job.completed_at else None,
        } for job in jobs]
        
        return Response({
            'results': data,
            'total': total,
            'page': page,
            'page_size': page_size,
            'total_pages': (total + page_size - 1) // page_size,
        })


class AdminFileDeleteView(APIView):
    """
    Delete a specific conversion job/file.
    """
    permission_classes = [IsAuthenticated, IsAdminUser]
    
    def delete(self, request, job_id):
        try:
            job = ConversionJob.objects.get(id=job_id)
        except ConversionJob.DoesNotExist:
            return Response(
                {'detail': 'Job not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Delete associated files
        if job.original_file:
            job.original_file.delete(save=False)
        if job.output_file:
            job.output_file.delete(save=False)
        
        # Update user storage
        total_size = job.original_file_size + job.output_file_size
        job.user.storage_used = max(0, job.user.storage_used - total_size)
        job.user.save(update_fields=['storage_used'])
        
        job.delete()
        
        return Response({
            'message': 'Job and files deleted successfully.'
        }, status=status.HTTP_200_OK)


# =============================================================================
# Site Settings Management
# =============================================================================

class AdminSiteSettingsView(APIView):
    """
    Get or update site settings.
    """
    permission_classes = [IsAuthenticated, IsAdminUser]
    parser_classes = [MultiPartParser, FormParser]
    
    def get(self, request):
        settings_obj = SiteSettings.get_settings()
        serializer = SiteSettingsSerializer(settings_obj)
        return Response(serializer.data)
    
    def put(self, request):
        settings_obj = SiteSettings.get_settings()
        serializer = SiteSettingsSerializer(settings_obj, data=request.data, partial=True)
        
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def patch(self, request):
        return self.put(request)


class AdminBrandingView(APIView):
    """
    Manage site branding (logo, colors).
    """
    permission_classes = [IsAuthenticated, IsAdminUser]
    parser_classes = [MultiPartParser, FormParser]
    
    def get(self, request):
        settings_obj = SiteSettings.get_settings()
        return Response({
            'site_name': settings_obj.site_name,
            'site_tagline': settings_obj.site_tagline,
            'logo': settings_obj.logo,
            'logo_url': settings_obj.logo_url,
            'primary_color': settings_obj.primary_color,
            'secondary_color': settings_obj.secondary_color,
        })
    
    def put(self, request):
        settings_obj = SiteSettings.get_settings()
        
        # Update fields
        if 'site_name' in request.data:
            settings_obj.site_name = request.data['site_name']
        if 'site_tagline' in request.data:
            settings_obj.site_tagline = request.data['site_tagline']
        if 'logo_url' in request.data:
            settings_obj.logo_url = request.data['logo_url']
        if 'logo_file' in request.FILES:
            settings_obj.logo_file = request.FILES['logo_file']
        if 'favicon_file' in request.FILES:
            settings_obj.favicon_file = request.FILES['favicon_file']
        if 'primary_color' in request.data:
            settings_obj.primary_color = request.data['primary_color']
        if 'secondary_color' in request.data:
            settings_obj.secondary_color = request.data['secondary_color']
        
        settings_obj.save()
        
        return Response({
            'message': 'Branding updated successfully.',
            'site_name': settings_obj.site_name,
            'site_tagline': settings_obj.site_tagline,
            'logo': settings_obj.logo,
            'primary_color': settings_obj.primary_color,
            'secondary_color': settings_obj.secondary_color,
        })
