"""
Tests for upload-related views (PresignedUploadView, ConfirmUploadView, FileMetadataView, CreateJobFromFileView).
"""
import pytest
from unittest.mock import patch, MagicMock
from rest_framework import status
from django.utils import timezone
from datetime import timedelta

from conversions.models import PendingFile, ConversionJob
from accounts.models import User


@pytest.mark.django_db
class TestPresignedUploadView:
    """Tests for PresignedUploadView."""
    
    @patch('accounts.storage_service.get_storage_service')
    def test_presigned_upload_success(self, mock_get_storage, authenticated_client, user):
        """Test successful presigned URL generation."""
        # Mock storage service
        mock_storage_instance = MagicMock()
        mock_storage_instance.generate_presigned_put_url.return_value = 'https://s3.example.com/upload/test.mkv'
        mock_get_storage.return_value = mock_storage_instance
        
        response = authenticated_client.post(
            '/api/upload/presigned/',
            {'filename': 'video.mkv', 'size': 1024 * 1024},  # 1MB
            format='json'
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert 'file_id' in data
        assert 'upload_url' in data
        assert 'key' in data
        
        # Verify PendingFile was created
        pending = PendingFile.objects.get(id=data['file_id'])
        assert pending.status == 'uploading'
        assert pending.original_filename == 'video.mkv'
        assert pending.file_size == 1024 * 1024
        assert pending.user == user
    
    def test_presigned_upload_invalid_extension(self, authenticated_client):
        """Test that non-MKV files are rejected."""
        response = authenticated_client.post(
            '/api/upload/presigned/',
            {'filename': 'video.mp4', 'size': 1024},
            format='json'
        )
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        data = response.json()
        assert 'Only MKV files are supported' in data['detail']
    
    def test_presigned_upload_storage_limit_exceeded(self, authenticated_client, user):
        """Test that storage limit exceeded is handled."""
        # Set user storage limit to be exceeded
        user.storage_limit = 1000  # 1KB
        user.storage_used = 500  # 500 bytes
        user.save()
        
        response = authenticated_client.post(
            '/api/upload/presigned/',
            {'filename': 'video.mkv', 'size': 1024 * 1024},  # 1MB > remaining
            format='json'
        )
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        data = response.json()
        assert 'Storage limit exceeded' in data['detail']
    
    def test_presigned_upload_missing_filename(self, authenticated_client):
        """Test that missing filename is rejected."""
        response = authenticated_client.post(
            '/api/upload/presigned/',
            {'size': 1024},
            format='json'
        )
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        data = response.json()
        assert 'Filename is required' in data['detail']
    
    def test_presigned_upload_invalid_size(self, authenticated_client):
        """Test that invalid file size is rejected."""
        response = authenticated_client.post(
            '/api/upload/presigned/',
            {'filename': 'video.mkv', 'size': 0},
            format='json'
        )
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        data = response.json()
        assert 'File size is required' in data['detail']


@pytest.mark.django_db
class TestConfirmUploadView:
    """Tests for ConfirmUploadView."""
    
    @patch('conversions.views.analyze_pending_file')
    @patch('accounts.storage_service.get_storage_service')
    def test_confirm_upload_success(self, mock_get_storage, mock_task, authenticated_client, user):
        """Test successful upload confirmation."""
        # Create pending file
        pending = PendingFile.objects.create(
            user=user,
            original_filename='test.mkv',
            file_key='upload/test/test.mkv',
            file_size=1024,
            status='uploading',
        )
        
        # Mock storage service - file exists on first try
        mock_storage_instance = MagicMock()
        mock_storage_instance.file_exists.return_value = True
        mock_get_storage.return_value = mock_storage_instance
        
        response = authenticated_client.post(
            f'/api/upload/{pending.id}/complete/'
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data['status'] == 'analyzing'
        assert data['file_id'] == str(pending.id)
        
        # Verify status was updated
        pending.refresh_from_db()
        assert pending.status == 'analyzing'
        
        # Verify task was queued
        mock_task.delay.assert_called_once_with(str(pending.id))
    
    @patch('accounts.storage_service.get_storage_service')
    def test_confirm_upload_file_not_found_after_retries(self, mock_get_storage, authenticated_client, user):
        """Test that file not found after retries returns error."""
        pending = PendingFile.objects.create(
            user=user,
            original_filename='test.mkv',
            file_key='upload/test/test.mkv',
            file_size=1024,
            status='uploading',
        )
        
        # Mock storage service - file never exists (after retries)
        mock_storage_instance = MagicMock()
        mock_storage_instance.file_exists.return_value = False
        mock_get_storage.return_value = mock_storage_instance
        
        response = authenticated_client.post(
            f'/api/upload/{pending.id}/complete/'
        )
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        data = response.json()
        assert data['code'] == 'file_not_in_storage'
        assert 'File not found in storage after retries' in data['detail']
    
    def test_confirm_upload_wrong_status(self, authenticated_client, user):
        """Test that confirming upload with wrong status fails."""
        pending = PendingFile.objects.create(
            user=user,
            original_filename='test.mkv',
            file_key='upload/test/test.mkv',
            file_size=1024,
            status='ready',  # Already ready, not uploading
        )
        
        response = authenticated_client.post(
            f'/api/upload/{pending.id}/complete/'
        )
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        data = response.json()
        assert data['code'] == 'invalid_status'
        assert 'already in status' in data['detail']
    
    def test_confirm_upload_user_mismatch(self, authenticated_client, user, db):
        """Test that user cannot confirm other user's upload."""
        other_user = User.objects.create_user(
            username='other',
            email='other@example.com',
            password='pass'
        )
        
        pending = PendingFile.objects.create(
            user=other_user,
            original_filename='test.mkv',
            file_key='upload/test/test.mkv',
            file_size=1024,
            status='uploading',
        )
        
        response = authenticated_client.post(
            f'/api/upload/{pending.id}/complete/'
        )
        
        assert response.status_code == status.HTTP_403_FORBIDDEN
        data = response.json()
        assert data['code'] == 'user_mismatch'
    
    def test_confirm_upload_file_not_found(self, authenticated_client, user):
        """Test that non-existent file returns 404."""
        fake_id = '00000000-0000-0000-0000-000000000000'
        response = authenticated_client.post(
            f'/api/upload/{fake_id}/complete/'
        )
        
        assert response.status_code == status.HTTP_404_NOT_FOUND
        data = response.json()
        assert data['code'] == 'file_not_found'


@pytest.mark.django_db
class TestFileMetadataView:
    """Tests for FileMetadataView."""
    
    def test_metadata_analyzing_returns_202(self, authenticated_client, user):
        """Test that analyzing status returns 202."""
        pending = PendingFile.objects.create(
            user=user,
            original_filename='test.mkv',
            file_key='upload/test/test.mkv',
            file_size=1024,
            status='analyzing',
        )
        
        response = authenticated_client.get(
            f'/api/upload/{pending.id}/metadata/'
        )
        
        assert response.status_code == status.HTTP_202_ACCEPTED
        data = response.json()
        assert data['status'] == 'analyzing'
        assert 'message' in data
    
    def test_metadata_uploading_returns_202(self, authenticated_client, user):
        """Test that uploading status returns 202."""
        pending = PendingFile.objects.create(
            user=user,
            original_filename='test.mkv',
            file_key='upload/test/test.mkv',
            file_size=1024,
            status='uploading',
        )
        
        response = authenticated_client.get(
            f'/api/upload/{pending.id}/metadata/'
        )
        
        assert response.status_code == status.HTTP_202_ACCEPTED
        data = response.json()
        assert data['status'] == 'uploading'
    
    def test_metadata_ready_returns_200(self, authenticated_client, user):
        """Test that ready status returns 200 with metadata."""
        metadata = {
            'audio_tracks': [
                {'index': 0, 'ffmpeg_index': 0, 'language': 'eng', 'codec': 'aac', 'channels': 2}
            ],
            'subtitle_tracks': [],
            'video_codec': 'h264',
            'duration': 120.5,
            'width': 1920,
            'height': 1080,
        }
        
        pending = PendingFile.objects.create(
            user=user,
            original_filename='test.mkv',
            file_key='upload/test/test.mkv',
            file_size=1024,
            status='ready',
            metadata=metadata,
        )
        
        response = authenticated_client.get(
            f'/api/upload/{pending.id}/metadata/'
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data['status'] == 'ready'
        assert data['metadata'] == metadata
        assert data['filename'] == 'test.mkv'
        assert data['file_size'] == 1024
    
    def test_metadata_expired_returns_error(self, authenticated_client, user):
        """Test that expired status returns error."""
        pending = PendingFile.objects.create(
            user=user,
            original_filename='test.mkv',
            file_key='upload/test/test.mkv',
            file_size=1024,
            status='expired',
        )
        
        response = authenticated_client.get(
            f'/api/upload/{pending.id}/metadata/'
        )
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        data = response.json()
        assert data['status'] == 'error'
        assert data['code'] == 'analysis_failed'
    
    def test_metadata_file_not_found(self, authenticated_client):
        """Test that non-existent file returns 404."""
        fake_id = '00000000-0000-0000-0000-000000000000'
        response = authenticated_client.get(
            f'/api/upload/{fake_id}/metadata/'
        )
        
        assert response.status_code == status.HTTP_404_NOT_FOUND
        data = response.json()
        assert data['code'] == 'file_not_found'
    
    def test_metadata_user_mismatch(self, authenticated_client, user, db):
        """Test that user cannot access other user's metadata."""
        other_user = User.objects.create_user(
            username='other',
            email='other@example.com',
            password='pass'
        )
        
        pending = PendingFile.objects.create(
            user=other_user,
            original_filename='test.mkv',
            file_key='upload/test/test.mkv',
            file_size=1024,
            status='ready',
        )
        
        response = authenticated_client.get(
            f'/api/upload/{pending.id}/metadata/'
        )
        
        assert response.status_code == status.HTTP_403_FORBIDDEN
        data = response.json()
        assert data['code'] == 'user_mismatch'


@pytest.mark.django_db
class TestCreateJobFromFileView:
    """Tests for CreateJobFromFileView."""
    
    @patch('conversions.views.run_conversion')
    def test_create_job_success(self, mock_task, authenticated_client, user):
        """Test successful job creation from pending file."""
        metadata = {
            'audio_tracks': [
                {
                    'index': 0,
                    'ffmpeg_index': 0,
                    'language': 'eng',
                    'codec': 'aac',
                    'channels': 2,
                    'default': True,
                }
            ],
            'subtitle_tracks': [],
            'video_codec': 'h264',
        }
        
        pending = PendingFile.objects.create(
            user=user,
            original_filename='test.mkv',
            file_key='upload/test/test.mkv',
            file_size=1024,
            status='ready',
            metadata=metadata,
        )
        
        # Mock Celery task
        mock_task.delay.return_value.id = 'mock-task-id'
        
        # Minimal required options
        options = {
            'container': 'mp4',
        }
        
        response = authenticated_client.post(
            '/api/jobs/create-from-file/',
            {
                'file_id': str(pending.id),
                'options': options,
            },
            format='json'
        )
        
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert 'id' in data
        
        # Verify job was created
        job = ConversionJob.objects.get(id=data['id'])
        assert job.pending_file == pending
        assert job.container == 'mp4'
        assert job.status == 'queued'
        
        # Verify pending file was marked as used
        pending.refresh_from_db()
        assert pending.status == 'used'
        
        # Verify task was queued
        mock_task.delay.assert_called_once()
    
    def test_create_job_file_not_ready(self, authenticated_client, user):
        """Test that job creation fails if file is not ready."""
        pending = PendingFile.objects.create(
            user=user,
            original_filename='test.mkv',
            file_key='upload/test/test.mkv',
            file_size=1024,
            status='analyzing',  # Not ready
        )
        
        response = authenticated_client.post(
            '/api/jobs/create-from-file/',
            {
                'file_id': str(pending.id),
                'options': {'container': 'mp4'},
            },
            format='json'
        )
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        data = response.json()
        assert 'not ready' in data['detail'].lower() or 'status' in data['detail'].lower()
    
    def test_create_job_file_not_found(self, authenticated_client):
        """Test that job creation fails if file doesn't exist."""
        fake_id = '00000000-0000-0000-0000-000000000000'
        response = authenticated_client.post(
            '/api/jobs/create-from-file/',
            {
                'file_id': fake_id,
                'options': {'container': 'mp4'},
            },
            format='json'
        )
        
        assert response.status_code == status.HTTP_404_NOT_FOUND
        data = response.json()
        assert 'not found' in data['detail'].lower()
    
    def test_create_job_user_mismatch(self, authenticated_client, user, db):
        """Test that user cannot create job from other user's file."""
        other_user = User.objects.create_user(
            username='other',
            email='other@example.com',
            password='pass'
        )
        
        pending = PendingFile.objects.create(
            user=other_user,
            original_filename='test.mkv',
            file_key='upload/test/test.mkv',
            file_size=1024,
            status='ready',
        )
        
        response = authenticated_client.post(
            '/api/jobs/create-from-file/',
            {
                'file_id': str(pending.id),
                'options': {'container': 'mp4'},
            },
            format='json'
        )
        
        # CreateJobFromFileView uses get(id=file_id, user=request.user) which returns 404 if user doesn't match
        assert response.status_code == status.HTTP_404_NOT_FOUND
        data = response.json()
        assert 'not found' in data['detail'].lower()
    
    @patch('conversions.views.run_conversion')
    def test_create_job_uses_default_tracks_from_metadata(self, mock_task, authenticated_client, user):
        """Test that job creation uses default tracks from metadata if not specified."""
        metadata = {
            'audio_tracks': [
                {
                    'index': 0,
                    'ffmpeg_index': 0,
                    'language': 'fre',
                    'codec': 'aac',
                    'channels': 2,
                    'default': True,
                },
                {
                    'index': 1,
                    'ffmpeg_index': 1,
                    'language': 'eng',
                    'codec': 'aac',
                    'channels': 2,
                    'default': False,
                }
            ],
            'subtitle_tracks': [
                {
                    'index': 0,
                    'ffmpeg_index': 2,
                    'language': 'fre',
                    'codec': 'srt',
                    'forced': False,
                    'default': True,
                }
            ],
        }
        
        pending = PendingFile.objects.create(
            user=user,
            original_filename='test.mkv',
            file_key='upload/test/test.mkv',
            file_size=1024,
            status='ready',
            metadata=metadata,
        )
        
        # Mock Celery task
        mock_task.delay.return_value.id = 'mock-task-id'
        
        # Don't specify audio_track or subtitle_track - should use defaults
        response = authenticated_client.post(
            '/api/jobs/create-from-file/',
            {
                'file_id': str(pending.id),
                'options': {'container': 'mp4'},
            },
            format='json'
        )
        
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        job = ConversionJob.objects.get(id=data['id'])
        
        # Should use default tracks (ffmpeg_index 0 for audio, 2 for subtitle)
        assert job.audio_track == 0
        assert job.subtitle_track == 2
