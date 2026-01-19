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


class IsAdminUser(BasePermission):
    """
    Permission class that only allows access to admin users.
    
    Checks the is_admin field on the User model (not is_staff).
    Also allows superusers.
    """
    
    message = "Admin access required."
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Allow superusers
        if request.user.is_superuser:
            return True
        
        # Check is_admin flag
        return getattr(request.user, 'is_admin', False)


class IsAdminOrReadOnly(BasePermission):
    """
    Permission class that allows:
    - Read access for authenticated users
    - Write access only for admin users
    """
    
    SAFE_METHODS = ('GET', 'HEAD', 'OPTIONS')
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Allow read-only access for all authenticated users
        if request.method in self.SAFE_METHODS:
            return True
        
        # Require admin for write operations
        if request.user.is_superuser:
            return True
        
        return getattr(request.user, 'is_admin', False)


class IsOwnerOrAdmin(BasePermission):
    """
    Permission class that allows:
    - Access to the owner of an object
    - Access to admin users
    
    Requires the view to have a 'user' field on the object.
    """
    
    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Admin access
        if request.user.is_superuser or getattr(request.user, 'is_admin', False):
            return True
        
        # Owner access - check various common field names
        owner = getattr(obj, 'user', None) or getattr(obj, 'owner', None)
        if owner:
            return owner == request.user
        
        # If object is a user, check if it's the same user
        if hasattr(obj, 'email') and hasattr(obj, 'id'):
            return obj.id == request.user.id
        
        return False
