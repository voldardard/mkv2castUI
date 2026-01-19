"""
Custom adapters for django-allauth OAuth integration.
"""
from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from allauth.account.adapter import DefaultAccountAdapter
from django.conf import settings


class CustomAccountAdapter(DefaultAccountAdapter):
    """
    Custom account adapter for handling user creation and authentication.
    """

    def is_open_for_signup(self, request):
        """
        Check if new signups are allowed.
        """
        return True

    def save_user(self, request, user, form, commit=True):
        """
        Save a new user instance.
        """
        user = super().save_user(request, user, form, commit=False)
        
        # Set default preferences
        user.preferred_language = self.get_user_language(request)
        
        if commit:
            user.save()
        
        return user

    def get_user_language(self, request):
        """
        Determine user's preferred language from request.
        """
        # Check URL path for language
        path = request.path
        for lang_code in ['en', 'fr', 'de', 'es', 'it']:
            if f'/{lang_code}/' in path:
                return lang_code
        
        # Fall back to browser language
        accept_language = request.META.get('HTTP_ACCEPT_LANGUAGE', 'en')
        for lang_code in ['fr', 'de', 'es', 'it']:
            if lang_code in accept_language.lower():
                return lang_code
        
        return 'en'


class CustomSocialAccountAdapter(DefaultSocialAccountAdapter):
    """
    Custom social account adapter for OAuth provider integration.
    """

    def pre_social_login(self, request, sociallogin):
        """
        Hook called before the social login is complete.
        
        This is used to link social accounts to existing users with the same email.
        """
        # Check if this social account is already connected
        if sociallogin.is_existing:
            return

        # Check if a user with this email already exists
        email = sociallogin.account.extra_data.get('email')
        if email:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            
            try:
                existing_user = User.objects.get(email=email)
                # Connect this social account to the existing user
                sociallogin.connect(request, existing_user)
            except User.DoesNotExist:
                pass

    def save_user(self, request, sociallogin, form=None):
        """
        Save a new user from social login.
        """
        user = super().save_user(request, sociallogin, form)
        
        # Extract additional data from social account
        extra_data = sociallogin.account.extra_data
        
        # Set name from social provider
        if not user.first_name and extra_data.get('given_name'):
            user.first_name = extra_data['given_name']
        if not user.last_name and extra_data.get('family_name'):
            user.last_name = extra_data['family_name']
        
        # For GitHub, use 'name' field
        if not user.first_name and extra_data.get('name'):
            name_parts = extra_data['name'].split(' ', 1)
            user.first_name = name_parts[0]
            if len(name_parts) > 1:
                user.last_name = name_parts[1]
        
        # Set preferred language
        user.preferred_language = self._get_language_from_request(request)
        
        user.save()
        return user

    def _get_language_from_request(self, request):
        """
        Determine user's preferred language from request.
        """
        path = request.path
        for lang_code in ['en', 'fr', 'de', 'es', 'it']:
            if f'/{lang_code}/' in path:
                return lang_code
        return 'en'

    def get_login_redirect_url(self, request):
        """
        Return the URL to redirect to after successful login.
        """
        # Try to get language from referer or default to 'en'
        referer = request.META.get('HTTP_REFERER', '')
        for lang_code in ['fr', 'de', 'es', 'it']:
            if f'/{lang_code}/' in referer:
                return f'/{lang_code}/'
        return '/en/'
