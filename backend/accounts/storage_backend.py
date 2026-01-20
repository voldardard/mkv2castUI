"""
Custom Django storage backend that dynamically reads configuration from SiteSettings.

This allows changing S3/MinIO settings without restarting the application.
"""
from storages.backends.s3boto3 import S3Boto3Storage
from django.core.exceptions import ImproperlyConfigured
from accounts.storage_service import get_storage_service


class DynamicS3Storage(S3Boto3Storage):
    """
    S3 storage backend that reads configuration from SiteSettings at runtime.
    
    Falls back to environment variables if SiteSettings not configured.
    """
    
    def __init__(self, *args, **kwargs):
        """Initialize storage with dynamic configuration."""
        # Get configuration from SiteSettings or environment
        try:
            from accounts.models import SiteSettings
            from django.conf import settings as django_settings
            
            site_settings = SiteSettings.get_settings()
            
            # Priority: SiteSettings > Environment variables
            if site_settings.use_s3_storage and site_settings.s3_endpoint:
                # Use S3 configuration from SiteSettings
                self.access_key = site_settings.s3_access_key
                self.secret_key = site_settings.s3_secret_key
                self.bucket_name = site_settings.s3_bucket_name
                self.endpoint_url = site_settings.s3_endpoint
                self.region_name = site_settings.s3_region or 'us-east-1'
            else:
                # Fallback to MinIO local from environment
                self.access_key = getattr(django_settings, 'MINIO_ACCESS_KEY', 'minioadmin')
                self.secret_key = getattr(django_settings, 'MINIO_SECRET_KEY', 'minioadmin')
                self.bucket_name = getattr(django_settings, 'MINIO_BUCKET_NAME', 'mkv2cast')
                self.endpoint_url = getattr(django_settings, 'MINIO_ENDPOINT', 'http://minio:9000')
                self.region_name = 'us-east-1'
            
            # Set signed URL expiry from SiteSettings
            self.querystring_expire = site_settings.signed_url_expiry_seconds
            
        except Exception as e:
            # Fallback to environment variables if SiteSettings not available
            from django.conf import settings as django_settings
            self.access_key = getattr(django_settings, 'AWS_ACCESS_KEY_ID', 'minioadmin')
            self.secret_key = getattr(django_settings, 'AWS_SECRET_ACCESS_KEY', 'minioadmin')
            self.bucket_name = getattr(django_settings, 'AWS_STORAGE_BUCKET_NAME', 'mkv2cast')
            self.endpoint_url = getattr(django_settings, 'AWS_S3_ENDPOINT_URL', 'http://minio:9000')
            self.region_name = getattr(django_settings, 'AWS_S3_REGION_NAME', 'us-east-1')
            self.querystring_expire = getattr(django_settings, 'AWS_QUERYSTRING_EXPIRE', 3600)
        
        # Call parent init
        super().__init__(*args, **kwargs)
    
    @property
    def access_key(self):
        """Get access key."""
        return self._access_key
    
    @access_key.setter
    def access_key(self, value):
        """Set access key."""
        self._access_key = value
    
    @property
    def secret_key(self):
        """Get secret key."""
        return self._secret_key
    
    @secret_key.setter
    def secret_key(self, value):
        """Set secret key."""
        self._secret_key = value
    
    @property
    def bucket_name(self):
        """Get bucket name."""
        return self._bucket_name
    
    @bucket_name.setter
    def bucket_name(self, value):
        """Set bucket name."""
        self._bucket_name = value
    
    @property
    def endpoint_url(self):
        """Get endpoint URL."""
        return self._endpoint_url
    
    @endpoint_url.setter
    def endpoint_url(self, value):
        """Set endpoint URL."""
        self._endpoint_url = value
    
    @property
    def region_name(self):
        """Get region name."""
        return self._region_name
    
    @region_name.setter
    def region_name(self, value):
        """Set region name."""
        self._region_name = value
    
    def _get_security_token(self):
        """Override to use dynamic credentials."""
        return None
    
    def _get_access_key_id(self):
        """Get access key ID."""
        return self.access_key
    
    def _get_secret_access_key(self):
        """Get secret access key."""
        return self.secret_key
    
    def _get_bucket_name(self):
        """Get bucket name."""
        return self.bucket_name
    
    def url(self, name):
        """
        Generate URL for file.
        
        For S3/MinIO, we use presigned URLs instead of direct URLs.
        """
        # Use storage service to generate presigned URL
        try:
            storage_service = get_storage_service()
            expiry = self.querystring_expire
            return storage_service.generate_presigned_get_url(name, expiry=expiry)
        except Exception:
            # Fallback to parent implementation
            return super().url(name)
