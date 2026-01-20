"""
Tests for storage backend and S3/MinIO configuration.
"""
import pytest
from unittest.mock import patch, MagicMock
from django.conf import settings

from accounts.models import SiteSettings
from accounts.storage_backend import DynamicS3Storage


class TestDynamicS3Storage:
    """Tests for DynamicS3Storage backend."""
    
    def test_storage_initialization_with_sitesettings(self, db, site_settings):
        """Test storage initialization reads from SiteSettings."""
        site_settings.use_s3_storage = True
        site_settings.s3_endpoint = 'https://s3.amazonaws.com'
        site_settings.s3_access_key = 'test_access_key'
        site_settings.s3_secret_key = 'test_secret_key'
        site_settings.s3_bucket_name = 'test-bucket'
        site_settings.s3_region = 'us-east-1'
        site_settings.signed_url_expiry_seconds = 7200
        site_settings.save()
        
        storage = DynamicS3Storage()
        
        assert storage.access_key == 'test_access_key'
        assert storage.secret_key == 'test_secret_key'
        assert storage.bucket_name == 'test-bucket'
        assert storage.endpoint_url == 'https://s3.amazonaws.com'
        assert storage.region_name == 'us-east-1'
        assert storage.querystring_expire == 7200
    
    def test_storage_fallback_to_minio(self, db, site_settings):
        """Test storage falls back to MinIO when S3 not configured."""
        site_settings.use_s3_storage = False
        site_settings.save()
        
        with patch.object(settings, 'MINIO_ACCESS_KEY', 'minioadmin'):
            with patch.object(settings, 'MINIO_SECRET_KEY', 'minioadmin'):
                with patch.object(settings, 'MINIO_BUCKET_NAME', 'mkv2cast'):
                    with patch.object(settings, 'MINIO_ENDPOINT', 'http://minio:9000'):
                        storage = DynamicS3Storage()
                        
                        assert storage.access_key == 'minioadmin'
                        assert storage.secret_key == 'minioadmin'
                        assert storage.bucket_name == 'mkv2cast'
                        assert storage.endpoint_url == 'http://minio:9000'
    
    def test_storage_fallback_to_environment(self, db):
        """Test storage falls back to MinIO defaults if SiteSettings unavailable."""
        # Delete SiteSettings to trigger fallback
        SiteSettings.objects.all().delete()
        
        # When SiteSettings is deleted, the code catches the exception and falls back
        # to environment variables with MinIO defaults if not set
        # The code uses getattr(settings, 'AWS_ACCESS_KEY_ID', 'minioadmin')
        # Since the attributes don't exist in settings, it uses MinIO defaults
        storage = DynamicS3Storage()
        
        # The fallback uses MinIO defaults when AWS_* variables are not set
        assert storage.access_key == 'minioadmin'
        assert storage.secret_key == 'minioadmin'
        assert storage.bucket_name == 'mkv2cast'
        assert storage.endpoint_url == 'http://minio:9000'
        assert storage.region_name == 'us-east-1'
        assert storage.querystring_expire == 3600
    
    def test_storage_properties(self, db, site_settings):
        """Test storage property getters and setters."""
        storage = DynamicS3Storage()
        
        storage.access_key = 'test_key'
        storage.secret_key = 'test_secret'
        storage.bucket_name = 'test_bucket'
        storage.endpoint_url = 'http://test.endpoint'
        storage.region_name = 'us-west-1'
        
        assert storage.access_key == 'test_key'
        assert storage.secret_key == 'test_secret'
        assert storage.bucket_name == 'test_bucket'
        assert storage.endpoint_url == 'http://test.endpoint'
        assert storage.region_name == 'us-west-1'
    
    @patch('accounts.storage_backend.get_storage_service')
    def test_storage_url_generation(self, mock_get_service, db, site_settings):
        """Test storage URL generation uses storage service."""
        mock_service = MagicMock()
        mock_service.generate_presigned_get_url.return_value = 'https://presigned-url.com/file'
        mock_get_service.return_value = mock_service
        
        storage = DynamicS3Storage()
        url = storage.url('test/file.mkv')
        
        assert url == 'https://presigned-url.com/file'
        mock_service.generate_presigned_get_url.assert_called_once_with(
            'test/file.mkv',
            expiry=site_settings.signed_url_expiry_seconds
        )
    
    @patch('accounts.storage_backend.get_storage_service')
    def test_storage_url_fallback(self, mock_get_service, db, site_settings):
        """Test storage URL falls back to parent implementation on error."""
        mock_get_service.side_effect = Exception("Service unavailable")
        
        storage = DynamicS3Storage()
        
        with patch.object(DynamicS3Storage.__bases__[0], 'url') as mock_parent_url:
            mock_parent_url.return_value = 'https://fallback-url.com/file'
            url = storage.url('test/file.mkv')
            
            assert url == 'https://fallback-url.com/file'
            mock_parent_url.assert_called_once_with('test/file.mkv')


class TestS3Configuration:
    """Tests for S3 configuration in SiteSettings."""
    
    def test_s3_configuration_defaults(self, site_settings):
        """Test S3 configuration default values."""
        assert site_settings.use_s3_storage is False
        assert site_settings.s3_endpoint == ''
        assert site_settings.s3_access_key == ''
        assert site_settings.s3_secret_key == ''
        assert site_settings.s3_bucket_name == ''
        assert site_settings.s3_region == 'us-east-1'
        assert site_settings.signed_url_expiry_seconds == 3600
    
    def test_minio_configuration_defaults(self, site_settings):
        """Test MinIO configuration default values."""
        assert site_settings.minio_endpoint == 'http://minio:9000'
        assert site_settings.minio_access_key == 'minioadmin'
        assert site_settings.minio_secret_key == 'minioadmin'
    
    def test_s3_custom_domain(self, site_settings):
        """Test S3 custom domain configuration."""
        site_settings.s3_custom_domain = 'https://cdn.example.com'
        site_settings.save()
        site_settings.refresh_from_db()
        
        assert site_settings.s3_custom_domain == 'https://cdn.example.com'
    
    def test_signed_url_expiry_configuration(self, site_settings):
        """Test signed URL expiry configuration."""
        site_settings.signed_url_expiry_seconds = 7200  # 2 hours
        site_settings.save()
        site_settings.refresh_from_db()
        
        assert site_settings.signed_url_expiry_seconds == 7200
