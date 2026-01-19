"""
URL patterns for conversions API.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'jobs', views.ConversionJobViewSet, basename='job')

urlpatterns = [
    path('', include(router.urls)),
    path('upload/', views.FileUploadView.as_view(), name='file-upload'),
    path('options/', views.conversion_options, name='conversion-options'),
    path('stats/', views.user_stats, name='user-stats'),
    # Add download route with filename in URL for better browser compatibility
    # This allows URLs like /api/jobs/{id}/download/filename.mkv
    # The filename is optional and validated in the view
    path('jobs/<uuid:pk>/download/<path:filename>', views.ConversionJobViewSet.as_view({'get': 'download'}), name='job-download-with-filename'),
]
