"""
Admin configuration for accounts.
"""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth import get_user_model

User = get_user_model()


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """
    Custom admin for User model.
    """
    list_display = [
        'email',
        'username',
        'preferred_language',
        'storage_used_display',
        'is_active',
        'created_at',
    ]
    list_filter = ['is_active', 'preferred_language', 'default_hw_backend']
    search_fields = ['email', 'username', 'first_name', 'last_name']
    ordering = ['-created_at']

    fieldsets = BaseUserAdmin.fieldsets + (
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
