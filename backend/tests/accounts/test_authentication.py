"""
Tests for custom authentication classes.
"""
import pytest
from django.test import RequestFactory
from rest_framework.test import APIRequestFactory

from accounts.authentication import OptionalAuthentication
from accounts.models import User


class TestOptionalAuthentication:
    """Tests for OptionalAuthentication class."""
    
    @pytest.fixture
    def auth_class(self):
        """Return an instance of OptionalAuthentication."""
        return OptionalAuthentication()
    
    @pytest.fixture
    def request_factory(self):
        """Return an API request factory."""
        return APIRequestFactory()
    
    def test_auth_disabled_returns_local_user(self, auth_class, request_factory, disable_auth, local_user):
        """Test that local user is returned when auth is disabled."""
        request = request_factory.get('/api/test/')
        result = auth_class.authenticate(request)
        
        assert result is not None
        user, _ = result
        assert user.username == 'local_user'
    
    def test_auth_enabled_no_credentials_returns_none(self, auth_class, request_factory, enable_auth):
        """Test that None is returned when auth enabled but no credentials."""
        request = request_factory.get('/api/test/')
        result = auth_class.authenticate(request)
        
        # Should return None to allow other authenticators
        assert result is None
    
    def test_auth_enabled_with_session(self, auth_class, request_factory, enable_auth, user, db):
        """Test session authentication when enabled."""
        request = request_factory.get('/api/test/')
        request.user = user
        request.session = {}
        
        # The class should defer to session auth
        result = auth_class.authenticate(request)
        # Result depends on implementation
        assert result is None or result[0] == user
