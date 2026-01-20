"""
WebSocket URL routing for conversions app.
"""
from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    # Single job progress tracking
    re_path(
        r'ws/conversion/(?P<job_id>[0-9a-f-]+)/$',
        consumers.ConversionProgressConsumer.as_asgi()
    ),
    # User's jobs list tracking
    re_path(
        r'ws/jobs/$',
        consumers.UserJobsConsumer.as_asgi()
    ),
    # Pending file analysis progress tracking
    re_path(
        r'ws/pending-file/(?P<file_id>[0-9a-f-]+)/$',
        consumers.PendingFileProgressConsumer.as_asgi()
    ),
]
