"""
Pytest fixtures for mkv2castUI tests.
"""
import os
import tempfile
from unittest.mock import MagicMock, patch

import pytest
from django.conf import settings
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient

from accounts.models import User
from conversions.models import ConversionJob


@pytest.fixture(autouse=True)
def enable_db_access_for_all_tests(db):
    """Enable database access for all tests."""
    pass


@pytest.fixture
def api_client():
    """Return an API client for testing."""
    return APIClient()


@pytest.fixture
def user(db):
    """Create a test user."""
    return User.objects.create_user(
        username='testuser',
        email='test@example.com',
        password='testpass123',
        subscription_tier='free',
        max_concurrent_jobs=1,
        max_file_size=2 * 1024 * 1024 * 1024,  # 2GB
        monthly_conversion_limit=10,
    )


@pytest.fixture
def pro_user(db):
    """Create a pro tier test user."""
    return User.objects.create_user(
        username='prouser',
        email='pro@example.com',
        password='testpass123',
        subscription_tier='pro',
        max_concurrent_jobs=5,
        max_file_size=10 * 1024 * 1024 * 1024,  # 10GB
        monthly_conversion_limit=100,
    )


@pytest.fixture
def enterprise_user(db):
    """Create an enterprise tier test user."""
    return User.objects.create_user(
        username='enterprise',
        email='enterprise@example.com',
        password='testpass123',
        subscription_tier='enterprise',
        max_concurrent_jobs=999,
        max_file_size=50 * 1024 * 1024 * 1024,  # 50GB
        monthly_conversion_limit=999999,
    )


@pytest.fixture
def local_user(db):
    """Create or get the local anonymous user."""
    user, _ = User.objects.get_or_create(
        username='local_user',
        defaults={
            'email': 'local@mkv2cast.local',
            'subscription_tier': 'enterprise',
            'max_concurrent_jobs': 999,
            'max_file_size': 1024 * 1024 * 1024 * 1024,  # 1TB
            'monthly_conversion_limit': 999999,
        }
    )
    return user


@pytest.fixture
def authenticated_client(api_client, user):
    """Return an authenticated API client."""
    api_client.force_authenticate(user=user)
    return api_client


@pytest.fixture
def pro_authenticated_client(pro_user):
    """Return an authenticated API client for pro user."""
    client = APIClient()
    client.force_authenticate(user=pro_user)
    return client


@pytest.fixture
def sample_video_file():
    """Create a sample video file for testing."""
    content = b'\x00' * 1024  # 1KB dummy content
    return SimpleUploadedFile(
        'test_video.mkv',
        content,
        content_type='video/x-matroska'
    )


@pytest.fixture
def conversion_job(db, user, sample_video_file):
    """Create a sample conversion job."""
    job = ConversionJob.objects.create(
        user=user,
        original_filename='test_video.mkv',
        original_file_size=1024,
        status='pending',
        container='mp4',
        hw_backend='auto',
        crf=23,
        preset='medium',
        audio_bitrate='192k',
    )
    return job


@pytest.fixture
def completed_job(db, user):
    """Create a completed conversion job."""
    job = ConversionJob.objects.create(
        user=user,
        original_filename='completed_video.mkv',
        original_file_size=1024 * 1024,
        status='completed',
        container='mp4',
        hw_backend='cpu',
        crf=23,
        preset='medium',
        audio_bitrate='192k',
        progress=100,
        output_file_size=512 * 1024,
    )
    return job


@pytest.fixture
def mock_ffprobe():
    """Mock ffprobe for file analysis."""
    mock_result = MagicMock()
    mock_result.returncode = 0
    mock_result.stdout = '''{
        "format": {"duration": "120.5"},
        "streams": [
            {"codec_type": "video", "codec_name": "hevc"},
            {"codec_type": "audio", "codec_name": "ac3"}
        ]
    }'''
    
    with patch('subprocess.run', return_value=mock_result):
        yield


@pytest.fixture
def mock_ffmpeg():
    """Mock ffmpeg for conversion."""
    mock_process = MagicMock()
    mock_process.returncode = 0
    mock_process.stdout = iter([
        'out_time_ms=1000000\n',
        'out_time_ms=60000000\n',
        'out_time_ms=120000000\n',
    ])
    mock_process.wait = MagicMock()
    
    with patch('subprocess.Popen', return_value=mock_process):
        yield mock_process


@pytest.fixture
def temp_media_dir():
    """Create a temporary media directory for tests."""
    with tempfile.TemporaryDirectory() as tmpdir:
        old_media_root = settings.MEDIA_ROOT
        settings.MEDIA_ROOT = tmpdir
        os.makedirs(os.path.join(tmpdir, 'uploads'), exist_ok=True)
        os.makedirs(os.path.join(tmpdir, 'outputs'), exist_ok=True)
        yield tmpdir
        settings.MEDIA_ROOT = old_media_root


@pytest.fixture
def disable_auth():
    """Temporarily disable authentication requirement."""
    old_value = settings.REQUIRE_AUTH
    settings.REQUIRE_AUTH = False
    yield
    settings.REQUIRE_AUTH = old_value


@pytest.fixture
def enable_auth():
    """Temporarily enable authentication requirement."""
    old_value = settings.REQUIRE_AUTH
    settings.REQUIRE_AUTH = True
    yield
    settings.REQUIRE_AUTH = old_value
