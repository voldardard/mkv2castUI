"""
Tests for conversions views.
"""
import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status

from conversions.models import ConversionJob


class TestJobListView:
    """Tests for job list endpoint."""
    
    def test_list_jobs_empty(self, authenticated_client):
        """Test listing jobs when none exist."""
        response = authenticated_client.get('/api/jobs/')
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        # Handle both paginated and non-paginated responses
        jobs = data.get('results', data) if isinstance(data, dict) else data
        assert jobs == [] or len(jobs) == 0
    
    def test_list_jobs_with_jobs(self, authenticated_client, conversion_job):
        """Test listing jobs when jobs exist."""
        response = authenticated_client.get('/api/jobs/')
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        # Handle paginated or non-paginated response
        jobs = data.get('results', data) if isinstance(data, dict) else data
        assert len(jobs) >= 1
    
    def test_list_jobs_only_own_jobs(self, authenticated_client, pro_authenticated_client, conversion_job, user, pro_user, db):
        """Test that users only see their own jobs."""
        # Create a job for pro user
        pro_job = ConversionJob.objects.create(
            user=pro_user,
            original_filename='pro_test.mkv',
            original_file_size=1024,
        )
        
        # Regular user should only see their job
        response = authenticated_client.get('/api/jobs/')
        data = response.json()
        jobs = data.get('results', data) if isinstance(data, dict) else data
        
        job_ids = [str(j['id']) for j in jobs]
        assert str(conversion_job.id) in job_ids
        assert str(pro_job.id) not in job_ids


class TestJobDetailView:
    """Tests for job detail endpoint."""
    
    def test_get_job_detail(self, authenticated_client, conversion_job):
        """Test getting job details."""
        response = authenticated_client.get(f'/api/jobs/{conversion_job.id}/')
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data['original_filename'] == 'test_video.mkv'
    
    def test_get_nonexistent_job(self, authenticated_client):
        """Test getting a non-existent job."""
        import uuid
        fake_id = uuid.uuid4()
        response = authenticated_client.get(f'/api/jobs/{fake_id}/')
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    def test_get_other_users_job(self, authenticated_client, pro_user, db):
        """Test that users cannot access other users' jobs."""
        other_job = ConversionJob.objects.create(
            user=pro_user,
            original_filename='other.mkv',
            original_file_size=1024,
        )
        response = authenticated_client.get(f'/api/jobs/{other_job.id}/')
        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestJobDeleteView:
    """Tests for job deletion endpoint."""
    
    def test_delete_job(self, authenticated_client, completed_job):
        """Test deleting a completed job."""
        job_id = completed_job.id
        response = authenticated_client.delete(f'/api/jobs/{job_id}/')
        assert response.status_code == status.HTTP_204_NO_CONTENT
        
        # Verify job is deleted
        assert not ConversionJob.objects.filter(id=job_id).exists()


class TestJobCancelView:
    """Tests for job cancellation endpoint."""
    
    def test_cancel_pending_job(self, authenticated_client, conversion_job):
        """Test cancelling a pending job."""
        response = authenticated_client.post(f'/api/jobs/{conversion_job.id}/cancel/')
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_204_NO_CONTENT]
        
        conversion_job.refresh_from_db()
        assert conversion_job.status == 'cancelled'
    
    def test_cancel_completed_job(self, authenticated_client, completed_job):
        """Test that completed jobs cannot be cancelled."""
        response = authenticated_client.post(f'/api/jobs/{completed_job.id}/cancel/')
        # Should return error
        assert response.status_code == status.HTTP_400_BAD_REQUEST


class TestOptionsView:
    """Tests for conversion options endpoint."""
    
    def test_get_options(self, authenticated_client):
        """Test getting available conversion options."""
        response = authenticated_client.get('/api/options/')
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        # Should include various option categories
        assert 'containers' in data
        assert 'hw_backends' in data
        assert 'presets' in data


class TestUploadView:
    """Tests for file upload endpoint."""
    
    def test_upload_requires_file(self, authenticated_client):
        """Test that upload requires a file."""
        response = authenticated_client.post('/api/upload/', {})
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_upload_requires_mkv_file(self, authenticated_client):
        """Test that upload only accepts MKV files."""
        video_content = b'\x00' * 1024
        video_file = SimpleUploadedFile(
            'test.mp4',  # Wrong extension
            video_content,
            content_type='video/mp4'
        )
        
        response = authenticated_client.post(
            '/api/upload/',
            {'file': video_file},
            format='multipart'
        )
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST


class TestUserStatsView:
    """Tests for user stats endpoint."""
    
    def test_get_stats(self, authenticated_client):
        """Test getting user stats."""
        response = authenticated_client.get('/api/stats/')
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        assert 'total_jobs' in data
        assert 'completed_jobs' in data
        assert 'storage_used' in data
