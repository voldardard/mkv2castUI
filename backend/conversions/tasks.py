"""
Celery tasks for video conversion.

Uses mkv2cast as a Python library for conversion with progress callbacks.
Reference: https://voldardard.github.io/mkv2cast/usage/python-api.html
"""
from pathlib import Path

from celery import shared_task
from celery.exceptions import Ignore
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from django.utils import timezone
from django.conf import settings

from .models import ConversionJob, ConversionLog

# Import mkv2cast library
try:
    from mkv2cast import convert_file, Config, decide_for, pick_backend
    MKV2CAST_AVAILABLE = True
except ImportError:
    MKV2CAST_AVAILABLE = False


def send_progress_update(
    job_id: str,
    progress: int,
    status: str,
    stage: str = '',
    eta: int = None,
    error: str = '',
    speed: float = None,
    fps: float = None,
    bitrate: str = None
):
    """
    Send progress update via WebSocket to connected clients.
    
    Args:
        job_id: The job ID
        progress: Progress percentage (0-100)
        status: Job status
        stage: Current processing stage
        eta: Estimated time remaining in seconds
        error: Error message if failed
        speed: Encoding speed multiplier (e.g., 1.5x means 1.5 times realtime)
        fps: Current encoding frames per second
        bitrate: Current output bitrate (e.g., "5.2M")
    """
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f'conversion_{job_id}',
        {
            'type': 'conversion_progress',
            'progress': progress,
            'status': status,
            'stage': stage,
            'eta': eta,
            'error': error,
            'speed': speed,
            'fps': fps,
            'bitrate': bitrate,
        }
    )


def add_log(job: ConversionJob, level: str, message: str):
    """Add a log entry for the job."""
    ConversionLog.objects.create(job=job, level=level, message=message)


def create_progress_callback(job_id: str, job: ConversionJob):
    """
    Create a progress callback function for mkv2cast.
    
    This callback is called by mkv2cast during conversion with progress updates.
    It maps mkv2cast stages to our UI status and sends WebSocket updates.
    """
    last_progress = [0]  # Use list to allow modification in closure
    
    def on_progress(filepath: Path, progress: dict):  # noqa: ARG001 - filepath required by callback signature
        """Progress callback called by mkv2cast."""
        stage = progress.get('stage', 'unknown')
        percent = progress.get('progress_percent', 0)
        fps = progress.get('fps')
        eta = progress.get('eta_seconds')
        speed_str = progress.get('speed', '')
        bitrate = progress.get('bitrate', '')
        
        # Convert speed "2.5x" string to float
        speed = None
        if speed_str:
            if isinstance(speed_str, (int, float)):
                speed = float(speed_str)
            elif isinstance(speed_str, str) and speed_str.endswith('x'):
                try:
                    speed = float(speed_str[:-1])
                except ValueError:
                    pass
        
        # Map mkv2cast stages to UI status
        status_map = {
            'checking': 'analyzing',
            'encoding': 'processing',
            'done': 'completed',
            'skipped': 'completed',
            'failed': 'failed',
        }
        ui_status = status_map.get(stage, 'processing')
        
        # Update job progress in database (only if increased)
        progress_int = int(percent)
        if stage == 'encoding' and progress_int > last_progress[0]:
            last_progress[0] = progress_int
            job.progress = progress_int
            job.save(update_fields=['progress'])
        
        # Check if job was cancelled
        if stage == 'encoding':
            job.refresh_from_db()
            if job.status == 'cancelled':
                # Return False to signal mkv2cast to stop
                # Note: This depends on mkv2cast supporting callback return values
                add_log(job, 'info', 'Conversion cancelled by user')
                raise Ignore()
        
        # Send WebSocket update
        send_progress_update(
            job_id,
            progress=progress_int,
            status=ui_status,
            stage=stage.upper() if stage else job.current_stage,
            eta=int(eta) if eta else None,
            speed=round(speed, 2) if speed else None,
            fps=round(fps, 1) if fps else None,
            bitrate=bitrate if bitrate else None,
        )
    
    return on_progress


def build_mkv2cast_config(job: ConversionJob) -> 'Config':
    """
    Build mkv2cast Config object from job settings.
    
    Uses Config.for_library() for optimal library usage which disables:
    - Progress bars (we use our own via callback)
    - Desktop notifications (we use WebSocket)
    - Rich UI (not needed in Celery worker)
    """
    # Build config kwargs
    config_kwargs = {
        'hw': job.hw_backend,
        'container': job.container,
        'suffix': job.suffix,
        'crf': job.crf,
        'preset': job.preset,
        'abr': job.audio_bitrate,
        # Hardware-specific quality
        'vaapi_qp': job.vaapi_qp,
        'qsv_quality': job.qsv_quality,
        'nvenc_cq': job.nvenc_cq,
        # Codec decisions
        'skip_when_ok': job.skip_when_ok,
        'force_h264': job.force_h264,
        'allow_hevc': job.allow_hevc,
        'force_aac': job.force_aac,
        'keep_surround': job.keep_surround,
        # Integrity
        'integrity_check': job.integrity_check,
        'deep_check': job.deep_check,
    }
    
    # Add audio/subtitle selection if specified
    if job.audio_lang:
        config_kwargs['audio_lang'] = job.audio_lang
    if job.audio_track is not None:
        config_kwargs['audio_track'] = job.audio_track
    if job.subtitle_lang:
        config_kwargs['subtitle_lang'] = job.subtitle_lang
    if job.subtitle_track is not None:
        config_kwargs['subtitle_track'] = job.subtitle_track
    
    config_kwargs['prefer_forced_subs'] = job.prefer_forced_subs
    config_kwargs['no_subtitles'] = job.no_subtitles
    
    # AMD AMF quality (if backend is amf)
    if job.hw_backend == 'amf':
        config_kwargs['amf_quality'] = job.amf_quality
    
    # VAAPI device from settings
    vaapi_device = getattr(settings, 'MKV2CAST_VAAPI_DEVICE', '')
    if vaapi_device:
        config_kwargs['vaapi_device'] = vaapi_device
    
    return Config.for_library(**config_kwargs)


@shared_task(bind=True, max_retries=1)
def run_conversion(self, job_id: str):
    """
    Main Celery task for running video conversion using mkv2cast library.
    
    This task:
    1. Loads the job from database
    2. Analyzes the input file using mkv2cast's decide_for()
    3. Runs conversion using mkv2cast's convert_file() with progress callback
    4. Updates progress via WebSocket
    5. Saves the output file
    """
    if not MKV2CAST_AVAILABLE:
        # Fallback error if mkv2cast is not installed
        try:
            job = ConversionJob.objects.get(id=job_id)
            job.status = 'failed'
            job.error_message = 'mkv2cast library is not installed'
            job.completed_at = timezone.now()
            job.save(update_fields=['status', 'error_message', 'completed_at'])
            send_progress_update(job_id, 0, 'failed', error='mkv2cast library is not installed')
        except ConversionJob.DoesNotExist:
            pass
        return
    
    try:
        job = ConversionJob.objects.get(id=job_id)
    except ConversionJob.DoesNotExist:
        return
    
    # Update status to analyzing
    job.status = 'analyzing'
    job.started_at = timezone.now()
    job.save(update_fields=['status', 'started_at'])
    send_progress_update(job_id, 0, 'analyzing', 'ANALYZING')
    add_log(job, 'info', f'Starting analysis of {job.original_filename}')
    
    try:
        # Get the input file path
        input_path = Path(job.original_file.path)
        
        # Create output directory
        output_dir = Path(settings.MEDIA_ROOT) / 'outputs' / str(job.user.id)
        output_dir.mkdir(parents=True, exist_ok=True)
        
        # Build mkv2cast configuration
        config = build_mkv2cast_config(job)
        
        # Analyze the file using mkv2cast's decide_for()
        add_log(job, 'debug', f'Analyzing file with mkv2cast: {input_path}')
        decision = decide_for(input_path, config)
        
        # Update job with analysis results
        job.video_codec = decision.vcodec if hasattr(decision, 'vcodec') else ''
        job.audio_codec = decision.acodec if hasattr(decision, 'acodec') else ''
        job.needs_video_transcode = decision.need_v if hasattr(decision, 'need_v') else False
        job.needs_audio_transcode = decision.need_a if hasattr(decision, 'need_a') else False
        job.video_reason = decision.reason_v if hasattr(decision, 'reason_v') else ''
        
        # Get duration if available
        if hasattr(decision, 'duration_ms'):
            job.duration_ms = decision.duration_ms
        
        # Determine current stage
        if not job.needs_video_transcode and not job.needs_audio_transcode:
            job.current_stage = 'REMUX'
        elif job.needs_video_transcode and job.needs_audio_transcode:
            job.current_stage = 'TRANSCODE'
        elif job.needs_video_transcode:
            job.current_stage = 'VIDEO'
        else:
            job.current_stage = 'AUDIO'
        
        job.status = 'processing'
        job.save()
        
        add_log(job, 'info', f'Analysis complete: video={job.video_codec}, audio={job.audio_codec}')
        add_log(job, 'info', f'Transcode needed: video={job.needs_video_transcode}, audio={job.needs_audio_transcode}')
        add_log(job, 'info', f'Backend: {pick_backend(config)}')
        
        send_progress_update(job_id, 5, 'processing', job.current_stage)
        
        # Create progress callback
        progress_callback = create_progress_callback(job_id, job)
        
        # Run conversion using mkv2cast library
        add_log(job, 'info', f'Starting conversion with mkv2cast library')
        
        success, output_path, message = convert_file(
            input_path,
            cfg=config,
            output_dir=output_dir,
            progress_callback=progress_callback,
        )
        
        if success:
            if output_path:
                # File was converted
                output_path = Path(output_path)
                output_size = output_path.stat().st_size
                
                # Set the output file path relative to MEDIA_ROOT
                relative_path = output_path.relative_to(Path(settings.MEDIA_ROOT))
                job.output_file.name = str(relative_path)
                job.output_file_size = output_size
                job.status = 'completed'
                job.progress = 100
                job.completed_at = timezone.now()
                job.save()
                
                # Update user storage
                job.user.storage_used += output_size
                job.user.save(update_fields=['storage_used'])
                
                add_log(job, 'info', f'Conversion completed. Output: {output_path.name}, size: {output_size} bytes')
            else:
                # File was skipped (already compatible) OR remuxed
                # For remux operations, mkv2cast may return None for output_path
                # but still create a remuxed file. Check if a remuxed file exists.
                if not job.needs_video_transcode and not job.needs_audio_transcode:
                    # This is a REMUX operation - the output should be the remuxed file
                    # mkv2cast creates the file even if output_path is None
                    # Try to find the expected output file
                    expected_output = output_dir / job.output_filename
                    found_output = None
                    
                    if expected_output.exists():
                        found_output = expected_output
                    else:
                        # Search for any .mkv or .mp4 file in the output directory that matches the job ID
                        # This handles cases where the filename might be slightly different
                        for ext in ['.mkv', '.mp4']:
                            potential_file = output_dir / f"{job.id}{ext}"
                            if potential_file.exists():
                                found_output = potential_file
                                break
                        
                        # If still not found, list all files in output_dir and find the most recent one
                        if not found_output and output_dir.exists():
                            output_files = list(output_dir.glob(f"{job.id}.*"))
                            if output_files:
                                # Get the most recently modified file
                                found_output = max(output_files, key=lambda p: p.stat().st_mtime)
                    
                    if found_output and found_output.exists():
                        output_size = found_output.stat().st_size
                        relative_path = found_output.relative_to(Path(settings.MEDIA_ROOT))
                        job.output_file.name = str(relative_path)
                        job.output_file_size = output_size
                        add_log(job, 'info', f'Remux completed. Output: {found_output.name}, size: {output_size} bytes')
                    else:
                        # If remux file doesn't exist, use original file as output
                        # (file was already compatible, no remux needed)
                        job.output_file = job.original_file
                        job.output_file_size = job.original_file_size
                        add_log(job, 'info', f'File already compatible, using original as output')
                else:
                    # File was skipped (already compatible)
                    job.output_file = job.original_file
                    job.output_file_size = job.original_file_size
                    add_log(job, 'info', f'File skipped (already compatible): {message}')
                
                job.status = 'completed'
                job.progress = 100
                job.completed_at = timezone.now()
                job.save()
                
                # Update user storage for output file
                if job.output_file and job.output_file != job.original_file:
                    job.user.storage_used += job.output_file_size
                    job.user.save(update_fields=['storage_used'])
            
            send_progress_update(job_id, 100, 'completed', 'DONE')
        else:
            # Conversion failed
            job.status = 'failed'
            job.error_message = message or 'Conversion failed'
            job.completed_at = timezone.now()
            job.save(update_fields=['status', 'error_message', 'completed_at'])
            
            add_log(job, 'error', f'Conversion failed: {message}')
            send_progress_update(job_id, 0, 'failed', error=message)
    
    except Ignore:
        # Job was cancelled
        raise
    
    except Exception as e:
        error_msg = str(e)
        job.status = 'failed'
        job.error_message = error_msg
        job.completed_at = timezone.now()
        job.save(update_fields=['status', 'error_message', 'completed_at'])
        
        add_log(job, 'error', f'Conversion failed with exception: {error_msg}')
        send_progress_update(job_id, 0, 'failed', error=error_msg)


def cancel_conversion(task_id: str):
    """
    Cancel a running conversion task.
    """
    from celery.result import AsyncResult
    from mkv2cast_api.celery import app
    
    result = AsyncResult(task_id, app=app)
    result.revoke(terminate=True, signal='SIGTERM')
