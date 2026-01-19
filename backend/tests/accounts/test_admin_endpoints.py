"""
Tests for admin API endpoints.
"""
import pytest
import psutil
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework.authtoken.models import Token

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def admin_user(db):
    user = User.objects.create_user(
        email='admin@example.com',
        username='adminuser',
        password='AdminPass123!',
        is_admin=True,
    )
    return user


@pytest.fixture
def regular_user(db):
    user = User.objects.create_user(
        email='regular@example.com',
        username='regularuser',
        password='RegularPass123!',
    )
    return user


@pytest.fixture
def admin_client(api_client, admin_user):
    token, _ = Token.objects.get_or_create(user=admin_user)
    api_client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
    return api_client


@pytest.fixture
def regular_client(api_client, regular_user):
    token, _ = Token.objects.get_or_create(user=regular_user)
    api_client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
    return api_client


@pytest.mark.django_db
class TestAdminDashboard:
    """Tests for admin dashboard endpoint."""
    
    def test_admin_can_access_dashboard(self, admin_client):
        """Test admin can access dashboard stats."""
        response = admin_client.get('/api/admin/dashboard/')
        
        assert response.status_code == status.HTTP_200_OK
        assert 'users' in response.data
        assert 'conversions' in response.data
        assert 'storage' in response.data
    
    def test_regular_user_cannot_access_dashboard(self, regular_client):
        """Test non-admin cannot access dashboard."""
        response = regular_client.get('/api/admin/dashboard/')
        
        assert response.status_code == status.HTTP_403_FORBIDDEN
    
    def test_unauthenticated_cannot_access_dashboard(self, api_client):
        """Test unauthenticated user cannot access dashboard."""
        response = api_client.get('/api/admin/dashboard/')
        
        # DRF returns 403 Forbidden for unauthenticated users with IsAuthenticated
        assert response.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)


@pytest.mark.django_db
class TestAdminSystemMetrics:
    """Tests for admin monitoring endpoint."""

    def test_admin_can_access_metrics(self, admin_client, monkeypatch):
        """Admin should see system metrics snapshot."""
        monkeypatch.setattr(psutil, 'cpu_percent', lambda percpu=False: [10.0, 20.0] if percpu else 15.0)
        monkeypatch.setattr(psutil, 'getloadavg', lambda: (0.1, 0.2, 0.3))

        memory = type('mem', (), {'total': 100, 'used': 50, 'available': 50, 'percent': 50})
        swap = type('swap', (), {'total': 10, 'used': 5, 'percent': 50})
        disk = type('disk', (), {'total': 200, 'used': 100, 'percent': 50})
        io_counters = type('io', (), {'read_bytes': 1, 'write_bytes': 2, 'read_count': 3, 'write_count': 4})
        net_counters = type('net', (), {'bytes_sent': 5, 'bytes_recv': 6, 'packets_sent': 7, 'packets_recv': 8, 'errin': 0, 'errout': 0})

        monkeypatch.setattr(psutil, 'virtual_memory', lambda: memory)
        monkeypatch.setattr(psutil, 'swap_memory', lambda: swap)
        monkeypatch.setattr(psutil, 'disk_usage', lambda _: disk)
        monkeypatch.setattr(psutil, 'disk_io_counters', lambda: io_counters)
        monkeypatch.setattr(psutil, 'net_io_counters', lambda: net_counters)
        monkeypatch.setattr(psutil, 'boot_time', lambda: 0)

        temperature_entry = type('temp', (), {'label': 'cpu', 'current': 42.0})
        monkeypatch.setattr(psutil, 'sensors_temperatures', lambda: {'coretemp': [temperature_entry]})

        process_entry = type('proc', (), {'info': {'status': psutil.STATUS_RUNNING, 'num_threads': 2}})
        monkeypatch.setattr(psutil, 'process_iter', lambda attrs=None: [process_entry])

        response = admin_client.get('/api/admin/monitoring/')

        assert response.status_code == status.HTTP_200_OK
        assert response.data['cpu']['per_core'] == [10.0, 20.0]
        assert response.data['disk']['write_bytes'] == 2
        assert response.data['network']['bytes_recv'] == 6
        assert response.data['temperatures'][0]['current'] == 42.0
        assert response.data['available'] is True

    def test_non_admin_is_denied(self, regular_client):
        """Non-admins cannot see system metrics."""
        response = regular_client.get('/api/admin/monitoring/')
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_backend_failure_returns_503(self, admin_client, monkeypatch):
        """If psutil fails hard, we surface a 503 with available=false."""
        def crash(*args, **kwargs):
            raise RuntimeError("boom")

        monkeypatch.setattr('accounts.admin_views.psutil.cpu_percent', crash)

        response = admin_client.get('/api/admin/monitoring/')

        assert response.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
        assert response.data['available'] is False
        assert 'métriques' in response.data['error']
        assert response.data.get('detail') == 'boom'


@pytest.mark.django_db
class TestAdminUserManagement:
    """Tests for admin user management endpoints."""
    
    def test_admin_can_list_users(self, admin_client, regular_user):
        """Test admin can list all users."""
        response = admin_client.get('/api/admin/users/')
        
        assert response.status_code == status.HTTP_200_OK
        # Should include both admin and regular user
        emails = [u['email'] for u in response.data['results']] if 'results' in response.data else [u['email'] for u in response.data]
        assert 'regular@example.com' in emails
    
    def test_admin_can_search_users(self, admin_client, regular_user):
        """Test admin can search users by email."""
        response = admin_client.get('/api/admin/users/?search=regular')
        
        assert response.status_code == status.HTTP_200_OK
    
    def test_admin_can_filter_by_tier(self, admin_client, regular_user):
        """Test admin can filter users by tier."""
        response = admin_client.get('/api/admin/users/?tier=free')
        
        assert response.status_code == status.HTTP_200_OK
    
    def test_admin_can_change_user_tier(self, admin_client, regular_user):
        """Test admin can change user tier."""
        response = admin_client.post(
            f'/api/admin/users/{regular_user.id}/change_tier/',
            {'tier': 'pro', 'duration_days': 30}
        )
        
        assert response.status_code == status.HTTP_200_OK
        
        regular_user.refresh_from_db()
        assert regular_user.subscription_tier == 'pro'
    
    def test_admin_can_toggle_admin_status(self, admin_client, regular_user):
        """Test admin can toggle admin status for another user."""
        assert regular_user.is_admin is False
        
        response = admin_client.post(f'/api/admin/users/{regular_user.id}/toggle_admin/')
        
        assert response.status_code == status.HTTP_200_OK
        
        regular_user.refresh_from_db()
        assert regular_user.is_admin is True
    
    def test_admin_cannot_toggle_own_admin(self, admin_client, admin_user):
        """Test admin cannot remove their own admin status."""
        response = admin_client.post(f'/api/admin/users/{admin_user.id}/toggle_admin/')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_admin_can_unlock_user(self, admin_client, regular_user):
        """Test admin can unlock a locked user."""
        from django.utils import timezone
        
        regular_user.locked_until = timezone.now() + timezone.timedelta(minutes=30)
        regular_user.failed_login_attempts = 10
        regular_user.save()
        
        response = admin_client.post(f'/api/admin/users/{regular_user.id}/unlock/')
        
        assert response.status_code == status.HTTP_200_OK
        
        regular_user.refresh_from_db()
        assert regular_user.locked_until is None
        assert regular_user.failed_login_attempts == 0
    
    def test_admin_can_delete_user(self, admin_client, regular_user):
        """Test admin can delete a user."""
        user_id = regular_user.id
        
        response = admin_client.delete(f'/api/admin/users/{user_id}/')
        
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not User.objects.filter(id=user_id).exists()
    
    def test_regular_user_cannot_manage_users(self, regular_client, admin_user):
        """Test non-admin cannot access user management."""
        response = regular_client.get('/api/admin/users/')
        
        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestAdminSiteSettings:
    """Tests for admin site settings endpoints."""
    
    def test_admin_can_get_settings(self, admin_client):
        """Test admin can retrieve site settings."""
        response = admin_client.get('/api/admin/settings/')
        
        assert response.status_code == status.HTTP_200_OK
        assert 'site_name' in response.data
        assert 'maintenance_mode' in response.data
    
    def test_admin_can_update_settings(self, admin_client):
        """Test admin can update site settings."""
        response = admin_client.put('/api/admin/settings/', {
            'site_name': 'Test Site',
            'maintenance_mode': False,
        })
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['site_name'] == 'Test Site'
    
    def test_regular_user_cannot_access_settings(self, regular_client):
        """Test non-admin cannot access site settings."""
        response = regular_client.get('/api/admin/settings/')
        
        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestAdminBranding:
    """Tests for admin branding endpoints."""
    
    def test_admin_can_get_branding(self, admin_client):
        """Test admin can retrieve branding settings."""
        response = admin_client.get('/api/admin/branding/')
        
        assert response.status_code == status.HTTP_200_OK
        assert 'site_name' in response.data
        assert 'primary_color' in response.data
    
    def test_admin_can_update_branding(self, admin_client):
        """Test admin can update branding settings."""
        response = admin_client.put('/api/admin/branding/', {
            'site_name': 'Custom Brand',
            'primary_color': '#ff0000',
            'secondary_color': '#00ff00',
        })
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['primary_color'] == '#ff0000'


@pytest.mark.django_db
class TestAdminPermissions:
    """Tests for admin permission class."""
    
    def test_superuser_has_admin_access(self, api_client, db):
        """Test superuser has admin access even without is_admin flag."""
        superuser = User.objects.create_superuser(
            email='super@example.com',
            username='superuser',
            password='SuperPass123!',
        )
        
        token, _ = Token.objects.get_or_create(user=superuser)
        api_client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
        
        response = api_client.get('/api/admin/dashboard/')
        
        assert response.status_code == status.HTTP_200_OK
