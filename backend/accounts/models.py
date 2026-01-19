"""
Custom user model and profile for mkv2cast.
"""
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
