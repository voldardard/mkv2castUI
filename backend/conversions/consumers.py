"""
WebSocket consumers for real-time conversion progress updates.
"""
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model


class ConversionProgressConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for tracking conversion job progress.
    
    Clients connect to: /ws/conversion/{job_id}/
    
    Messages sent to clients:
    {
        "type": "progress",
        "progress": 45,
        "status": "processing",
        "stage": "TRANSCODE",
        "eta": 120,  // seconds remaining
        "error": ""
    }
    """

    async def connect(self):
        """Handle WebSocket connection."""
        self.job_id = self.scope['url_route']['kwargs']['job_id']
        self.room_group_name = f'conversion_{self.job_id}'
        
        # Verify user owns this job
        user = self.scope.get('user')
        if user and user.is_authenticated:
            owns_job = await self.user_owns_job(user, self.job_id)
            if not owns_job:
                await self.close(code=4003)
                return
        
        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        await self.accept()
        
        # Send current job status
        job_status = await self.get_job_status(self.job_id)
        if job_status:
            await self.send(text_data=json.dumps({
                'type': 'status',
                **job_status
            }))

    async def disconnect(self, close_code):
        """Handle WebSocket disconnection."""
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        """
        Handle incoming messages from WebSocket.
        
        Supported commands:
        - {"action": "status"} - Request current status
        - {"action": "cancel"} - Cancel the job
        """
        try:
            data = json.loads(text_data)
            action = data.get('action')
            
            if action == 'status':
                job_status = await self.get_job_status(self.job_id)
                if job_status:
                    await self.send(text_data=json.dumps({
                        'type': 'status',
                        **job_status
                    }))
            
            elif action == 'cancel':
                user = self.scope.get('user')
                if user and user.is_authenticated:
                    success = await self.cancel_job(self.job_id, user)
                    await self.send(text_data=json.dumps({
                        'type': 'cancel_response',
                        'success': success
                    }))
        
        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Invalid JSON'
            }))

    async def conversion_progress(self, event):
        """
        Handle conversion progress updates from Celery tasks.
        
        This method is called when a message is sent to the group.
        """
        await self.send(text_data=json.dumps({
            'type': 'progress',
            'progress': event.get('progress', 0),
            'status': event.get('status', 'unknown'),
            'stage': event.get('stage', ''),
            'eta': event.get('eta'),
            'error': event.get('error', ''),
        }))

    @database_sync_to_async
    def user_owns_job(self, user, job_id):
        """Check if user owns the job."""
        from .models import ConversionJob
        return ConversionJob.objects.filter(id=job_id, user=user).exists()

    @database_sync_to_async
    def get_job_status(self, job_id):
        """Get current job status from database."""
        from .models import ConversionJob
        try:
            job = ConversionJob.objects.get(id=job_id)
            return {
                'progress': job.progress,
                'status': job.status,
                'stage': job.current_stage,
                'eta': job.eta_seconds,
                'error': job.error_message,
            }
        except ConversionJob.DoesNotExist:
            return None

    @database_sync_to_async
    def cancel_job(self, job_id, user):
        """Cancel a job if user owns it."""
        from .models import ConversionJob
        try:
            job = ConversionJob.objects.get(id=job_id, user=user)
            if job.status in ('pending', 'queued', 'processing', 'analyzing'):
                job.cancel()
                return True
            return False
        except ConversionJob.DoesNotExist:
            return False


class UserJobsConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for tracking all jobs for a user.
    
    Clients connect to: /ws/jobs/
    
    Broadcasts updates when any of the user's jobs change status.
    """

    async def connect(self):
        """Handle WebSocket connection."""
        user = self.scope.get('user')
        
        if not user or not user.is_authenticated:
            await self.close(code=4001)
            return
        
        self.user_id = user.id
        self.room_group_name = f'user_jobs_{self.user_id}'
        
        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        await self.accept()
        
        # Send current jobs list
        jobs = await self.get_user_jobs(user)
        await self.send(text_data=json.dumps({
            'type': 'jobs_list',
            'jobs': jobs
        }))

    async def disconnect(self, close_code):
        """Handle WebSocket disconnection."""
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )

    async def receive(self, text_data):
        """Handle incoming messages."""
        try:
            data = json.loads(text_data)
            action = data.get('action')
            
            if action == 'refresh':
                user = self.scope.get('user')
                jobs = await self.get_user_jobs(user)
                await self.send(text_data=json.dumps({
                    'type': 'jobs_list',
                    'jobs': jobs
                }))
        
        except json.JSONDecodeError:
            pass

    async def job_update(self, event):
        """Handle job update notifications."""
        await self.send(text_data=json.dumps({
            'type': 'job_update',
            'job': event.get('job'),
        }))

    @database_sync_to_async
    def get_user_jobs(self, user):
        """Get all jobs for user."""
        from .models import ConversionJob
        from .serializers import ConversionJobListSerializer
        
        jobs = ConversionJob.objects.filter(user=user).order_by('-created_at')[:50]
        return ConversionJobListSerializer(jobs, many=True).data


class PendingFileProgressConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for tracking pending file analysis progress.
    
    Clients connect to: /ws/pending-file/{file_id}/
    
    Messages sent to clients:
    {
        "type": "pending_file_progress",
        "progress": 45,
        "status": "analyzing",
        "stage": "DOWNLOADING",
        "message": "Downloading file from storage",
        "eta_seconds": 30,
        "eta_breakdown": {
            "download_eta": 25,
            "analysis_eta": 5,
            "total_eta": 30
        },
        "download_speed_mbps": 10.5
    }
    """

    async def connect(self):
        """Handle WebSocket connection."""
        self.file_id = self.scope['url_route']['kwargs']['file_id']
        self.room_group_name = f'pending_file_{self.file_id}'
        
        # Verify user owns this pending file
        user = self.scope.get('user')
        if user and user.is_authenticated:
            owns_file = await self.user_owns_file(user, self.file_id)
            if not owns_file:
                await self.close(code=4003)
                return
        
        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        await self.accept()
        
        # Send current file status
        file_status = await self.get_file_status(self.file_id)
        if file_status:
            await self.send(text_data=json.dumps({
                'type': 'status',
                **file_status
            }))

    async def disconnect(self, close_code):
        """Handle WebSocket disconnection."""
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        """
        Handle incoming messages from WebSocket.
        
        Supported commands:
        - {"action": "status"} - Request current status
        """
        try:
            data = json.loads(text_data)
            action = data.get('action')
            
            if action == 'status':
                file_status = await self.get_file_status(self.file_id)
                if file_status:
                    await self.send(text_data=json.dumps({
                        'type': 'status',
                        **file_status
                    }))
        
        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Invalid JSON'
            }))

    async def pending_file_progress(self, event):
        """
        Handle pending file progress updates from Celery tasks.
        
        This method is called when a message is sent to the group.
        """
        await self.send(text_data=json.dumps({
            'type': 'progress',
            'progress': event.get('progress', 0),
            'status': event.get('status', 'unknown'),
            'stage': event.get('stage', ''),
            'message': event.get('message', ''),
            'eta_seconds': event.get('eta_seconds'),
            'eta_breakdown': event.get('eta_breakdown', {}),
            'download_speed_mbps': event.get('download_speed_mbps'),
        }))

    @database_sync_to_async
    def user_owns_file(self, user, file_id):
        """Check if user owns the pending file."""
        from .models import PendingFile
        return PendingFile.objects.filter(id=file_id, user=user).exists()

    @database_sync_to_async
    def get_file_status(self, file_id):
        """Get current pending file status from database."""
        from .models import PendingFile
        try:
            pending_file = PendingFile.objects.get(id=file_id)
            return {
                'status': pending_file.status,
                'progress': 100 if pending_file.status == 'ready' else 0,
                'metadata': pending_file.metadata if pending_file.status == 'ready' else None,
            }
        except PendingFile.DoesNotExist:
            return None
