"""
Admin API views for mkv2cast.

These endpoints are protected and only accessible to users with is_admin=True.
"""
import os
import logging
from datetime import datetime, timedelta, timezone as dt_timezone
from django.contrib.auth import get_user_model
from django.db.models import Count, Sum, Avg, Q
from django.db.models.functions import TruncDate, TruncMonth
from django.utils import timezone
from rest_framework import status, viewsets, generics
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
import psutil

from .permissions import IsAdminUser
from .serializers import AdminUserSerializer, SiteSettingsSerializer
from .models import SiteSettings
from conversions.models import ConversionJob

User = get_user_model()
logger = logging.getLogger(__name__)


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


class AdminSystemMetricsView(APIView):
    """
    Expose realtime system metrics for the monitoring UI.
    """
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        now = timezone.now()
        
        try:
            # CPU stats
            cpu_per_core = psutil.cpu_percent(percpu=True)
            cpu_total = round(sum(cpu_per_core) / len(cpu_per_core), 1) if cpu_per_core else psutil.cpu_percent()
            load_avg = os.getloadavg() if hasattr(os, 'getloadavg') else (0.0, 0.0, 0.0)

            # Memory stats
            memory = psutil.virtual_memory()
            swap = psutil.swap_memory()

            # Disk stats
            disk = psutil.disk_usage('/')
            disk_io = psutil.disk_io_counters()

            # Network stats
            net_io = psutil.net_io_counters()

            # Temperatures
            temperatures = []
            try:
                temps_data = psutil.sensors_temperatures()
                for label, entries in temps_data.items():
                    for entry in entries:
                        temperatures.append({
                            'label': f"{label} {entry.label}".strip(),
                            'current': entry.current,
                        })
            except (AttributeError, RuntimeError, psutil.Error):
                temperatures = []

            # Process stats
            process_counts = {
                'total': 0,
                'running': 0,
                'sleeping': 0,
                'threads': 0,
            }
            try:
                for proc in psutil.process_iter(['status', 'num_threads']):
                    process_counts['total'] += 1
                    proc_status = proc.info.get('status')
                    if proc_status == psutil.STATUS_RUNNING:
                        process_counts['running'] += 1
                    if proc_status == psutil.STATUS_SLEEPING:
                        process_counts['sleeping'] += 1
                    process_counts['threads'] += proc.info.get('num_threads') or 0
            except psutil.Error:
                pass

            boot_time = datetime.fromtimestamp(psutil.boot_time(), tz=dt_timezone.utc)
            uptime_seconds = (now - boot_time).total_seconds()

            return Response({
                'available': True,
                'timestamp': now.isoformat(),
                'cpu': {
                    'total': cpu_total,
                    'per_core': cpu_per_core,
                    'load_1': load_avg[0],
                    'load_5': load_avg[1],
                    'load_15': load_avg[2],
                },
                'memory': {
                    'total': memory.total,
                    'used': memory.used,
                    'available': memory.available,
                    'percent': memory.percent,
                    'swap_total': swap.total,
                    'swap_used': swap.used,
                    'swap_percent': swap.percent,
                },
                'disk': {
                    'total': disk.total,
                    'used': disk.used,
                    'percent': disk.percent,
                    'read_bytes': disk_io.read_bytes if disk_io else 0,
                    'write_bytes': disk_io.write_bytes if disk_io else 0,
                    'read_count': disk_io.read_count if disk_io else 0,
                    'write_count': disk_io.write_count if disk_io else 0,
                },
                'network': {
                    'bytes_sent': net_io.bytes_sent if net_io else 0,
                    'bytes_recv': net_io.bytes_recv if net_io else 0,
                    'packets_sent': net_io.packets_sent if net_io else 0,
                    'packets_recv': net_io.packets_recv if net_io else 0,
                    'errin': net_io.errin if net_io else 0,
                    'errout': net_io.errout if net_io else 0,
                },
                'uptime_seconds': uptime_seconds,
                'temperatures': temperatures,
                'processes': process_counts,
            })
        except Exception as exc:  # pragma: no cover - safety net
            logger.exception("System metrics unavailable")
            return Response(
                {
                    'available': False,
                    'error': 'psutil présent mais accès aux métriques refusé (conteneur trop limité ?)',
                    'detail': str(exc),
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )


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
    
    @action(detail=True, methods=['post'], url_path='change_tier')
    def change_tier(self, request, pk=None, lang=None):
        """Change a user's subscription tier.
        
        Note: 'lang' parameter is captured from URL but not used.
        It's included to avoid TypeError when called with language prefix.
        """
        user = self.get_object()
        tier = request.data.get('tier')
        duration_days = int(request.data.get('duration_days', 30))
        
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
    
    @action(detail=True, methods=['post'], url_path='toggle_admin')
    def toggle_admin(self, request, pk=None, lang=None):
        """Toggle admin status for a user.
        
        Note: 'lang' parameter is captured from URL but not used.
        It's included to avoid TypeError when called with language prefix.
        """
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
    
    @action(detail=True, methods=['post'], url_path='unlock')
    def unlock(self, request, pk=None, lang=None):
        """Unlock a locked user account.
        
        Note: 'lang' parameter is captured from URL but not used.
        It's included to avoid TypeError when called with language prefix.
        """
        user = self.get_object()
        user.failed_login_attempts = 0
        user.locked_until = None
        user.save(update_fields=['failed_login_attempts', 'locked_until'])
        
        return Response({
            'message': 'User account unlocked.',
            'user': AdminUserSerializer(user).data
        })
    
    @action(detail=True, methods=['post'], url_path='disable_2fa')
    def disable_2fa(self, request, pk=None, lang=None):
        """Disable 2FA for a user (admin override).
        
        Note: 'lang' parameter is captured from URL but not used.
        It's included to avoid TypeError when called with language prefix.
        """
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
    
    @action(detail=True, methods=['post'], url_path='reset_password')
    def reset_password(self, request, pk=None, lang=None):
        """Reset password for a user (admin override).
        
        Note: 'lang' parameter is captured from URL but not used.
        It's included to avoid TypeError when called with language prefix.
        """
        user = self.get_object()
        new_password = request.data.get('new_password')
        
        if not new_password:
            return Response(
                {'detail': 'New password is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if len(new_password) < 8:
            return Response(
                {'detail': 'Password must be at least 8 characters.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user.set_password(new_password)
        user.save(update_fields=['password'])
        
        return Response({
            'message': 'Password reset successfully.',
            'user': AdminUserSerializer(user).data
        })


# =============================================================================
# Files Management
# =============================================================================

class AdminFilesView(generics.ListAPIView):
    """
    List all conversion jobs/files with admin access.
    Supports filtering by view mode: completed, in_progress, failed, all
    """
    permission_classes = [IsAuthenticated, IsAdminUser]
    
    def get_counts(self):
        """Get counts for each view mode."""
        base_qs = ConversionJob.objects.all()
        return {
            'completed': base_qs.filter(status='completed').count(),
            'in_progress': base_qs.filter(status__in=['pending', 'queued', 'analyzing', 'processing']).count(),
            'failed': base_qs.filter(status__in=['failed', 'cancelled']).count(),
            'all': base_qs.count(),
        }
    
    def get_queryset(self):
        queryset = ConversionJob.objects.select_related('user').order_by('-created_at')
        
        # Filter by view mode
        view_mode = self.request.query_params.get('view', 'completed')
        if view_mode == 'completed':
            queryset = queryset.filter(status='completed')
        elif view_mode == 'in_progress':
            queryset = queryset.filter(status__in=['pending', 'queued', 'analyzing', 'processing'])
        elif view_mode == 'failed':
            queryset = queryset.filter(status__in=['failed', 'cancelled'])
        # 'all' shows everything
        
        # Filter by user
        user_id = self.request.query_params.get('user_id', '')
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        
        # Filter by status (additional filter)
        status_filter = self.request.query_params.get('status', '')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Search by filename or user
        search = self.request.query_params.get('search', '')
        if search:
            queryset = queryset.filter(
                Q(original_filename__icontains=search) |
                Q(user__email__icontains=search) |
                Q(user__username__icontains=search)
            )
        
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
            'task_id': job.celery_task_id if job.celery_task_id else None,
            'is_orphaned': job.status in ['failed', 'cancelled'] and not job.output_file_size,
        } for job in jobs]
        
        return Response({
            'results': data,
            'total': total,
            'page': page,
            'page_size': page_size,
            'total_pages': (total + page_size - 1) // page_size,
            'counts': self.get_counts(),
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
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    
    def get(self, request):
        settings_obj = SiteSettings.get_settings()
        serializer = SiteSettingsSerializer(settings_obj)
        return Response(serializer.data)
    
    def put(self, request):
        settings_obj = SiteSettings.get_settings()
        
        # Create a copy of request.data to avoid modifying the original
        data = request.data.copy()
        
        # Remove logo_file and favicon_file from data if they're not actual files
        # (they might be string paths from JSON requests)
        if 'logo_file' in data and 'logo_file' not in request.FILES:
            data.pop('logo_file', None)
        if 'favicon_file' in data and 'favicon_file' not in request.FILES:
            data.pop('favicon_file', None)
        
        serializer = SiteSettingsSerializer(settings_obj, data=data, partial=True, context={'request': request})
        
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


# =============================================================================
# Task Management
# =============================================================================

class AdminTasksView(APIView):
    """
    List all conversion tasks with their status.
    Links tasks to jobs and shows orphaned files.
    """
    permission_classes = [IsAuthenticated, IsAdminUser]
    
    def get(self, request):
        from celery.result import AsyncResult
        from mkv2cast_api.celery import app
        
        # Get all jobs
        jobs = ConversionJob.objects.select_related('user').order_by('-created_at')
        
        # Filter by status
        status_filter = request.query_params.get('status', '')
        if status_filter == 'running':
            jobs = jobs.filter(status__in=['pending', 'queued', 'analyzing', 'processing'])
        elif status_filter == 'completed':
            jobs = jobs.filter(status='completed')
        elif status_filter == 'failed':
            jobs = jobs.filter(status__in=['failed', 'cancelled'])
        
        # Pagination
        page_size = int(request.query_params.get('page_size', 20))
        page = int(request.query_params.get('page', 1))
        
        total = jobs.count()
        start = (page - 1) * page_size
        end = start + page_size
        
        tasks = []
        for job in jobs[start:end]:
            task_info = {
                'id': str(job.id),
                'task_id': job.celery_task_id,
                'user': {
                    'id': job.user.id,
                    'email': job.user.email,
                    'username': job.user.username,
                },
                'original_filename': job.original_filename,
                'status': job.status,
                'progress': job.progress,
                'current_stage': job.current_stage,
                'started_at': job.started_at.isoformat() if job.started_at else None,
                'completed_at': job.completed_at.isoformat() if job.completed_at else None,
                'created_at': job.created_at.isoformat(),
                'error_message': job.error_message,
                'duration_ms': job.duration_ms,
                'is_orphaned': False,
            }
            
            # Check if task is orphaned (has celery_task_id but celery task is gone)
            if job.celery_task_id and job.status in ['pending', 'queued', 'analyzing', 'processing']:
                try:
                    result = AsyncResult(job.celery_task_id, app=app)
                    if result.state == 'PENDING':
                        # Task might be gone from broker
                        task_info['is_orphaned'] = True
                except Exception:
                    task_info['is_orphaned'] = True
            
            tasks.append(task_info)
        
        # Get counts
        counts = {
            'running': ConversionJob.objects.filter(status__in=['pending', 'queued', 'analyzing', 'processing']).count(),
            'completed': ConversionJob.objects.filter(status='completed').count(),
            'failed': ConversionJob.objects.filter(status__in=['failed', 'cancelled']).count(),
            'all': ConversionJob.objects.count(),
        }
        
        return Response({
            'results': tasks,
            'total': total,
            'page': page,
            'page_size': page_size,
            'total_pages': (total + page_size - 1) // page_size,
            'counts': counts,
        })


class AdminTaskCancelView(APIView):
    """
    Cancel a running task.
    """
    permission_classes = [IsAuthenticated, IsAdminUser]
    
    def post(self, request, job_id):
        try:
            job = ConversionJob.objects.get(id=job_id)
        except ConversionJob.DoesNotExist:
            return Response(
                {'detail': 'Job not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if job.status not in ['pending', 'queued', 'analyzing', 'processing']:
            return Response(
                {'detail': 'Job is not running.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Cancel celery task if exists
        if job.celery_task_id:
            try:
                from celery.result import AsyncResult
                from mkv2cast_api.celery import app
                
                result = AsyncResult(job.celery_task_id, app=app)
                result.revoke(terminate=True, signal='SIGTERM')
            except Exception as e:
                pass  # Task might already be gone
        
        # Update job status
        job.status = 'cancelled'
        job.completed_at = timezone.now()
        job.error_message = 'Cancelled by administrator'
        job.save(update_fields=['status', 'completed_at', 'error_message'])
        
        return Response({
            'message': 'Task cancelled successfully.',
            'job_id': str(job.id),
        })


class AdminTaskRetryView(APIView):
    """
    Retry a failed task.
    """
    permission_classes = [IsAuthenticated, IsAdminUser]
    
    def post(self, request, job_id):
        try:
            job = ConversionJob.objects.get(id=job_id)
        except ConversionJob.DoesNotExist:
            return Response(
                {'detail': 'Job not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if job.status not in ['failed', 'cancelled']:
            return Response(
                {'detail': 'Only failed or cancelled jobs can be retried.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Reset job status
        job.status = 'pending'
        job.progress = 0
        job.error_message = ''
        job.started_at = None
        job.completed_at = None
        job.current_stage = ''
        job.save()
        
        # Re-queue the task
        from conversions.tasks import run_conversion
        task = run_conversion.delay(str(job.id))
        
        job.celery_task_id = task.id
        job.save(update_fields=['celery_task_id'])
        
        return Response({
            'message': 'Task queued for retry.',
            'job_id': str(job.id),
            'task_id': task.id,
        })
