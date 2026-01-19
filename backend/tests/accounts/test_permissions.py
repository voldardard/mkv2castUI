"""
Tests for custom permission classes.
"""
import pytest
from django.test import RequestFactory
from rest_framework.test import APIRequestFactory
from rest_framework.views import APIView

from accounts.permissions import IsAuthenticatedOrAuthDisabled
from accounts.models import User


class TestIsAuthenticatedOrAuthDisabled:
    """Tests for IsAuthenticatedOrAuthDisabled permission class."""
    
    @pytest.fixture
    def permission(self):
        """Return an instance of the permission class."""
        return IsAuthenticatedOrAuthDisabled()
    
    @pytest.fixture
    def request_factory(self):
        """Return an API request factory."""
        return APIRequestFactory()
    
    @pytest.fixture
    def mock_view(self):
        """Return a mock view."""
        return APIView()
    
    def test_auth_disabled_allows_access(self, permission, request_factory, mock_view, disable_auth):
        """Test that access is allowed when auth is disabled."""
        request = request_factory.get('/api/test/')
        request.user = None
        
        assert permission.has_permission(request, mock_view) is True
    
    def test_auth_enabled_denies_anonymous(self, permission, request_factory, mock_view, enable_auth):
        """Test that anonymous users are denied when auth is enabled."""
        from django.contrib.auth.models import AnonymousUser
        
        request = request_factory.get('/api/test/')
        request.user = AnonymousUser()
        
        assert permission.has_permission(request, mock_view) is False
    
    def test_auth_enabled_allows_authenticated(self, permission, request_factory, mock_view, enable_auth, user):
        """Test that authenticated users are allowed when auth is enabled."""
        request = request_factory.get('/api/test/')
        request.user = user
        
        assert permission.has_permission(request, mock_view) is True
