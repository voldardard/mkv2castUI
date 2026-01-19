"""
URL patterns for accounts API.
"""
from django.urls import path
from . import views

urlpatterns = [
    path('me/', views.current_user, name='current-user'),
    path('profile/', views.UserProfileView.as_view(), name='user-profile'),
    path('logout/', views.logout_view, name='logout'),
    path('providers/', views.oauth_providers, name='oauth-providers'),
    path('config/', views.auth_config, name='auth-config'),
]
