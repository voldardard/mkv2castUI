"""
Admin API URL patterns.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import admin_views

router = DefaultRouter()
router.register(r'users', admin_views.AdminUserViewSet, basename='admin-users')

urlpatterns = [
    # Dashboard
    path('dashboard/', admin_views.AdminDashboardView.as_view(), name='admin-dashboard'),
    path('stats/conversions/', admin_views.AdminConversionStatsView.as_view(), name='admin-conversion-stats'),
    path('monitoring/', admin_views.AdminSystemMetricsView.as_view(), name='admin-system-metrics'),
    
    # User management (via router)
    path('', include(router.urls)),
    
    # Files management
    path('files/', admin_views.AdminFilesView.as_view(), name='admin-files'),
    path('files/<uuid:job_id>/', admin_views.AdminFileDeleteView.as_view(), name='admin-file-delete'),
    
    # Task management
    path('tasks/', admin_views.AdminTasksView.as_view(), name='admin-tasks'),
    path('tasks/<uuid:job_id>/cancel/', admin_views.AdminTaskCancelView.as_view(), name='admin-task-cancel'),
    path('tasks/<uuid:job_id>/retry/', admin_views.AdminTaskRetryView.as_view(), name='admin-task-retry'),
    
    # Site settings
    path('settings/', admin_views.AdminSiteSettingsView.as_view(), name='admin-settings'),
    path('branding/', admin_views.AdminBrandingView.as_view(), name='admin-branding'),
]
