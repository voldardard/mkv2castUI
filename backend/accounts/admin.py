"""
Admin configuration for accounts.
"""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth import get_user_model

from .models import SiteSettings

User = get_user_model()


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """
    Custom admin for User model.
    """
    list_display = [
        'email',
        'username',
        'subscription_tier',
        'auth_provider',
        'is_admin',
        'totp_enabled',
        'is_active',
        'created_at',
    ]
    list_filter = [
        'is_active',
        'is_admin',
        'subscription_tier',
        'auth_provider',
        'totp_enabled',
        'preferred_language',
    ]
    search_fields = ['email', 'username', 'first_name', 'last_name']
    ordering = ['-created_at']

    fieldsets = BaseUserAdmin.fieldsets + (
        ('Authentication', {
            'fields': (
                'auth_provider',
                'is_admin',
            )
        }),
        ('Two-Factor Authentication', {
            'fields': (
                'totp_enabled',
                'totp_secret',
            )
        }),
        ('Security', {
            'fields': (
                'failed_login_attempts',
                'locked_until',
                'last_login_ip',
                'password_changed_at',
            )
        }),
        ('Subscription', {
            'fields': (
                'subscription_tier',
                'subscription_expires_at',
                'max_concurrent_jobs',
                'max_file_size',
                'monthly_conversion_limit',
                'conversions_this_month',
            )
        }),
        ('mkv2cast Settings', {
            'fields': (
                'preferred_language',
                'default_container',
                'default_hw_backend',
                'default_quality_preset',
            )
        }),
        ('Storage', {
            'fields': ('storage_used', 'storage_limit'),
        }),
    )

    def storage_used_display(self, obj):
        """Display storage usage in human-readable format."""
        used_gb = obj.storage_used / (1024 ** 3)
        limit_gb = obj.storage_limit / (1024 ** 3)
        return f'{used_gb:.2f} / {limit_gb:.2f} GB'
    storage_used_display.short_description = 'Storage'


@admin.register(SiteSettings)
class SiteSettingsAdmin(admin.ModelAdmin):
    """
    Admin for SiteSettings model.
    """
    list_display = ['site_name', 'maintenance_mode', 'allow_registration', 'updated_at']
    
    fieldsets = (
        ('Branding', {
            'fields': (
                'site_name',
                'site_tagline',
                'logo_url',
                'logo_file',
                'favicon_file',
                'primary_color',
                'secondary_color',
            )
        }),
        ('Conversion Defaults', {
            'fields': (
                'default_container',
                'default_hw_backend',
                'default_quality_preset',
                'max_file_size',
            )
        }),
        ('Server Settings', {
            'fields': (
                'maintenance_mode',
                'maintenance_message',
                'allow_registration',
                'require_email_verification',
            )
        }),
    )
    
    def has_add_permission(self, request):
        # Prevent adding multiple instances
        return not SiteSettings.objects.exists()
    
    def has_delete_permission(self, request, obj=None):
        # Prevent deletion
        return False
