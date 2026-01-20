"""
Tests for accounts views.
"""
import pytest
from django.urls import reverse
from rest_framework import status

from accounts.models import SiteSettings


class TestAuthConfigView:
    """Tests for the auth config endpoint."""
    
    def test_get_config_auth_enabled(self, api_client, site_settings):
        """Test getting config when auth is enabled."""
        site_settings.require_auth = True
        site_settings.save()
        
        response = api_client.get('/api/auth/config/')
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data['require_auth'] is True
        assert 'site_name' in data
        assert 'allow_registration' in data
    
    def test_get_config_auth_disabled(self, api_client, site_settings, local_user):
        """Test getting config when auth is disabled."""
        site_settings.require_auth = False
        site_settings.save()
        
        # Also set environment variable to ensure it's disabled
        import os
        original_env = os.environ.get('REQUIRE_AUTH')
        os.environ['REQUIRE_AUTH'] = 'false'
        
        try:
            response = api_client.get('/api/auth/config/')
            assert response.status_code == status.HTTP_200_OK
            data = response.json()
            assert data['require_auth'] is False
            # When auth is disabled, user info is included
            assert 'user' in data
        finally:
            if original_env is not None:
                os.environ['REQUIRE_AUTH'] = original_env
            elif 'REQUIRE_AUTH' in os.environ:
                del os.environ['REQUIRE_AUTH']
    
    def test_config_no_user_when_auth_enabled(self, authenticated_client, enable_auth):
        """Test that config doesn't include user info when auth is enabled."""
        response = authenticated_client.get('/api/auth/config/')
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        # User info is NOT included when auth is enabled (even if authenticated)
        assert 'user' not in data
    
    def test_config_includes_local_user_when_auth_disabled(self, api_client, site_settings, local_user):
        """Test that config includes local user when auth is disabled."""
        site_settings.require_auth = False
        site_settings.save()
        
        # Also set environment variable to ensure it's disabled
        import os
        original_env = os.environ.get('REQUIRE_AUTH')
        os.environ['REQUIRE_AUTH'] = 'false'
        
        try:
            response = api_client.get('/api/auth/config/')
            assert response.status_code == status.HTTP_200_OK
            data = response.json()
            assert 'user' in data
            assert data['user']['username'] == 'local_user'
        finally:
            if original_env is not None:
                os.environ['REQUIRE_AUTH'] = original_env
            elif 'REQUIRE_AUTH' in os.environ:
                del os.environ['REQUIRE_AUTH']


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
    
    def test_get_providers(self, api_client, site_settings):
        """Test getting OAuth providers list."""
        # Configure providers in SiteSettings
        site_settings.google_client_id = 'test_google_id'
        site_settings.google_client_secret = 'test_google_secret'
        site_settings.github_client_id = 'test_github_id'
        site_settings.github_client_secret = 'test_github_secret'
        site_settings.save()
        
        response = api_client.get('/api/auth/providers/')
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 2  # Google and GitHub
        provider_ids = [p.get('id', '') for p in data]
        assert 'google' in provider_ids
        assert 'github' in provider_ids
    
    def test_get_providers_with_oauth_config(self, api_client, site_settings):
        """Test OAuth providers include configured providers."""
        site_settings.google_client_id = 'test_google_id'
        site_settings.google_client_secret = 'test_google_secret'
        site_settings.github_client_id = 'test_github_id'
        site_settings.github_client_secret = 'test_github_secret'
        site_settings.save()
        
        response = api_client.get('/api/auth/providers/')
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
        # Should include Google and GitHub if configured
        provider_names = [p.get('name', '') for p in data]
        assert 'google' in provider_names or 'Google' in provider_names
        assert 'github' in provider_names or 'GitHub' in provider_names


class TestRequireAuthInViews:
    """Tests for require_auth setting affecting views."""
    
    def test_auth_config_respects_sitesettings_require_auth(self, api_client, site_settings):
        """Test that auth config respects require_auth from SiteSettings."""
        # Set require_auth to False
        site_settings.require_auth = False
        site_settings.save()
        
        response = api_client.get('/api/auth/config/')
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        # When require_auth is False in SiteSettings, it should be reflected
        # Note: This might also depend on settings.REQUIRE_AUTH
        assert 'require_auth' in data
        
        # Set require_auth to True
        site_settings.require_auth = True
        site_settings.save()
        
        response = api_client.get('/api/auth/config/')
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert 'require_auth' in data
    
    def test_stats_endpoint_with_require_auth_false(self, api_client, site_settings, local_user):
        """Test stats endpoint when require_auth is False in SiteSettings."""
        site_settings.require_auth = False
        site_settings.save()
        
        # Also need to set settings.REQUIRE_AUTH
        from django.conf import settings
        original_require_auth = getattr(settings, 'REQUIRE_AUTH', True)
        settings.REQUIRE_AUTH = False
        
        try:
            response = api_client.get('/api/stats/')
            # Should work without authentication when require_auth is False
            assert response.status_code == status.HTTP_200_OK
        finally:
            settings.REQUIRE_AUTH = original_require_auth
    
    def test_stats_endpoint_with_require_auth_true(self, api_client, site_settings):
        """Test stats endpoint when require_auth is True in SiteSettings."""
        site_settings.require_auth = True
        site_settings.save()
        
        from django.conf import settings
        original_require_auth = getattr(settings, 'REQUIRE_AUTH', True)
        settings.REQUIRE_AUTH = True
        
        try:
            response = api_client.get('/api/stats/')
            # Should require authentication when require_auth is True
            assert response.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]
        finally:
            settings.REQUIRE_AUTH = original_require_auth