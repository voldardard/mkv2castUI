"""
Custom permission classes for mkv2cast.
"""
from django.conf import settings
from rest_framework.permissions import BasePermission, IsAuthenticated


class IsAuthenticatedOrAuthDisabled(BasePermission):
    """
    Permission class that allows access when either:
    - The user is authenticated (normal mode)
    - Authentication is disabled via REQUIRE_AUTH=false (local mode)
    """
    
    def has_permission(self, request, view):
        # If auth is disabled, allow all requests
        if not getattr(settings, 'REQUIRE_AUTH', True):
            return True
        
        # Otherwise, require authentication
        return request.user and request.user.is_authenticated


class IsAuthenticatedOrReadOnly(BasePermission):
    """
    Permission class that allows:
    - Read access for everyone
    - Write access only for authenticated users (or when auth is disabled)
    """
    
    SAFE_METHODS = ('GET', 'HEAD', 'OPTIONS')
    
    def has_permission(self, request, view):
        # If auth is disabled, allow all requests
        if not getattr(settings, 'REQUIRE_AUTH', True):
            return True
        
        # Allow read-only access
        if request.method in self.SAFE_METHODS:
            return True
        
        # Require authentication for write operations
        return request.user and request.user.is_authenticated
