"""
Tests for accounts views.
"""
import pytest
from django.urls import reverse
from rest_framework import status


class TestAuthConfigView:
    """Tests for the auth config endpoint."""
    
    def test_get_config_auth_enabled(self, api_client, enable_auth):
        """Test getting config when auth is enabled."""
        response = api_client.get('/api/auth/config/')
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data['require_auth'] is True
        assert 'providers' in data
        assert 'google' in data['providers']
    
    def test_get_config_auth_disabled(self, api_client, disable_auth, local_user):
        """Test getting config when auth is disabled."""
        response = api_client.get('/api/auth/config/')
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data['require_auth'] is False
        # When auth is disabled, user info is included
        assert 'user' in data
    
    def test_config_no_user_when_auth_enabled(self, authenticated_client, enable_auth):
        """Test that config doesn't include user info when auth is enabled."""
        response = authenticated_client.get('/api/auth/config/')
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        # User info is NOT included when auth is enabled (even if authenticated)
        assert 'user' not in data
    
    def test_config_includes_local_user_when_auth_disabled(self, api_client, disable_auth, local_user):
        """Test that config includes local user when auth is disabled."""
        response = api_client.get('/api/auth/config/')
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert 'user' in data
        assert data['user']['username'] == 'local_user'


class TestUserStatsView:
    """Tests for user statistics endpoint."""
    
    def test_get_stats_authenticated(self, authenticated_client):
        """Test getting user stats when authenticated."""
        # Stats endpoint is at /api/stats/ (not /en/api/stats/)
        response = authenticated_client.get('/api/stats/')
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert 'storage_used' in data
        assert 'storage_limit' in data
        assert 'total_jobs' in data
    
    def test_get_stats_unauthenticated_auth_required(self, api_client, enable_auth):
        """Test stats endpoint requires auth when enabled."""
        response = api_client.get('/api/stats/')
        # Should return 401/403
        assert response.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]
    
    def test_get_stats_unauthenticated_auth_disabled(self, api_client, disable_auth, local_user):
        """Test stats endpoint works when auth is disabled."""
        response = api_client.get('/api/stats/')
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert 'total_jobs' in data


class TestCurrentUserView:
    """Tests for current user endpoint."""
    
    def test_get_current_user_authenticated(self, authenticated_client, user):
        """Test getting current user info when authenticated."""
        response = authenticated_client.get('/api/auth/me/')
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data['email'] == user.email
    
    def test_get_current_user_unauthenticated(self, api_client, enable_auth):
        """Test current user endpoint requires auth."""
        response = api_client.get('/api/auth/me/')
        assert response.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]


class TestOAuthProvidersView:
    """Tests for OAuth providers endpoint."""
    
    def test_get_providers(self, api_client):
        """Test getting OAuth providers list."""
        response = api_client.get('/api/auth/providers/')
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 2  # Google and GitHub
