"""
Custom authentication classes for mkv2cast.
"""
from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework.authentication import BaseAuthentication


User = get_user_model()

# Username for the anonymous local user
ANONYMOUS_USERNAME = 'local_user'
ANONYMOUS_EMAIL = 'local@mkv2cast.local'


def get_or_create_anonymous_user():
    """
    Get or create the anonymous local user.
    This user is used when REQUIRE_AUTH is False.
    """
    user, created = User.objects.get_or_create(
        username=ANONYMOUS_USERNAME,
        defaults={
            'email': ANONYMOUS_EMAIL,
            'is_active': True,
            'subscription_tier': 'enterprise',  # Give local user full access
            'max_concurrent_jobs': 999,
            'max_file_size': 50 * 1024 * 1024 * 1024,  # 50GB
            'monthly_conversion_limit': 999999,
            'storage_limit': 1024 * 1024 * 1024 * 1024,  # 1TB
            'hw_acceleration_enabled': True,
            'priority_queue': True,
        }
    )
    return user


class OptionalAuthentication(BaseAuthentication):
    """
    Authentication class that returns the anonymous user when REQUIRE_AUTH is False.
    
    When authentication is disabled:
    - All requests are authenticated as the anonymous local user
    - The local user has full enterprise-level access
    
    When authentication is enabled:
    - This class returns None, allowing other authentication classes to handle auth
    """
    
    def authenticate(self, request):
        """
        Returns the anonymous user if auth is disabled, None otherwise.
        """
        if not getattr(settings, 'REQUIRE_AUTH', True):
            user = get_or_create_anonymous_user()
            return (user, None)
        return None
