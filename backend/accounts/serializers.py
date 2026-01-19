"""
Serializers for user accounts and authentication.
"""
import re
from rest_framework import serializers
from django.contrib.auth import get_user_model, authenticate
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils import timezone

from .models import SiteSettings

User = get_user_model()


# =============================================================================
# User Serializers
# =============================================================================

class UserSerializer(serializers.ModelSerializer):
    """
    Serializer for user information (read-only).
    """
    storage_remaining = serializers.ReadOnlyField()
    storage_used_percent = serializers.ReadOnlyField()
    has_2fa = serializers.SerializerMethodField()
    avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id',
            'email',
            'username',
            'first_name',
            'last_name',
            'auth_provider',
            'preferred_language',
            'default_container',
            'default_hw_backend',
            'default_quality_preset',
            'subscription_tier',
            'storage_used',
            'storage_limit',
            'storage_remaining',
            'storage_used_percent',
            'is_admin',
            'has_2fa',
            'avatar_url',
            'created_at',
        ]
        read_only_fields = fields
    
    def get_has_2fa(self, obj):
        return obj.totp_enabled
    
    def get_avatar_url(self, obj):
        if obj.avatar:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.avatar.url)
            return obj.avatar.url
        return None


class UserProfileSerializer(serializers.ModelSerializer):
    """
    Serializer for updating user profile settings.
    """
    avatar_url = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'first_name',
            'last_name',
            'avatar',
            'avatar_url',
            'preferred_language',
            'default_container',
            'default_hw_backend',
            'default_quality_preset',
        ]
        extra_kwargs = {
            'avatar': {'required': False, 'allow_null': True},
        }
    
    def get_avatar_url(self, obj):
        if obj.avatar:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.avatar.url)
            return obj.avatar.url
        return None
    
    def validate_avatar(self, value):
        if value:
            # Limit file size to 5MB
            if value.size > 5 * 1024 * 1024:
                raise serializers.ValidationError('Avatar file size must be less than 5MB')
            # Validate file type
            if not value.content_type.startswith('image/'):
                raise serializers.ValidationError('Avatar must be an image file')
        return value


class AdminUserSerializer(serializers.ModelSerializer):
    """
    Serializer for admin user management (full access).
    """
    storage_remaining = serializers.ReadOnlyField()
    storage_used_percent = serializers.ReadOnlyField()
    has_2fa = serializers.SerializerMethodField()
    conversions_remaining = serializers.ReadOnlyField()

    class Meta:
        model = User
        fields = [
            'id',
            'email',
            'username',
            'first_name',
            'last_name',
            'auth_provider',
            'is_active',
            'is_admin',
            'is_staff',
            'subscription_tier',
            'subscription_expires_at',
            'max_concurrent_jobs',
            'max_file_size',
            'monthly_conversion_limit',
            'conversions_this_month',
            'conversions_remaining',
            'storage_used',
            'storage_limit',
            'storage_remaining',
            'storage_used_percent',
            'preferred_language',
            'has_2fa',
            'failed_login_attempts',
            'locked_until',
            'last_login',
            'last_login_ip',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'auth_provider',
            'conversions_remaining',
            'storage_remaining',
            'storage_used_percent',
            'failed_login_attempts',
            'locked_until',
            'last_login',
            'last_login_ip',
            'created_at',
            'updated_at',
        ]
    
    def get_has_2fa(self, obj):
        return obj.totp_enabled


# =============================================================================
# Registration Serializers
# =============================================================================

class RegistrationSerializer(serializers.Serializer):
    """
    Serializer for user registration.
    """
    email = serializers.EmailField()
    username = serializers.CharField(min_length=3, max_length=30)
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)
    first_name = serializers.CharField(max_length=30, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=30, required=False, allow_blank=True)
    
    def validate_email(self, value):
        """Check if email is already registered."""
        email = value.lower()
        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError("This email is already registered.")
        return email
    
    def validate_username(self, value):
        """Validate username format and uniqueness."""
        # Check format (alphanumeric and underscores only)
        if not re.match(r'^[a-zA-Z0-9_]+$', value):
            raise serializers.ValidationError(
                "Username can only contain letters, numbers, and underscores."
            )
        
        # Check uniqueness (case-insensitive)
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("This username is already taken.")
        
        return value
    
    def validate_password(self, value):
        """Validate password strength using Django's validators."""
        try:
            validate_password(value)
        except DjangoValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return value
    
    def validate(self, data):
        """Check that passwords match."""
        if data.get('password') != data.get('password_confirm'):
            raise serializers.ValidationError({
                'password_confirm': "Passwords do not match."
            })
        return data
    
    def create(self, validated_data):
        """Create and return a new user."""
        validated_data.pop('password_confirm')
        
        user = User.objects.create_user(
            email=validated_data['email'],
            username=validated_data['username'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            auth_provider='local',
        )
        
        # Apply tier limits
        user.apply_tier_limits()
        
        return user


# =============================================================================
# Login Serializers
# =============================================================================

class LoginSerializer(serializers.Serializer):
    """
    Serializer for user login. Accepts either email or username.
    """
    email_or_username = serializers.CharField()
    password = serializers.CharField(write_only=True)
    totp_code = serializers.CharField(required=False, allow_blank=True)
    
    def validate(self, data):
        email_or_username = data.get('email_or_username', '').strip()
        password = data.get('password')
        
        if not email_or_username:
            raise serializers.ValidationError({
                'email_or_username': "Email or username is required."
            })
        
        # Try to find user by email first (case-insensitive)
        user = None
        email_or_username_lower = email_or_username.lower()
        try:
            user = User.objects.get(email__iexact=email_or_username_lower)
        except User.DoesNotExist:
            # If not found by email, try username (case-insensitive)
            try:
                user = User.objects.get(username__iexact=email_or_username_lower)
            except User.DoesNotExist:
                raise serializers.ValidationError({
                    'email_or_username': "Invalid email/username or password."
                })
        
        # Check if account is locked
        if user.is_locked:
            remaining = int((user.locked_until - timezone.now()).total_seconds() / 60)
            raise serializers.ValidationError({
                'email_or_username': f"Account is locked. Please try again in {remaining} minutes."
            })
        
        # Check if user is using SSO
        if user.auth_provider != 'local':
            raise serializers.ValidationError({
                'email_or_username': f"This account uses {user.auth_provider} login. Please sign in with {user.auth_provider}."
            })
        
        # Authenticate using the user's email (Django's authenticate uses email as username)
        authenticated_user = authenticate(
            username=user.email,
            password=password
        )
        
        if not authenticated_user:
            # Record failed attempt
            user.record_failed_login()
            raise serializers.ValidationError({
                'email_or_username': "Invalid email/username or password."
            })
        
        # Check if 2FA is enabled
        if user.totp_enabled:
            totp_code = data.get('totp_code', '').strip()
            if not totp_code:
                # Return partial success - need 2FA
                data['user'] = user
                data['requires_2fa'] = True
                return data
        
        # Reset failed attempts on success
        user.reset_failed_attempts()
        
        data['user'] = user
        data['requires_2fa'] = False
        return data


class TwoFactorLoginSerializer(serializers.Serializer):
    """
    Serializer for completing 2FA login. Accepts either email or username.
    """
    email_or_username = serializers.CharField()
    code = serializers.CharField()
    is_backup_code = serializers.BooleanField(default=False)
    
    def validate(self, data):
        email_or_username = data.get('email_or_username', '').strip().lower()
        code = data.get('code', '').strip()
        is_backup = data.get('is_backup_code', False)
        
        # Try to find user by email first, then username
        user = None
        try:
            user = User.objects.get(email__iexact=email_or_username)
        except User.DoesNotExist:
            try:
                user = User.objects.get(username__iexact=email_or_username)
            except User.DoesNotExist:
                raise serializers.ValidationError({'code': "Invalid request."})
        
        if not user.totp_enabled:
            raise serializers.ValidationError({'code': "2FA is not enabled."})
        
        from .totp import TOTPManager
        totp_manager = TOTPManager(user)
        
        if is_backup:
            if not totp_manager.verify_backup_code(code):
                raise serializers.ValidationError({'code': "Invalid backup code."})
        else:
            if not totp_manager.verify(code):
                raise serializers.ValidationError({'code': "Invalid verification code."})
        
        data['user'] = user
        return data


# =============================================================================
# 2FA Serializers
# =============================================================================

class TOTPSetupSerializer(serializers.Serializer):
    """
    Serializer for initiating 2FA setup.
    Returns the QR code and secret for the user.
    """
    pass  # No input needed, just triggers setup


class TOTPVerifySerializer(serializers.Serializer):
    """
    Serializer for verifying and enabling 2FA.
    """
    code = serializers.CharField(min_length=6, max_length=6)
    
    def validate_code(self, value):
        # Clean the code
        code = value.replace(' ', '').replace('-', '')
        if not code.isdigit():
            raise serializers.ValidationError("Code must contain only digits.")
        return code


class TOTPDisableSerializer(serializers.Serializer):
    """
    Serializer for disabling 2FA.
    Requires password confirmation.
    """
    password = serializers.CharField(write_only=True)
    
    def validate_password(self, value):
        user = self.context.get('user')
        if not user.check_password(value):
            raise serializers.ValidationError("Invalid password.")
        return value


# =============================================================================
# Password Serializers
# =============================================================================

class PasswordChangeSerializer(serializers.Serializer):
    """
    Serializer for changing password (authenticated user).
    """
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)
    new_password_confirm = serializers.CharField(write_only=True)
    
    def validate_current_password(self, value):
        user = self.context.get('user')
        if not user.check_password(value):
            raise serializers.ValidationError("Current password is incorrect.")
        return value
    
    def validate_new_password(self, value):
        try:
            validate_password(value)
        except DjangoValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return value
    
    def validate(self, data):
        if data['new_password'] != data['new_password_confirm']:
            raise serializers.ValidationError({
                'new_password_confirm': "Passwords do not match."
            })
        return data


class PasswordResetRequestSerializer(serializers.Serializer):
    """
    Serializer for requesting a password reset.
    """
    email = serializers.EmailField()
    
    def validate_email(self, value):
        return value.lower()


class PasswordResetConfirmSerializer(serializers.Serializer):
    """
    Serializer for confirming password reset with token.
    """
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True, min_length=8)
    new_password_confirm = serializers.CharField(write_only=True)
    
    def validate_new_password(self, value):
        try:
            validate_password(value)
        except DjangoValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return value
    
    def validate(self, data):
        if data['new_password'] != data['new_password_confirm']:
            raise serializers.ValidationError({
                'new_password_confirm': "Passwords do not match."
            })
        return data


# =============================================================================
# Site Settings Serializers
# =============================================================================

class SiteSettingsSerializer(serializers.ModelSerializer):
    """
    Serializer for site settings.
    """
    logo = serializers.ReadOnlyField()
    # Don't expose secrets in responses - write-only
    smtp_password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    google_client_secret = serializers.CharField(write_only=True, required=False, allow_blank=True)
    github_client_secret = serializers.CharField(write_only=True, required=False, allow_blank=True)
    # Indicate if secrets are set
    smtp_password_set = serializers.SerializerMethodField()
    google_configured = serializers.SerializerMethodField()
    github_configured = serializers.SerializerMethodField()
    
    class Meta:
        model = SiteSettings
        fields = [
            # Branding
            'site_name',
            'site_tagline',
            'logo_url',
            'logo_file',
            'logo',
            'favicon_file',
            'primary_color',
            'secondary_color',
            # Defaults
            'default_container',
            'default_hw_backend',
            'default_quality_preset',
            'max_file_size',
            # Server settings
            'maintenance_mode',
            'maintenance_message',
            'allow_registration',
            'require_email_verification',
            # Auth settings
            'require_auth',
            'google_client_id',
            'google_client_secret',
            'google_configured',
            'github_client_id',
            'github_client_secret',
            'github_configured',
            # SMTP
            'smtp_host',
            'smtp_port',
            'smtp_username',
            'smtp_password',
            'smtp_password_set',
            'smtp_use_tls',
            'smtp_use_ssl',
            'smtp_from_email',
            'smtp_from_name',
            # Timestamps
            'updated_at',
        ]
        read_only_fields = ['updated_at', 'logo', 'smtp_password_set', 'google_configured', 'github_configured']
    
    def get_smtp_password_set(self, obj):
        return bool(obj.smtp_password)
    
    def get_google_configured(self, obj):
        return bool(obj.google_client_id and obj.google_client_secret)
    
    def get_github_configured(self, obj):
        return bool(obj.github_client_id and obj.github_client_secret)
    
    def update(self, instance, validated_data):
        # Only update secrets if provided (don't clear on empty)
        if 'smtp_password' in validated_data and not validated_data['smtp_password']:
            validated_data.pop('smtp_password')
        if 'google_client_secret' in validated_data and not validated_data['google_client_secret']:
            validated_data.pop('google_client_secret')
        if 'github_client_secret' in validated_data and not validated_data['github_client_secret']:
            validated_data.pop('github_client_secret')
        return super().update(instance, validated_data)


class PublicSiteSettingsSerializer(serializers.ModelSerializer):
    """
    Serializer for public site settings (no sensitive data).
    """
    logo = serializers.ReadOnlyField()
    
    class Meta:
        model = SiteSettings
        fields = [
            'site_name',
            'site_tagline',
            'logo',
            'primary_color',
            'secondary_color',
            'maintenance_mode',
            'maintenance_message',
            'allow_registration',
        ]
