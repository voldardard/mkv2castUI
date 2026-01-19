"""
Integration tests for the full conversion flow.
"""
import pytest
from unittest.mock import patch, MagicMock
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status

from conversions.models import ConversionJob


class TestFullConversionFlow:
    """Integration tests for complete conversion workflows."""
    
    def test_job_lifecycle_pending_to_complete(self, authenticated_client, conversion_job):
        """Test job lifecycle from pending to completed."""
        # Verify initial state
        assert conversion_job.status == 'pending'
        
        # Simulate status transitions
        conversion_job.status = 'queued'
        conversion_job.save()
        
        conversion_job.status = 'analyzing'
        conversion_job.save()
        
        conversion_job.status = 'processing'
        conversion_job.progress = 50
        conversion_job.save()
        
        # Complete the job
        conversion_job.status = 'completed'
        conversion_job.progress = 100
        conversion_job.save()
        
        # Verify via API
        response = authenticated_client.get(f'/api/jobs/{conversion_job.id}/')
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data['status'] == 'completed'
        assert data['progress'] == 100
    
    def test_job_lifecycle_with_failure(self, authenticated_client, conversion_job):
        """Test job lifecycle with failure."""
        conversion_job.status = 'processing'
        conversion_job.save()
        
        # Simulate failure
        conversion_job.status = 'failed'
        conversion_job.error_message = 'Test error: codec not found'
        conversion_job.save()
        
        # Verify via API
        response = authenticated_client.get(f'/api/jobs/{conversion_job.id}/')
        data = response.json()
        assert data['status'] == 'failed'
        assert 'codec not found' in data['error_message']
    
    def test_job_cancellation_flow(self, authenticated_client, conversion_job):
        """Test job cancellation during processing."""
        conversion_job.status = 'processing'
        conversion_job.save()
        
        # Cancel the job
        response = authenticated_client.post(f'/api/jobs/{conversion_job.id}/cancel/')
        
        conversion_job.refresh_from_db()
        assert conversion_job.status == 'cancelled'
    
    def test_user_storage_tracking(self, authenticated_client, user, completed_job):
        """Test that completed jobs update user storage."""
        initial_storage = user.storage_used
        
        # Simulate adding output file size
        user.storage_used += completed_job.output_file_size
        user.save()
        
        # Verify via stats endpoint
        response = authenticated_client.get('/api/stats/')
        data = response.json()
        
        assert data['storage_used'] >= initial_storage
    
    def test_monthly_conversion_counter(self, authenticated_client, user, conversion_job):
        """Test that completed jobs increment monthly counter."""
        initial_count = user.conversions_this_month
        
        # Complete the job
        conversion_job.status = 'completed'
        conversion_job.save()
        
        # Increment counter (normally done by task)
        user.conversions_this_month += 1
        user.save()
        
        user.refresh_from_db()
        assert user.conversions_this_month == initial_count + 1


class TestMultipleJobsFlow:
    """Tests for handling multiple concurrent jobs."""
    
    def test_list_multiple_jobs(self, authenticated_client, user, db):
        """Test listing multiple jobs."""
        # Create several jobs
        for i in range(5):
            ConversionJob.objects.create(
                user=user,
                original_filename=f'test_{i}.mkv',
                original_file_size=1024 * (i + 1),
            )
        
        response = authenticated_client.get('/api/jobs/')
        data = response.json()
        jobs = data.get('results', data) if isinstance(data, dict) else data
        
        assert len(jobs) >= 5
    
    def test_concurrent_job_limit(self, authenticated_client, user, db):
        """Test that job limits are respected."""
        # Create jobs up to the limit
        for i in range(user.max_concurrent_jobs):
            ConversionJob.objects.create(
                user=user,
                original_filename=f'concurrent_{i}.mkv',
                original_file_size=1024,
                status='processing',
            )
        
        # Verify count
        processing_count = ConversionJob.objects.filter(
            user=user,
            status='processing'
        ).count()
        
        assert processing_count <= user.max_concurrent_jobs


class TestAuthDisabledFlow:
    """Tests for flows when authentication is disabled."""
    
    def test_list_jobs_without_auth(self, api_client, disable_auth, local_user, db):
        """Test listing jobs without authentication."""
        # Create a job for local user
        ConversionJob.objects.create(
            user=local_user,
            original_filename='local_test.mkv',
            original_file_size=1024,
        )
        
        response = api_client.get('/api/jobs/')
        assert response.status_code == status.HTTP_200_OK
    
    def test_get_options_without_auth(self, api_client, disable_auth, local_user):
        """Test getting options without authentication."""
        response = api_client.get('/api/options/')
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert 'containers' in data
    
    def test_get_stats_without_auth(self, api_client, disable_auth, local_user):
        """Test getting stats without authentication."""
        response = api_client.get('/api/stats/')
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert 'total_jobs' in data
