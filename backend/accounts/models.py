"""
Custom user model and profile for mkv2cast.
"""
import secrets
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone


class User(AbstractUser):
    """
    Custom user model extending Django's AbstractUser.
    
    Adds additional fields for mkv2cast-specific settings and subscription management.
    """
    email = models.EmailField(unique=True)
    
    # ==========================================================================
    # Authentication Provider
    # ==========================================================================
    AUTH_PROVIDER_CHOICES = [
        ('local', 'Local'),
        ('google', 'Google'),
        ('github', 'GitHub'),
    ]
    auth_provider = models.CharField(
        max_length=20,
        choices=AUTH_PROVIDER_CHOICES,
        default='local'
    )
    
    # ==========================================================================
    # Two-Factor Authentication (2FA)
    # ==========================================================================
    totp_secret = models.CharField(max_length=64, blank=True, null=True)
    totp_enabled = models.BooleanField(default=False)
    backup_codes = models.JSONField(default=list, blank=True)
    
    # ==========================================================================
    # Security Fields
    # ==========================================================================
    failed_login_attempts = models.IntegerField(default=0)
    locked_until = models.DateTimeField(null=True, blank=True)
    last_login_ip = models.GenericIPAddressField(null=True, blank=True)
    password_changed_at = models.DateTimeField(null=True, blank=True)
    
    # ==========================================================================
    # Admin Role (separate from Django's is_staff)
    # ==========================================================================
    is_admin = models.BooleanField(default=False)
    
    # ==========================================================================
    # Subscription Tier System
    # ==========================================================================
    TIER_CHOICES = [
        ('free', 'Free'),
        ('pro', 'Pro'),
        ('enterprise', 'Enterprise'),
    ]
    subscription_tier = models.CharField(
        max_length=20,
        choices=TIER_CHOICES,
        default='free'
    )
    subscription_expires_at = models.DateTimeField(null=True, blank=True)
    
    # Tier-based limits
    max_concurrent_jobs = models.IntegerField(default=1)
    max_file_size = models.BigIntegerField(default=2 * 1024 * 1024 * 1024)  # 2GB for free
    monthly_conversion_limit = models.IntegerField(default=10)
    conversions_this_month = models.IntegerField(default=0)
    conversions_reset_date = models.DateField(null=True, blank=True)
    
    # Hardware acceleration access (enterprise feature)
    hw_acceleration_enabled = models.BooleanField(default=False)
    priority_queue = models.BooleanField(default=False)
    
    # ==========================================================================
    # User Preferences
    # ==========================================================================
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    
    preferred_language = models.CharField(
        max_length=5,
        choices=[
            ('en', 'English'),
            ('fr', 'Français'),
            ('de', 'Deutsch'),
            ('es', 'Español'),
            ('it', 'Italiano'),
        ],
        default='en'
    )
    
    # Default conversion settings
    default_container = models.CharField(
        max_length=10,
        choices=[('mkv', 'MKV'), ('mp4', 'MP4')],
        default='mkv'
    )
    default_hw_backend = models.CharField(
        max_length=10,
        choices=[
            ('auto', 'Auto'),
            ('vaapi', 'VAAPI'),
            ('qsv', 'QSV'),
            ('cpu', 'CPU'),
        ],
        default='auto'
    )
    default_quality_preset = models.CharField(
        max_length=20,
        choices=[
            ('fast', 'Fast'),
            ('balanced', 'Balanced'),
            ('quality', 'High Quality'),
        ],
        default='balanced'
    )
    
    # ==========================================================================
    # Storage Usage Tracking
    # ==========================================================================
    storage_used = models.BigIntegerField(default=0)  # bytes
    storage_limit = models.BigIntegerField(default=10 * 1024 * 1024 * 1024)  # 10GB default
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    # ==========================================================================
    # Tier Configuration (limits per tier)
    # ==========================================================================
    TIER_CONFIG = {
        'free': {
            'max_concurrent_jobs': 1,
            'max_file_size': 2 * 1024 * 1024 * 1024,  # 2GB
            'monthly_conversion_limit': 10,
            'storage_limit': 10 * 1024 * 1024 * 1024,  # 10GB
            'hw_acceleration_enabled': False,
            'priority_queue': False,
        },
        'pro': {
            'max_concurrent_jobs': 5,
            'max_file_size': 10 * 1024 * 1024 * 1024,  # 10GB
            'monthly_conversion_limit': 100,
            'storage_limit': 100 * 1024 * 1024 * 1024,  # 100GB
            'hw_acceleration_enabled': True,
            'priority_queue': False,
        },
        'enterprise': {
            'max_concurrent_jobs': 999,  # Effectively unlimited
            'max_file_size': 50 * 1024 * 1024 * 1024,  # 50GB
            'monthly_conversion_limit': 999999,  # Effectively unlimited
            'storage_limit': 1024 * 1024 * 1024 * 1024,  # 1TB
            'hw_acceleration_enabled': True,
            'priority_queue': True,
        },
    }

    class Meta:
        db_table = 'accounts_user'
        verbose_name = 'User'
        verbose_name_plural = 'Users'

    def __str__(self):
        return self.email

    # ==========================================================================
    # Security Methods
    # ==========================================================================
    
    @property
    def is_locked(self):
        """Check if account is currently locked."""
        if self.locked_until is None:
            return False
        return self.locked_until > timezone.now()
    
    def record_failed_login(self):
        """Record a failed login attempt."""
        self.failed_login_attempts += 1
        # Lock account after 10 failed attempts
        if self.failed_login_attempts >= 10:
            self.locked_until = timezone.now() + timezone.timedelta(minutes=30)
        self.save(update_fields=['failed_login_attempts', 'locked_until'])
    
    def reset_failed_attempts(self):
        """Reset failed login attempts on successful login."""
        if self.failed_login_attempts > 0 or self.locked_until:
            self.failed_login_attempts = 0
            self.locked_until = None
            self.save(update_fields=['failed_login_attempts', 'locked_until'])
    
    def generate_backup_codes(self, count=10):
        """Generate new backup codes for 2FA recovery."""
        codes = [secrets.token_hex(4).upper() for _ in range(count)]
        self.backup_codes = codes
        self.save(update_fields=['backup_codes'])
        return codes
    
    def use_backup_code(self, code):
        """Use a backup code and remove it from the list."""
        code = code.upper().replace('-', '').replace(' ', '')
        if code in self.backup_codes:
            self.backup_codes.remove(code)
            self.save(update_fields=['backup_codes'])
            return True
        return False

    # ==========================================================================
    # Storage Properties
    # ==========================================================================
    
    @property
    def storage_remaining(self):
        """Get remaining storage in bytes."""
        return max(0, self.storage_limit - self.storage_used)

    @property
    def storage_used_percent(self):
        """Get storage usage as percentage."""
        if self.storage_limit == 0:
            return 100
        return min(100, (self.storage_used / self.storage_limit) * 100)

    # ==========================================================================
    # Subscription Properties
    # ==========================================================================
    
    @property
    def is_subscription_active(self):
        """Check if user has an active paid subscription."""
        if self.subscription_tier == 'free':
            return True  # Free tier is always "active"
        if self.subscription_expires_at is None:
            return False
        return self.subscription_expires_at > timezone.now()

    @property
    def effective_tier(self):
        """Get the effective tier (falls back to free if subscription expired)."""
        if self.subscription_tier == 'free':
            return 'free'
        if self.is_subscription_active:
            return self.subscription_tier
        return 'free'

    @property
    def conversions_remaining(self):
        """Get remaining conversions for this month."""
        self._check_reset_conversions()
        return max(0, self.monthly_conversion_limit - self.conversions_this_month)

    @property
    def can_start_conversion(self):
        """Check if user can start a new conversion."""
        from conversions.models import ConversionJob
        
        # Check monthly limit
        if self.conversions_remaining <= 0:
            return False, "Monthly conversion limit reached"
        
        # Check concurrent jobs
        active_jobs = ConversionJob.objects.filter(
            user=self,
            status__in=['pending', 'queued', 'analyzing', 'processing']
        ).count()
        
        if active_jobs >= self.max_concurrent_jobs:
            return False, f"Maximum concurrent jobs ({self.max_concurrent_jobs}) reached"
        
        return True, None

    def _check_reset_conversions(self):
        """Reset monthly conversion counter if needed."""
        today = timezone.now().date()
        if self.conversions_reset_date is None or self.conversions_reset_date.month != today.month:
            self.conversions_this_month = 0
            self.conversions_reset_date = today
            self.save(update_fields=['conversions_this_month', 'conversions_reset_date'])

    def increment_conversion_count(self):
        """Increment the monthly conversion counter."""
        self._check_reset_conversions()
        self.conversions_this_month += 1
        self.save(update_fields=['conversions_this_month'])

    def apply_tier_limits(self):
        """Apply the limits from the current tier configuration."""
        config = self.TIER_CONFIG.get(self.effective_tier, self.TIER_CONFIG['free'])
        self.max_concurrent_jobs = config['max_concurrent_jobs']
        self.max_file_size = config['max_file_size']
        self.monthly_conversion_limit = config['monthly_conversion_limit']
        self.storage_limit = config['storage_limit']
        self.hw_acceleration_enabled = config['hw_acceleration_enabled']
        self.priority_queue = config['priority_queue']
        self.save()

    def upgrade_to_tier(self, tier: str, duration_days: int = 30):
        """Upgrade user to a new subscription tier."""
        if tier not in self.TIER_CONFIG:
            raise ValueError(f"Invalid tier: {tier}")
        
        self.subscription_tier = tier
        self.subscription_expires_at = timezone.now() + timezone.timedelta(days=duration_days)
        self.apply_tier_limits()
        self.save()


class SiteSettings(models.Model):
    """
    Singleton model for site-wide settings and white-label branding.
    
    Only one instance should exist, managed via get_settings() class method.
    """
    # ==========================================================================
    # Branding
    # ==========================================================================
    site_name = models.CharField(max_length=100, default='mkv2cast')
    site_tagline = models.CharField(max_length=200, default='Convert videos for Chromecast', blank=True)
    logo_url = models.URLField(blank=True)
    logo_file = models.ImageField(upload_to='branding/', blank=True, null=True)
    favicon_file = models.ImageField(upload_to='branding/', blank=True, null=True)
    primary_color = models.CharField(max_length=7, default='#6366f1')  # Hex color
    secondary_color = models.CharField(max_length=7, default='#8b5cf6')
    
    # ==========================================================================
    # Default Conversion Settings
    # ==========================================================================
    default_container = models.CharField(
        max_length=10,
        choices=[('mkv', 'MKV'), ('mp4', 'MP4')],
        default='mkv'
    )
    default_hw_backend = models.CharField(
        max_length=10,
        choices=[
            ('auto', 'Auto'),
            ('vaapi', 'VAAPI'),
            ('qsv', 'QSV'),
            ('cpu', 'CPU'),
        ],
        default='auto'
    )
    default_quality_preset = models.CharField(
        max_length=20,
        choices=[
            ('fast', 'Fast'),
            ('balanced', 'Balanced'),
            ('quality', 'High Quality'),
        ],
        default='balanced'
    )
    max_file_size = models.BigIntegerField(default=10 * 1024 * 1024 * 1024)  # 10GB
    
    # ==========================================================================
    # Server Settings
    # ==========================================================================
    maintenance_mode = models.BooleanField(default=False)
    maintenance_message = models.TextField(
        default='The service is currently under maintenance. Please try again later.',
        blank=True
    )
    allow_registration = models.BooleanField(default=True)
    require_email_verification = models.BooleanField(default=False)
    
    # ==========================================================================
    # Timestamps
    # ==========================================================================
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'accounts_site_settings'
        verbose_name = 'Site Settings'
        verbose_name_plural = 'Site Settings'
    
    def __str__(self):
        return f"Site Settings ({self.site_name})"
    
    def save(self, *args, **kwargs):
        """Ensure only one instance exists."""
        self.pk = 1
        super().save(*args, **kwargs)
    
    @classmethod
    def get_settings(cls):
        """Get or create the singleton settings instance."""
        settings, created = cls.objects.get_or_create(pk=1)
        return settings
    
    @property
    def logo(self):
        """Get the logo URL (file takes precedence over URL)."""
        if self.logo_file:
            return self.logo_file.url
        return self.logo_url or None
