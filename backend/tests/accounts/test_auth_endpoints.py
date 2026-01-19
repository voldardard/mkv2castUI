"""
Tests for authentication endpoints.
"""
import pytest
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def test_user(db):
    user = User.objects.create_user(
        email='test@example.com',
        username='testuser',
        password='TestPass123!',
        first_name='Test',
        last_name='User',
    )
    return user


@pytest.mark.django_db
class TestRegistration:
    """Tests for user registration endpoint."""
    
    def test_successful_registration(self, api_client):
        """Test successful user registration."""
        data = {
            'email': 'newuser@example.com',
            'username': 'newuser',
            'password': 'SecurePass123!',
            'password_confirm': 'SecurePass123!',
            'first_name': 'New',
            'last_name': 'User',
        }
        
        response = api_client.post('/api/auth/register/', data)
        
        assert response.status_code == status.HTTP_201_CREATED
        assert 'token' in response.data
        assert response.data['user']['email'] == 'newuser@example.com'
        assert User.objects.filter(email='newuser@example.com').exists()
    
    def test_registration_duplicate_email(self, api_client, test_user):
        """Test registration with existing email fails."""
        data = {
            'email': 'test@example.com',  # Already exists
            'username': 'differentuser',
            'password': 'SecurePass123!',
            'password_confirm': 'SecurePass123!',
        }
        
        response = api_client.post('/api/auth/register/', data)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'email' in response.data
    
    def test_registration_duplicate_username(self, api_client, test_user):
        """Test registration with existing username fails."""
        data = {
            'email': 'different@example.com',
            'username': 'testuser',  # Already exists
            'password': 'SecurePass123!',
            'password_confirm': 'SecurePass123!',
        }
        
        response = api_client.post('/api/auth/register/', data)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'username' in response.data
    
    def test_registration_password_mismatch(self, api_client):
        """Test registration with mismatched passwords fails."""
        data = {
            'email': 'newuser@example.com',
            'username': 'newuser',
            'password': 'SecurePass123!',
            'password_confirm': 'DifferentPass123!',
        }
        
        response = api_client.post('/api/auth/register/', data)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'password_confirm' in response.data
    
    def test_registration_weak_password(self, api_client):
        """Test registration with weak password fails."""
        data = {
            'email': 'newuser@example.com',
            'username': 'newuser',
            'password': '12345',  # Too weak
            'password_confirm': '12345',
        }
        
        response = api_client.post('/api/auth/register/', data)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'password' in response.data


@pytest.mark.django_db
class TestLogin:
    """Tests for login endpoint."""
    
    def test_successful_login(self, api_client, test_user):
        """Test successful login returns token."""
        data = {
            'email': 'test@example.com',
            'password': 'TestPass123!',
        }
        
        response = api_client.post('/api/auth/login/', data)
        
        assert response.status_code == status.HTTP_200_OK
        assert 'token' in response.data
        assert 'user' in response.data
        assert response.data['requires_2fa'] is False
    
    def test_login_wrong_password(self, api_client, test_user):
        """Test login with wrong password fails."""
        data = {
            'email': 'test@example.com',
            'password': 'WrongPassword!',
        }
        
        response = api_client.post('/api/auth/login/', data)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_login_nonexistent_user(self, api_client):
        """Test login with nonexistent email fails."""
        data = {
            'email': 'nonexistent@example.com',
            'password': 'SomePassword123!',
        }
        
        response = api_client.post('/api/auth/login/', data)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_login_locked_account(self, api_client, test_user):
        """Test login to locked account fails."""
        from django.utils import timezone
        test_user.locked_until = timezone.now() + timezone.timedelta(minutes=30)
        test_user.save()
        
        data = {
            'email': 'test@example.com',
            'password': 'TestPass123!',
        }
        
        response = api_client.post('/api/auth/login/', data)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'locked' in str(response.data).lower()


@pytest.mark.django_db
class TestLogout:
    """Tests for logout endpoint."""
    
    def test_successful_logout(self, api_client, test_user):
        """Test successful logout deletes token."""
        from rest_framework.authtoken.models import Token
        
        token, _ = Token.objects.get_or_create(user=test_user)
        api_client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
        
        response = api_client.post('/api/auth/logout/')
        
        assert response.status_code == status.HTTP_200_OK
        assert not Token.objects.filter(user=test_user).exists()
    
    def test_logout_unauthenticated(self, api_client):
        """Test logout without authentication."""
        response = api_client.post('/api/auth/logout/')
        
        # Should fail since not authenticated (DRF returns 403 for unauthenticated)
        assert response.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)


@pytest.mark.django_db
class TestPasswordChange:
    """Tests for password change endpoint."""
    
    def test_successful_password_change(self, api_client, test_user):
        """Test successful password change."""
        from rest_framework.authtoken.models import Token
        
        token, _ = Token.objects.get_or_create(user=test_user)
        api_client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
        
        data = {
            'current_password': 'TestPass123!',
            'new_password': 'NewSecurePass456!',
            'new_password_confirm': 'NewSecurePass456!',
        }
        
        response = api_client.post('/api/auth/password/change/', data)
        
        assert response.status_code == status.HTTP_200_OK
        assert 'token' in response.data  # New token issued
        
        # Verify new password works
        test_user.refresh_from_db()
        assert test_user.check_password('NewSecurePass456!')
    
    def test_password_change_wrong_current(self, api_client, test_user):
        """Test password change with wrong current password fails."""
        from rest_framework.authtoken.models import Token
        
        token, _ = Token.objects.get_or_create(user=test_user)
        api_client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
        
        data = {
            'current_password': 'WrongCurrentPass!',
            'new_password': 'NewSecurePass456!',
            'new_password_confirm': 'NewSecurePass456!',
        }
        
        response = api_client.post('/api/auth/password/change/', data)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestTwoFactorAuth:
    """Tests for 2FA endpoints."""
    
    def test_setup_2fa(self, api_client, test_user):
        """Test 2FA setup returns QR code and secret."""
        from rest_framework.authtoken.models import Token
        
        token, _ = Token.objects.get_or_create(user=test_user)
        api_client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
        
        response = api_client.post('/api/auth/2fa/setup/')
        
        assert response.status_code == status.HTTP_200_OK
        assert 'qr_code' in response.data
        assert 'secret' in response.data
        
        # Verify secret is stored (but not enabled yet)
        test_user.refresh_from_db()
        assert test_user.totp_secret is not None
        assert test_user.totp_enabled is False
    
    def test_verify_2fa_enables(self, api_client, test_user):
        """Test verifying 2FA code enables 2FA and returns backup codes."""
        import pyotp
        from rest_framework.authtoken.models import Token
        
        # Setup 2FA first
        test_user.totp_secret = pyotp.random_base32()
        test_user.save()
        
        token, _ = Token.objects.get_or_create(user=test_user)
        api_client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
        
        # Generate valid code
        totp = pyotp.TOTP(test_user.totp_secret)
        valid_code = totp.now()
        
        response = api_client.post('/api/auth/2fa/verify/', {'code': valid_code})
        
        assert response.status_code == status.HTTP_200_OK
        assert 'backup_codes' in response.data
        assert len(response.data['backup_codes']) == 10
        
        # Verify 2FA is enabled
        test_user.refresh_from_db()
        assert test_user.totp_enabled is True
    
    def test_disable_2fa(self, api_client, test_user):
        """Test disabling 2FA with password."""
        import pyotp
        from rest_framework.authtoken.models import Token
        
        # Enable 2FA first
        test_user.totp_secret = pyotp.random_base32()
        test_user.totp_enabled = True
        test_user.save()
        
        token, _ = Token.objects.get_or_create(user=test_user)
        api_client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
        
        response = api_client.post('/api/auth/2fa/disable/', {'password': 'TestPass123!'})
        
        assert response.status_code == status.HTTP_200_OK
        
        # Verify 2FA is disabled
        test_user.refresh_from_db()
        assert test_user.totp_enabled is False
        assert test_user.totp_secret is None


@pytest.mark.django_db
class TestAuthConfig:
    """Tests for auth config endpoint."""
    
    def test_auth_config_returns_settings(self, api_client, settings):
        """Test auth config returns expected settings."""
        response = api_client.get('/api/auth/config/')
        
        assert response.status_code == status.HTTP_200_OK
        assert 'require_auth' in response.data
        assert 'providers' in response.data
        assert 'site_name' in response.data
