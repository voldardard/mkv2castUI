"""
URL patterns for accounts API.
"""
from django.urls import path
from . import views

urlpatterns = [
    # User profile
    path('me/', views.current_user, name='current-user'),
    path('profile/', views.UserProfileView.as_view(), name='user-profile'),
    
    # Auth config
    path('config/', views.auth_config, name='auth-config'),
    path('providers/', views.oauth_providers, name='oauth-providers'),
    path('site-settings/', views.public_site_settings, name='public-site-settings'),
    
    # Registration & Login
    path('register/', views.RegisterView.as_view(), name='register'),
    path('login/', views.LoginView.as_view(), name='login'),
    path('login/2fa/', views.TwoFactorLoginView.as_view(), name='login-2fa'),
    path('logout/', views.logout_view, name='logout'),
    
    # Two-Factor Authentication
    path('2fa/setup/', views.TOTPSetupView.as_view(), name='2fa-setup'),
    path('2fa/verify/', views.TOTPVerifyView.as_view(), name='2fa-verify'),
    path('2fa/disable/', views.TOTPDisableView.as_view(), name='2fa-disable'),
    path('2fa/backup-codes/', views.TOTPBackupCodesView.as_view(), name='2fa-backup-codes'),
    
    # Password management
    path('password/change/', views.PasswordChangeView.as_view(), name='password-change'),
    path('password/reset/', views.PasswordResetRequestView.as_view(), name='password-reset-request'),
    path('password/reset/confirm/', views.PasswordResetConfirmView.as_view(), name='password-reset-confirm'),
]
