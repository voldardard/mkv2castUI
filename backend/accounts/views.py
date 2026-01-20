"""
Views for user authentication and profile management.
"""
import os
from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status, generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser

from .serializers import (
    UserSerializer,
    UserProfileSerializer,
    RegistrationSerializer,
    LoginSerializer,
    TwoFactorLoginSerializer,
    TOTPSetupSerializer,
    TOTPVerifySerializer,
    TOTPDisableSerializer,
    PasswordChangeSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
    PublicSiteSettingsSerializer,
)
from .authentication import get_or_create_anonymous_user
from .throttling import LoginRateThrottle, RegistrationRateThrottle, PasswordResetRateThrottle
from .totp import TOTPManager
from .models import SiteSettings

User = get_user_model()


# =============================================================================
# User Profile Views
# =============================================================================

class UserProfileView(generics.RetrieveUpdateAPIView):
    """
    Get or update the current user's profile.
    """
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_object(self):
        return self.request.user
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def current_user(request, *args, **kwargs):
    """
    Get the current authenticated user's information.
    """
    serializer = UserSerializer(request.user)
    return Response(serializer.data)


# =============================================================================
# OAuth & Config Views
# =============================================================================

@api_view(['GET'])
@permission_classes([AllowAny])
def oauth_providers(request, *args, **kwargs):
    """
    Get available OAuth providers based on configuration.
    Only returns providers that have their client IDs configured.
    Checks database settings first, then environment variables.
    """
    providers = []
    
    # Get site settings
    site_settings = SiteSettings.get_settings()
    
    # Check if Google OAuth is configured
    google_client_id = site_settings.google_client_id
    if not google_client_id:
        google_client_id = getattr(settings, 'SOCIALACCOUNT_PROVIDERS', {}).get('google', {}).get('APP', {}).get('client_id', '')
    if not google_client_id:
        google_client_id = getattr(settings, 'GOOGLE_CLIENT_ID', '') or os.environ.get('GOOGLE_CLIENT_ID', '')
    
    google_client_secret = site_settings.google_client_secret
    if not google_client_secret:
        google_client_secret = os.environ.get('GOOGLE_CLIENT_SECRET', '')
    
    if google_client_id and google_client_secret:
        providers.append({
            'id': 'google',
            'name': 'Google',
            'url': '/accounts/google/login/',
        })
    
    # Check if GitHub OAuth is configured
    github_client_id = site_settings.github_client_id
    if not github_client_id:
        github_client_id = getattr(settings, 'SOCIALACCOUNT_PROVIDERS', {}).get('github', {}).get('APP', {}).get('client_id', '')
    if not github_client_id:
        github_client_id = getattr(settings, 'GITHUB_CLIENT_ID', '') or os.environ.get('GITHUB_CLIENT_ID', '')
    
    github_client_secret = site_settings.github_client_secret
    if not github_client_secret:
        github_client_secret = os.environ.get('GITHUB_CLIENT_SECRET', '')
    
    if github_client_id and github_client_secret:
        providers.append({
            'id': 'github',
            'name': 'GitHub',
            'url': '/accounts/github/login/',
        })
    
    return Response(providers)


@api_view(['GET'])
@permission_classes([AllowAny])
def auth_config(request, *args, **kwargs):
    """
    Get authentication configuration.
    
    Returns whether authentication is required and the current user info
    if authentication is disabled.
    
    Settings are loaded from database first, then environment variables as fallback.
    """
    site_settings = SiteSettings.get_settings()
    
    # Check require_auth from database first, then env
    require_auth = site_settings.require_auth
    # Allow environment variable to override (for initial setup)
    env_require_auth = os.environ.get('REQUIRE_AUTH', '').lower()
    if env_require_auth in ('false', '0', 'no'):
        require_auth = False
    elif env_require_auth in ('true', '1', 'yes'):
        require_auth = True
    
    response_data = {
        'require_auth': require_auth,
        'allow_registration': site_settings.allow_registration,
        'site_name': site_settings.site_name,
    }
    
    # If auth is disabled, include the anonymous user info
    if not require_auth:
        user = get_or_create_anonymous_user()
        response_data['user'] = UserSerializer(user).data
    
    return Response(response_data)


# =============================================================================
# Registration & Login Views
# =============================================================================

class RegisterView(APIView):
    """
    User registration endpoint.
    """
    permission_classes = [AllowAny]
    throttle_classes = [RegistrationRateThrottle]
    
    def post(self, request, *args, **kwargs):
        # Check if registration is allowed
        site_settings = SiteSettings.get_settings()
        if not site_settings.allow_registration:
            return Response(
                {'detail': 'Registration is currently disabled.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = RegistrationSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            
            # Create auth token
            token, _ = Token.objects.get_or_create(user=user)
            
            return Response({
                'user': UserSerializer(user).data,
                'token': token.key,
                'message': 'Registration successful.'
            }, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    """
    User login endpoint with brute-force protection.
    """
    permission_classes = [AllowAny]
    throttle_classes = [LoginRateThrottle]
    
    def post(self, request, *args, **kwargs):
        throttle = LoginRateThrottle()
        
        # Check user-specific throttle using email_or_username
        email_or_username = request.data.get('email_or_username', '').strip().lower()
        if email_or_username:
            throttle.check_user_throttle(email_or_username)
        
        serializer = LoginSerializer(data=request.data)
        
        if serializer.is_valid():
            user = serializer.validated_data.get('user')
            requires_2fa = serializer.validated_data.get('requires_2fa', False)
            
            if requires_2fa:
                # Return partial success - 2FA required
                return Response({
                    'requires_2fa': True,
                    'email': user.email,
                    'message': 'Please enter your 2FA code.'
                }, status=status.HTTP_200_OK)
            
            # Full success - create token
            token, _ = Token.objects.get_or_create(user=user)
            
            # Update last login IP
            ip = self._get_client_ip(request)
            user.last_login_ip = ip
            user.last_login = timezone.now()
            user.save(update_fields=['last_login_ip', 'last_login'])
            
            # Reset throttle on success (use email for consistency)
            throttle.reset_attempts(user.email)
            
            return Response({
                'user': UserSerializer(user).data,
                'token': token.key,
                'requires_2fa': False,
            }, status=status.HTTP_200_OK)
        
        # Record failed attempt
        throttle.record_failed_attempt(email_or_username)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def _get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class TwoFactorLoginView(APIView):
    """
    Complete login with 2FA code.
    """
    permission_classes = [AllowAny]
    throttle_classes = [LoginRateThrottle]
    
    def post(self, request, *args, **kwargs):
        serializer = TwoFactorLoginSerializer(data=request.data)
        
        if serializer.is_valid():
            user = serializer.validated_data.get('user')
            
            # Create token
            token, _ = Token.objects.get_or_create(user=user)
            
            # Update last login
            ip = self._get_client_ip(request)
            user.last_login_ip = ip
            user.last_login = timezone.now()
            user.reset_failed_attempts()
            user.save(update_fields=['last_login_ip', 'last_login'])
            
            return Response({
                'user': UserSerializer(user).data,
                'token': token.key,
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def _get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request, *args, **kwargs):
    """
    Logout the current user by deleting their auth token.
    """
    try:
        request.user.auth_token.delete()
    except Token.DoesNotExist:
        pass
    return Response({'detail': 'Successfully logged out.'}, status=status.HTTP_200_OK)


# =============================================================================
# Two-Factor Authentication Views
# =============================================================================

class TOTPSetupView(APIView):
    """
    Initialize 2FA setup for the current user.
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, *args, **kwargs):
        user = request.user
        
        if user.totp_enabled:
            return Response(
                {'detail': '2FA is already enabled.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get site name for the authenticator label
        site_settings = SiteSettings.get_settings()
        
        totp_manager = TOTPManager(user)
        setup_data = totp_manager.setup(issuer=site_settings.site_name)
        
        return Response({
            'secret': setup_data['secret'],
            'qr_code': setup_data['qr_code'],
            'message': 'Scan the QR code with your authenticator app, then verify with a code.'
        }, status=status.HTTP_200_OK)


class TOTPVerifyView(APIView):
    """
    Verify TOTP code and enable 2FA.
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, *args, **kwargs):
        serializer = TOTPVerifySerializer(data=request.data)
        
        if serializer.is_valid():
            user = request.user
            code = serializer.validated_data['code']
            
            totp_manager = TOTPManager(user)
            result = totp_manager.verify_and_enable(code)
            
            if result['success']:
                return Response({
                    'message': '2FA has been enabled successfully.',
                    'backup_codes': result['backup_codes'],
                    'warning': 'Save these backup codes in a safe place. They can only be viewed once.'
                }, status=status.HTTP_200_OK)
            else:
                return Response(
                    {'detail': result['error']},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class TOTPDisableView(APIView):
    """
    Disable 2FA for the current user.
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, *args, **kwargs):
        serializer = TOTPDisableSerializer(
            data=request.data,
            context={'user': request.user}
        )
        
        if serializer.is_valid():
            totp_manager = TOTPManager(request.user)
            totp_manager.disable()
            
            return Response({
                'message': '2FA has been disabled.'
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class TOTPBackupCodesView(APIView):
    """
    Regenerate backup codes.
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, *args, **kwargs):
        user = request.user
        
        if not user.totp_enabled:
            return Response(
                {'detail': '2FA is not enabled.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        totp_manager = TOTPManager(user)
        backup_codes = totp_manager.regenerate_backup_codes()
        
        return Response({
            'backup_codes': backup_codes,
            'warning': 'Previous backup codes have been invalidated. Save these new codes.'
        }, status=status.HTTP_200_OK)


# =============================================================================
# Password Management Views
# =============================================================================

class PasswordChangeView(APIView):
    """
    Change password for authenticated user.
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, *args, **kwargs):
        serializer = PasswordChangeSerializer(
            data=request.data,
            context={'user': request.user}
        )
        
        if serializer.is_valid():
            user = request.user
            user.set_password(serializer.validated_data['new_password'])
            user.password_changed_at = timezone.now()
            user.save(update_fields=['password', 'password_changed_at'])
            
            # Invalidate existing token and create new one
            Token.objects.filter(user=user).delete()
            token = Token.objects.create(user=user)
            
            return Response({
                'message': 'Password changed successfully.',
                'token': token.key,
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PasswordResetRequestView(APIView):
    """
    Request a password reset email.
    """
    permission_classes = [AllowAny]
    throttle_classes = [PasswordResetRateThrottle]
    
    def post(self, request, *args, **kwargs):
        throttle = PasswordResetRateThrottle()
        
        serializer = PasswordResetRequestSerializer(data=request.data)
        
        if serializer.is_valid():
            email = serializer.validated_data['email']
            
            # Check email throttle
            throttle.check_email_throttle(email)
            
            # Check if user exists
            try:
                user = User.objects.get(email=email)
                
                # Check if user is using SSO
                if user.auth_provider != 'local':
                    # Don't reveal this, just return success
                    pass
                else:
                    # TODO: Generate reset token and send email
                    # For now, just log the request
                    pass
                    
            except User.DoesNotExist:
                # Don't reveal if user exists
                pass
            
            # Always return success to prevent email enumeration
            return Response({
                'message': 'If an account exists with this email, you will receive a password reset link.'
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PasswordResetConfirmView(APIView):
    """
    Confirm password reset with token.
    """
    permission_classes = [AllowAny]
    
    def post(self, request, *args, **kwargs):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        
        if serializer.is_valid():
            # TODO: Validate token and reset password
            # For now, return a placeholder response
            return Response({
                'message': 'Password reset functionality coming soon.'
            }, status=status.HTTP_501_NOT_IMPLEMENTED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# =============================================================================
# Public Site Settings View
# =============================================================================

@api_view(['GET'])
@permission_classes([AllowAny])
def public_site_settings(request, *args, **kwargs):
    """
    Get public site settings (branding, maintenance mode).
    """
    settings_obj = SiteSettings.get_settings()
    serializer = PublicSiteSettingsSerializer(settings_obj)
    return Response(serializer.data)
