"""
Tests for accounts models.
"""
import pytest
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile

from accounts.models import User


class TestUserModel:
    """Tests for the User model."""
    
    def test_create_user(self, db):
        """Test creating a basic user."""
        user = User.objects.create_user(
            username='newuser',
            email='new@example.com',
            password='testpass123'
        )
        assert user.username == 'newuser'
        assert user.email == 'new@example.com'
        assert user.check_password('testpass123')
        assert user.subscription_tier == 'free'
    
    def test_user_default_values(self, user):
        """Test default values for new users."""
        assert user.subscription_tier == 'free'
        assert user.max_concurrent_jobs == 1
        assert user.max_file_size == 2 * 1024 * 1024 * 1024
        assert user.monthly_conversion_limit == 10
        assert user.conversions_this_month == 0
    
    def test_subscription_tiers(self, db):
        """Test different subscription tiers."""
        for tier in ['free', 'pro', 'enterprise']:
            user = User.objects.create_user(
                username=f'{tier}_user',
                email=f'{tier}@example.com',
                password='testpass123',
                subscription_tier=tier
            )
            assert user.subscription_tier == tier
    
    def test_user_str(self, user):
        """Test user string representation."""
        assert str(user) == user.username or str(user) == user.email
    
    def test_storage_tracking(self, user):
        """Test storage usage tracking."""
        assert user.storage_used == 0
        user.storage_used = 1024 * 1024  # 1MB
        user.save()
        user.refresh_from_db()
        assert user.storage_used == 1024 * 1024
    
    def test_conversion_counter(self, user):
        """Test monthly conversion counter."""
        user.conversions_this_month = 5
        user.save()
        user.refresh_from_db()
        assert user.conversions_this_month == 5
    
    def test_pro_user_limits(self, pro_user):
        """Test pro user has higher limits."""
        assert pro_user.max_concurrent_jobs == 5
        assert pro_user.max_file_size == 10 * 1024 * 1024 * 1024
        assert pro_user.monthly_conversion_limit == 100
    
    def test_enterprise_user_limits(self, enterprise_user):
        """Test enterprise user has highest limits."""
        assert enterprise_user.max_concurrent_jobs == 999
        assert enterprise_user.max_file_size == 50 * 1024 * 1024 * 1024
        assert enterprise_user.monthly_conversion_limit == 999999
    
    def test_user_preferred_language(self, user):
        """Test user language preference."""
        user.preferred_language = 'fr'
        user.save()
        user.refresh_from_db()
        assert user.preferred_language == 'fr'
    
    def test_user_default_settings(self, user):
        """Test user default conversion settings."""
        user.default_container = 'mkv'
        user.default_hw_backend = 'vaapi'
        user.default_quality_preset = 'slow'
        user.save()
        user.refresh_from_db()
        assert user.default_container == 'mkv'
        assert user.default_hw_backend == 'vaapi'
        assert user.default_quality_preset == 'slow'
    
    def test_user_avatar_optional(self, user):
        """Test that avatar field is optional."""
        assert not user.avatar or not user.avatar.name
        user.save()
        user.refresh_from_db()
        assert not user.avatar or not user.avatar.name
    
    def test_user_avatar_upload(self, user, temp_media_dir):
        """Test uploading an avatar for a user."""
        # Create a simple image file
        image_content = b'\x89PNG\r\n\x1a\n' + b'\x00' * 100  # Minimal PNG header
        avatar_file = SimpleUploadedFile(
            'avatar.png',
            image_content,
            content_type='image/png'
        )
        user.avatar = avatar_file
        user.save()
        user.refresh_from_db()
        assert user.avatar is not None
        assert 'avatar' in str(user.avatar) or 'avatars' in str(user.avatar)
    
    def test_user_avatar_path_generation(self, user, temp_media_dir):
        """Test that avatar path is generated correctly."""
        image_content = b'\x89PNG\r\n\x1a\n' + b'\x00' * 100
        avatar_file = SimpleUploadedFile(
            'test_avatar.png',
            image_content,
            content_type='image/png'
        )
        user.avatar = avatar_file
        user.save()
        # Check that the path contains user ID and timestamp
        avatar_path = str(user.avatar)
        assert 'avatars' in avatar_path
        assert str(user.id) in avatar_path