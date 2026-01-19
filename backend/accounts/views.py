"""
Views for user authentication and profile management.
"""
from django.conf import settings
from rest_framework import status, generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from django.contrib.auth import get_user_model

from .serializers import UserSerializer, UserProfileSerializer
from .authentication import get_or_create_anonymous_user

User = get_user_model()


class UserProfileView(generics.RetrieveUpdateAPIView):
    """
    Get or update the current user's profile.
    """
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def current_user(request):
    """
    Get the current authenticated user's information.
    """
    serializer = UserSerializer(request.user)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """
    Logout the current user by deleting their auth token.
    """
    try:
        request.user.auth_token.delete()
    except Token.DoesNotExist:
        pass
    return Response({'detail': 'Successfully logged out.'}, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([AllowAny])
def oauth_providers(request):
    """
    Get available OAuth providers.
    """
    providers = [
        {
            'id': 'google',
            'name': 'Google',
            'url': '/accounts/google/login/',
        },
        {
            'id': 'github',
            'name': 'GitHub',
            'url': '/accounts/github/login/',
        },
    ]
    return Response(providers)


@api_view(['GET'])
@permission_classes([AllowAny])
def auth_config(request):
    """
    Get authentication configuration.
    
    Returns whether authentication is required and the current user info
    if authentication is disabled.
    """
    require_auth = getattr(settings, 'REQUIRE_AUTH', True)
    
    response_data = {
        'require_auth': require_auth,
        'providers': ['google', 'github'] if require_auth else [],
    }
    
    # If auth is disabled, include the anonymous user info
    if not require_auth:
        user = get_or_create_anonymous_user()
        response_data['user'] = UserSerializer(user).data
    
    return Response(response_data)
