"""
mkv2cast API - Django backend for mkv2castUI.
"""
from .celery import app as celery_app

__all__ = ('celery_app',)
