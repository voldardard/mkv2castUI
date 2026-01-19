"""
Serializers for user accounts.
"""
from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """
    Serializer for user information (read-only).
    """
    storage_remaining = serializers.ReadOnlyField()
    storage_used_percent = serializers.ReadOnlyField()

    class Meta:
        model = User
        fields = [
            'id',
            'email',
            'username',
            'first_name',
            'last_name',
            'preferred_language',
            'default_container',
            'default_hw_backend',
            'default_quality_preset',
            'storage_used',
            'storage_limit',
            'storage_remaining',
            'storage_used_percent',
            'created_at',
        ]
        read_only_fields = [
            'id',
            'email',
            'storage_used',
            'storage_limit',
            'created_at',
        ]


class UserProfileSerializer(serializers.ModelSerializer):
    """
    Serializer for updating user profile settings.
    """
    class Meta:
        model = User
        fields = [
            'first_name',
            'last_name',
            'preferred_language',
            'default_container',
            'default_hw_backend',
            'default_quality_preset',
        ]
