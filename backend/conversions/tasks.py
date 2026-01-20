"""
Celery tasks for video conversion.

Uses mkv2cast as a Python library for conversion with progress callbacks.
Reference: https://voldardard.github.io/mkv2cast/usage/python-api.html
"""
import json
import os
import subprocess
import tempfile
from pathlib import Path

from celery import shared_task
from celery.exceptions import Ignore
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from django.utils import timezone
from django.conf import settings

from .models import ConversionJob, ConversionLog, PendingFile
from accounts.storage_service import get_storage_service

# Import mkv2cast library
try:
    from mkv2cast import convert_file, Config, decide_for, pick_backend
    MKV2CAST_AVAILABLE = True
except ImportError:
    MKV2CAST_AVAILABLE = False

# Cache for downloaded files (file_id -> local_path)
# This allows reusing downloaded files between analysis and conversion
_downloaded_files_cache = {}


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


def calculate_eta(file_size_bytes: int, bytes_downloaded: int = 0, elapsed_time: float = 0, 
                  download_speed_mbps: float = None) -> dict:
    """
    Calculate ETA for file download and analysis.
    
    Args:
        file_size_bytes: Total file size in bytes
        bytes_downloaded: Bytes downloaded so far (0 if not started)
        elapsed_time: Time elapsed in seconds
        download_speed_mbps: Current download speed in Mbps (optional)
    
    Returns:
        Dict with eta_seconds, eta_breakdown, download_speed_mbps
    """
    file_size_mb = file_size_bytes / (1024 * 1024)
    
    # Estimate analysis time based on file size
    # Rough estimate: ~1-2s for small files (<100MB), ~3-5s for larger files
    if file_size_mb < 100:
        analysis_eta = 2
    elif file_size_mb < 500:
        analysis_eta = 3
    elif file_size_mb < 1000:
        analysis_eta = 4
    else:
        analysis_eta = 5
    
    # Calculate download ETA
    download_eta = None
    speed = download_speed_mbps
    
    if bytes_downloaded > 0 and elapsed_time > 0:
        # Calculate speed from progress
        speed = (bytes_downloaded / elapsed_time) / (1024 * 1024)  # Mbps
        remaining_bytes = file_size_bytes - bytes_downloaded
        if speed > 0:
            download_eta = remaining_bytes / (speed * 1024 * 1024)  # seconds
    elif download_speed_mbps and download_speed_mbps > 0:
        # Use provided speed
        speed = download_speed_mbps
        download_eta = file_size_mb / speed  # seconds
    
    # Total ETA
    total_eta = None
    if download_eta is not None:
        total_eta = download_eta + analysis_eta
    elif analysis_eta:
        total_eta = analysis_eta
    
    return {
        'eta_seconds': int(total_eta) if total_eta else None,
        'eta_breakdown': {
            'download_eta': int(download_eta) if download_eta else None,
            'analysis_eta': int(analysis_eta),
            'total_eta': int(total_eta) if total_eta else None,
        },
        'download_speed_mbps': round(speed, 2) if speed else None,
    }


def send_pending_file_update(
    file_id: str,
    progress: int,
    status: str,
    stage: str = '',
    message: str = '',
    eta_info: dict = None
):
    """
    Send progress update for pending file analysis via WebSocket.
    
    Args:
        file_id: The pending file ID
        progress: Progress percentage (0-100)
        status: File status (analyzing, ready, error)
        stage: Current processing stage (DOWNLOADING, ANALYZING, etc.)
        message: Optional message
        eta_info: Optional dict with eta_seconds, eta_breakdown, download_speed_mbps
    """
    channel_layer = get_channel_layer()
    payload = {
        'type': 'pending_file_progress',
        'progress': progress,
        'status': status,
        'stage': stage,
        'message': message,
    }
    
    # Add ETA info if provided
    if eta_info:
        payload['eta_seconds'] = eta_info.get('eta_seconds')
        payload['eta_breakdown'] = eta_info.get('eta_breakdown', {})
        payload['download_speed_mbps'] = eta_info.get('download_speed_mbps')
    
    async_to_sync(channel_layer.group_send)(
        f'pending_file_{file_id}',
        payload
    )


def add_log(job: ConversionJob | None, level: str, message: str):
    """
    Add a log entry for the job.
    
    If job is None (e.g. during PendingFile analysis before job creation),
    fallback to standard Python logging instead of writing to ConversionLog
    (since ConversionLog.job_id is NOT NULL).
    """
    import logging
    logger = logging.getLogger(__name__)
    
    if job is None:
        # Fallback: log via standard logger only (for PendingFile analysis logs)
        if level == 'debug':
            logger.debug(message)
        elif level == 'info':
            logger.info(message)
        elif level == 'warning':
            logger.warning(message)
        else:
            logger.error(message)
        return
    
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


def validate_and_adjust_tracks(job: ConversionJob) -> dict:
    """
    Validate that the requested audio/subtitle tracks exist in the file metadata.
    If a track doesn't exist, fallback to the nearest valid track and log the adjustment.
    
    Returns a dict with validated/adjusted track settings:
    {
        'audio_track': int or None,
        'subtitle_track': int or None,
        'audio_adjusted': bool,
        'subtitle_adjusted': bool,
        'audio_reason': str or None,
        'subtitle_reason': str or None,
    }
    """
    import logging
    logger = logging.getLogger(__name__)
    
    result = {
        'audio_track': job.audio_track,
        'subtitle_track': job.subtitle_track,
        'audio_adjusted': False,
        'subtitle_adjusted': False,
        'audio_reason': None,
        'subtitle_reason': None,
    }
    
    # Get metadata from pending_file if available
    metadata = None
    if job.pending_file and job.pending_file.metadata:
        metadata = job.pending_file.metadata
    
    if not metadata:
        logger.debug(f'[Job {job.id}] No pending_file metadata, skipping track validation')
        return result
    
    audio_tracks = metadata.get('audio_tracks', [])
    subtitle_tracks = metadata.get('subtitle_tracks', [])
    
    # Build index sets for quick lookup (using ffmpeg_index as source of truth)
    audio_indices = {t.get('ffmpeg_index', t.get('index')) for t in audio_tracks}
    subtitle_indices = {t.get('ffmpeg_index', t.get('index')) for t in subtitle_tracks}
    
    # Validate audio track
    if job.audio_track is not None and audio_tracks:
        if job.audio_track not in audio_indices:
            # Track doesn't exist - find fallback
            old_track = job.audio_track
            
            # Try to find track with same language preference
            fallback_track = None
            if job.audio_lang:
                for lang in job.audio_lang.split(','):
                    lang = lang.strip()
                    for t in audio_tracks:
                        if t.get('language', '').lower().startswith(lang.lower()):
                            fallback_track = t.get('ffmpeg_index', t.get('index'))
                            break
                    if fallback_track is not None:
                        break
            
            # If no language match, use first track (or default track)
            if fallback_track is None and audio_tracks:
                default_track = next((t for t in audio_tracks if t.get('default')), None)
                if default_track:
                    fallback_track = default_track.get('ffmpeg_index', default_track.get('index'))
                else:
                    fallback_track = audio_tracks[0].get('ffmpeg_index', audio_tracks[0].get('index'))
            
            result['audio_track'] = fallback_track
            result['audio_adjusted'] = True
            result['audio_reason'] = f'Audio track {old_track} not found, using track {fallback_track}'
            logger.warning(f'[Job {job.id}] {result["audio_reason"]}. Available: {list(audio_indices)}')
    
    # Validate subtitle track
    if job.subtitle_track is not None and not job.no_subtitles:
        if subtitle_tracks and job.subtitle_track not in subtitle_indices:
            # Track doesn't exist - find fallback
            old_track = job.subtitle_track
            
            # Try to find track with same language preference
            fallback_track = None
            if job.subtitle_lang:
                for lang in job.subtitle_lang.split(','):
                    lang = lang.strip()
                    for t in subtitle_tracks:
                        if t.get('language', '').lower().startswith(lang.lower()):
                            # Prefer forced subs if enabled
                            if job.prefer_forced_subs and t.get('forced'):
                                fallback_track = t.get('ffmpeg_index', t.get('index'))
                                break
                            elif fallback_track is None:
                                fallback_track = t.get('ffmpeg_index', t.get('index'))
                    if fallback_track is not None and (not job.prefer_forced_subs or any(t.get('forced') for t in subtitle_tracks if t.get('language', '').lower().startswith(lang.lower()))):
                        break
            
            # If no language match, use first track (or default track)
            if fallback_track is None and subtitle_tracks:
                default_track = next((t for t in subtitle_tracks if t.get('default')), None)
                if default_track:
                    fallback_track = default_track.get('ffmpeg_index', default_track.get('index'))
                else:
                    fallback_track = subtitle_tracks[0].get('ffmpeg_index', subtitle_tracks[0].get('index'))
            
            result['subtitle_track'] = fallback_track
            result['subtitle_adjusted'] = True
            result['subtitle_reason'] = f'Subtitle track {old_track} not found, using track {fallback_track}'
            logger.warning(f'[Job {job.id}] {result["subtitle_reason"]}. Available: {list(subtitle_indices)}')
        elif not subtitle_tracks and job.subtitle_track is not None:
            # No subtitle tracks in file
            result['subtitle_track'] = None
            result['subtitle_adjusted'] = True
            result['subtitle_reason'] = 'No subtitle tracks found in file'
            logger.info(f'[Job {job.id}] {result["subtitle_reason"]}')
    
    return result


def build_mkv2cast_config(job: ConversionJob, validated_tracks: dict = None) -> 'Config':
    """
    Build mkv2cast Config object from job settings.
    
    Uses Config.for_library() for optimal library usage which disables:
    - Progress bars (we use our own via callback)
    - Desktop notifications (we use WebSocket)
    - Rich UI (not needed in Celery worker)
    
    Args:
        job: The ConversionJob instance
        validated_tracks: Optional dict from validate_and_adjust_tracks() with corrected track indices
    """
    import logging
    logger = logging.getLogger(__name__)
    
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
    
    # Use validated tracks if provided, otherwise use job values
    audio_track = validated_tracks.get('audio_track') if validated_tracks else job.audio_track
    subtitle_track = validated_tracks.get('subtitle_track') if validated_tracks else job.subtitle_track
    
    # Add audio/subtitle selection if specified
    if job.audio_lang:
        config_kwargs['audio_lang'] = job.audio_lang
    if audio_track is not None:
        config_kwargs['audio_track'] = audio_track
    if job.subtitle_lang:
        config_kwargs['subtitle_lang'] = job.subtitle_lang
    if subtitle_track is not None:
        config_kwargs['subtitle_track'] = subtitle_track
    
    config_kwargs['prefer_forced_subs'] = job.prefer_forced_subs
    config_kwargs['no_subtitles'] = job.no_subtitles
    
    # Log final track configuration for debugging
    logger.debug(f'[Job {job.id}] mkv2cast config: audio_track={audio_track}, subtitle_track={subtitle_track}, '
                 f'audio_lang={job.audio_lang}, subtitle_lang={job.subtitle_lang}')
    
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
        # Determine input file source
        storage_service = get_storage_service()
        temp_dir = Path(tempfile.mkdtemp())
        input_path = None
        input_file_key = None
        pending_file = None
        
        if job.pending_file:
            # New flow: use PendingFile
            pending_file = job.pending_file
            input_file_key = pending_file.file_key
            
            # Check if file was already downloaded during analysis
            cached_path = _downloaded_files_cache.get(str(pending_file.id))
            if cached_path and Path(cached_path).exists():
                # Reuse cached file
                input_path = Path(cached_path)
                add_log(job, 'info', f'Reusing cached file from analysis: {input_path}')
                send_progress_update(job_id, 5, 'analyzing', 'REUSING_CACHE')
                add_log(job, 'info', 'Reusing downloaded file from analysis cache')
            else:
                # Download from S3
                input_path = temp_dir / pending_file.original_filename
                add_log(job, 'info', f'Downloading file from S3: {input_file_key}')
                send_progress_update(job_id, 2, 'analyzing', 'DOWNLOADING')
                add_log(job, 'info', 'Downloading file from storage')
                storage_service.download_file(input_file_key, str(input_path))
                # Cache it for potential reuse
                _downloaded_files_cache[str(pending_file.id)] = str(input_path)
        elif job.original_file:
            # Legacy flow: check if local file exists
            try:
                local_path = job.original_file.path if hasattr(job.original_file, 'path') else None
                if local_path and os.path.exists(local_path):
                    input_path = Path(local_path)
                else:
                    # File might be on S3 already
                    input_file_key = job.original_file.name
                    input_path = temp_dir / job.original_filename
                    storage_service.download_file(input_file_key, str(input_path))
            except Exception:
                # Try S3
                input_file_key = job.original_file.name
                input_path = temp_dir / job.original_filename
                storage_service.download_file(input_file_key, str(input_path))
        else:
            raise Exception('No input file available')
        
        # Create output directory (temp)
        output_dir = temp_dir / 'output'
        output_dir.mkdir(parents=True, exist_ok=True)
        
        # Validate and adjust tracks before building config
        # This ensures selected tracks exist in the file and logs any adjustments
        validated_tracks = validate_and_adjust_tracks(job)
        
        if validated_tracks.get('audio_adjusted'):
            add_log(job, 'warning', validated_tracks['audio_reason'])
        if validated_tracks.get('subtitle_adjusted'):
            add_log(job, 'warning', validated_tracks['subtitle_reason'])
        
        # Build mkv2cast configuration with validated tracks
        config = build_mkv2cast_config(job, validated_tracks)
        
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
                
                # Upload to S3/MinIO with progress tracking
                output_file_key = f'finished/{job.id}/{output_path.name}'
                add_log(job, 'info', f'Uploading result to S3: {output_file_key}')
                send_progress_update(job_id, 95, 'processing', 'UPLOADING')
                add_log(job, 'info', 'Uploading converted file to storage')
                storage_service.upload_file(str(output_path), output_file_key)
                send_progress_update(job_id, 98, 'processing', 'FINALIZING')
                add_log(job, 'info', 'Finalizing upload')
                
                # Set the output file key (S3 path)
                job.output_file.name = output_file_key
                job.output_file_size = output_size
                job.status = 'completed'
                job.progress = 100
                job.completed_at = timezone.now()
                job.save()
                
                # Clean up cached file if it was used
                if job.pending_file:
                    cached_path = _downloaded_files_cache.pop(str(job.pending_file.id), None)
                    if cached_path and Path(cached_path).exists():
                        try:
                            Path(cached_path).unlink()
                        except Exception:
                            pass
                
                # Update user storage
                job.user.storage_used += output_size
                job.user.storage_used -= job.original_file_size  # Remove original from storage count
                job.user.save(update_fields=['storage_used'])
                
                # Delete original file from S3 if it was uploaded via new flow
                if pending_file and input_file_key:
                    try:
                        storage_service.delete_file(input_file_key)
                        add_log(job, 'info', f'Deleted original file from S3: {input_file_key}')
                    except Exception as e:
                        add_log(job, 'warning', f'Failed to delete original file: {e}')
                
                add_log(job, 'info', f'Conversion completed. Output: {output_file_key}, size: {output_size} bytes')
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
                        # Upload to S3
                        output_file_key = f'finished/{job.id}/{found_output.name}'
                        add_log(job, 'info', f'Uploading remux result to S3: {output_file_key}')
                        storage_service.upload_file(str(found_output), output_file_key)
                        
                        job.output_file.name = output_file_key
                        job.output_file_size = output_size
                        add_log(job, 'info', f'Remux completed. Output: {output_file_key}, size: {output_size} bytes')
                    else:
                        # If remux file doesn't exist, use original file as output
                        # (file was already compatible, no remux needed)
                        if pending_file:
                            # Use pending_file key
                            job.output_file.name = pending_file.file_key
                        else:
                            job.output_file = job.original_file
                        job.output_file_size = job.original_file_size
                        add_log(job, 'info', f'File already compatible, using original as output')
                else:
                    # File was skipped (already compatible)
                    if pending_file:
                        job.output_file.name = pending_file.file_key
                    else:
                        job.output_file = job.original_file
                    job.output_file_size = job.original_file_size
                    add_log(job, 'info', f'File skipped (already compatible): {message}')
                
                job.status = 'completed'
                job.progress = 100
                job.completed_at = timezone.now()
                job.save()
                
                # Delete original file from S3 if it was uploaded via new flow
                if pending_file and input_file_key:
                    try:
                        storage_service.delete_file(input_file_key)
                        add_log(job, 'info', f'Deleted original file from S3: {input_file_key}')
                    except Exception as e:
                        add_log(job, 'warning', f'Failed to delete original file: {e}')
                
                # Update user storage for output file
                if job.output_file and job.output_file.name != (pending_file.file_key if pending_file else None):
                    job.user.storage_used += job.output_file_size
                    job.user.storage_used -= job.original_file_size  # Remove original
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
    finally:
        # Cleanup temp directory
        try:
            if 'temp_dir' in locals() and temp_dir.exists():
                import shutil
                shutil.rmtree(temp_dir)
        except Exception:
            pass


def cancel_conversion(task_id: str):
    """
    Cancel a running conversion task.
    """
    from celery.result import AsyncResult
    from mkv2cast_api.celery import app
    
    result = AsyncResult(task_id, app=app)
    result.revoke(terminate=True, signal='SIGTERM')


@shared_task(bind=True)
def analyze_pending_file(self, file_id: str):
    """
    Analyze a pending file to extract metadata (audio tracks, subtitles, etc.).
    
    Uses ffprobe to extract:
    - Audio tracks (language, codec, index, forced, default)
    - Subtitle tracks (language, codec, index, forced, default)
    - Video codec
    - Duration
    - Resolution
    
    Tries to analyze directly from S3 using signed URL (streaming) first,
    falls back to downloading if that fails.
    """
    import time
    import logging
    
    logger = logging.getLogger(__name__)
    total_start_time = time.time()
    
    try:
        pending_file = PendingFile.objects.get(id=file_id)
    except PendingFile.DoesNotExist:
        return
    
    if pending_file.status != 'analyzing':
        return
    
    storage_service = get_storage_service()
    file_size_mb = pending_file.file_size / (1024 * 1024)
    local_file_path = None
    used_stream_analysis = False
    
    try:
        # Try streaming analysis first (no download needed)
        url_gen_start = time.time()
        signed_url = storage_service.generate_presigned_get_url(
            pending_file.file_key,
            expiry=3600  # 1 hour should be enough
        )
        url_gen_time = time.time() - url_gen_start
        
        logger.info(f'[PERF] Generated signed URL in {url_gen_time:.2f}s for {pending_file.original_filename}')
        
        # Send progress update: attempting stream analysis
        send_pending_file_update(
            str(file_id), 5, 'analyzing', 'STREAM_ANALYZING',
            'Analyzing file directly from storage (streaming)',
            calculate_eta(pending_file.file_size, 0, 0)
        )
        
        # Try ffprobe on signed URL (streaming)
        stream_analysis_start = time.time()
        try:
            result = subprocess.run(
                [
                    'ffprobe',
                    '-v', 'quiet',
                    '-print_format', 'json',
                    '-show_format',
                    '-show_streams',
                    signed_url
                ],
                capture_output=True,
                text=True,
                check=True,
                timeout=120  # 2 minutes max for stream analysis
            )
            
            stream_analysis_time = time.time() - stream_analysis_start
            used_stream_analysis = True
            logger.info(f'[PERF] Stream analysis completed in {stream_analysis_time:.2f}s for {pending_file.original_filename}')
            add_log(None, 'debug', f'Stream analysis successful: {stream_analysis_time:.2f}s (no download needed)')
            
        except (subprocess.TimeoutExpired, subprocess.CalledProcessError, Exception) as e:
            # Stream analysis failed, fallback to download
            stream_analysis_time = time.time() - stream_analysis_start
            logger.warning(f'[PERF] Stream analysis failed after {stream_analysis_time:.2f}s, falling back to download: {e}')
            add_log(None, 'debug', f'Stream analysis failed, using download fallback: {e}')
            
            # Fallback: download file
            temp_dir = Path(tempfile.mkdtemp())
            local_file_path = temp_dir / pending_file.original_filename
            
            download_start = time.time()
            send_pending_file_update(
                str(file_id), 10, 'analyzing', 'DOWNLOADING',
                'Downloading file from storage',
                calculate_eta(pending_file.file_size, 0, 0)
            )
            
            storage_service.download_file(pending_file.file_key, str(local_file_path))
            
            download_time = time.time() - download_start
            download_speed = file_size_mb / download_time if download_time > 0 else 0
            
            logger.info(f'[PERF] Downloaded {file_size_mb:.1f} MB in {download_time:.2f}s ({download_speed:.2f} MB/s)')
            add_log(None, 'debug', f'Downloaded file: {download_time:.2f}s, {download_speed:.2f} MB/s')
            
            # Cache the downloaded file path for reuse in conversion
            _downloaded_files_cache[str(file_id)] = str(local_file_path)
            
            # Send progress update: analyzing downloaded file
            send_pending_file_update(
                str(file_id), 30, 'analyzing', 'ANALYZING',
                f'Analyzing file ({file_size_mb:.1f} MB downloaded in {download_time:.1f}s)',
                calculate_eta(pending_file.file_size, pending_file.file_size, download_time, download_speed)
            )
            
            # Use ffprobe on local file
            analysis_start = time.time()
            result = subprocess.run(
                [
                    'ffprobe',
                    '-v', 'quiet',
                    '-print_format', 'json',
                    '-show_format',
                    '-show_streams',
                    str(local_file_path)
                ],
                capture_output=True,
                text=True,
                check=True,
                timeout=300  # 5 minutes max
            )
            analysis_time = time.time() - analysis_start
            logger.info(f'[PERF] Local analysis completed in {analysis_time:.2f}s')
            add_log(None, 'debug', f'Local file analysis: {analysis_time:.2f}s')
        
        # Process ffprobe output (same for both stream and download)
        processing_start = time.time()
        probe_data = json.loads(result.stdout)
        
        # Extract metadata
        metadata = {
            'audio_tracks': [],
            'subtitle_tracks': [],
            'video_codec': None,
            'duration': None,
            'width': None,
            'height': None,
        }
        
        # Process streams
        for i, stream in enumerate(probe_data.get('streams', [])):
            codec_type = stream.get('codec_type', '')
            stream_tags = stream.get('tags', {})
            disposition = stream.get('disposition', {})
            ffmpeg_index = stream.get('index', i)
            
            # Extract language and title from tags (filter stream_tags as requested)
            language = stream_tags.get('language', 'unknown')
            title = stream_tags.get('title', '')
            
            # Build disposition string for stream_id
            disposition_parts = []
            if disposition.get('default', 0) == 1:
                disposition_parts.append('default')
            if disposition.get('forced', 0) == 1:
                disposition_parts.append('forced')
            disposition_str = ':'.join(disposition_parts) if disposition_parts else 'none'
            
            if codec_type == 'audio':
                # Normalized audio track format
                # stream_id is a stable tuple: codec_type:language:title:disposition:ffmpeg_index
                stream_id = f"{codec_type}:{language}:{title}:{disposition_str}:{ffmpeg_index}"
                
                track_info = {
                    'index': len(metadata['audio_tracks']),  # UI-friendly sequential index
                    'ffmpeg_index': ffmpeg_index,  # Actual ffmpeg stream index (source of truth)
                    'language': language,
                    'title': title,
                    'codec': stream.get('codec_name', ''),
                    'channels': stream.get('channels', 0),
                    'default': disposition.get('default', 0) == 1,
                    'forced': disposition.get('forced', 0) == 1,
                    'stream_id': stream_id,
                }
                metadata['audio_tracks'].append(track_info)
            
            elif codec_type == 'subtitle':
                # Normalized subtitle track format
                # stream_id is a stable tuple: codec_type:language:title:disposition:ffmpeg_index
                stream_id = f"{codec_type}:{language}:{title}:{disposition_str}:{ffmpeg_index}"
                
                track_info = {
                    'index': len(metadata['subtitle_tracks']),  # UI-friendly sequential index
                    'ffmpeg_index': ffmpeg_index,  # Actual ffmpeg stream index (source of truth)
                    'language': language,
                    'title': title,
                    'codec': stream.get('codec_name', ''),
                    'forced': disposition.get('forced', 0) == 1,
                    'default': disposition.get('default', 0) == 1,
                    'hearing_impaired': disposition.get('hearing_impaired', 0) == 1,
                    'stream_id': stream_id,
                }
                metadata['subtitle_tracks'].append(track_info)
            
            elif codec_type == 'video':
                # Extract video info
                if metadata['video_codec'] is None:
                    metadata['video_codec'] = stream.get('codec_name', '')
                    metadata['width'] = stream.get('width')
                    metadata['height'] = stream.get('height')
        
        # Extract duration from format
        format_info = probe_data.get('format', {})
        duration_str = format_info.get('duration')
        if duration_str:
            try:
                metadata['duration'] = float(duration_str)
            except (ValueError, TypeError):
                pass
        
        processing_time = time.time() - processing_start
        total_time = time.time() - total_start_time
        
        logger.info(f'[PERF] Metadata processing: {processing_time:.2f}s')
        logger.info(f'[PERF] Total analysis time: {total_time:.2f}s (stream: {used_stream_analysis})')
        add_log(None, 'debug', f'Metadata processing: {processing_time:.2f}s, Total: {total_time:.2f}s')
        
        # Save metadata to PendingFile
        pending_file.metadata = metadata
        pending_file.status = 'ready'
        pending_file.save(update_fields=['metadata', 'status'])
        
        # Send final progress update
        send_pending_file_update(
            str(file_id), 100, 'ready', 'READY',
            f'Analysis complete ({total_time:.1f}s total)',
            {'eta_seconds': 0, 'eta_breakdown': {'total_eta': 0}}
        )
        
        add_log(None, 'info', f'File analysis completed for {pending_file.original_filename} in {total_time:.2f}s')
        
    except subprocess.TimeoutExpired:
        pending_file.status = 'expired'
        pending_file.save(update_fields=['status'])
        add_log(None, 'error', f'File analysis timeout for {pending_file.original_filename}')
        send_pending_file_update(str(file_id), 0, 'error', 'ERROR', 'Analysis timeout')
        # Remove from cache on error
        _downloaded_files_cache.pop(str(file_id), None)
    except subprocess.CalledProcessError as e:
        pending_file.status = 'expired'
        pending_file.save(update_fields=['status'])
        add_log(None, 'error', f'File analysis failed for {pending_file.original_filename}: {e}')
        send_pending_file_update(str(file_id), 0, 'error', 'ERROR', f'Analysis failed: {e}')
        # Remove from cache on error
        _downloaded_files_cache.pop(str(file_id), None)
    except json.JSONDecodeError as e:
        pending_file.status = 'expired'
        pending_file.save(update_fields=['status'])
        add_log(None, 'error', f'Failed to parse ffprobe output for {pending_file.original_filename}: {e}')
        send_pending_file_update(str(file_id), 0, 'error', 'ERROR', f'Failed to parse analysis results: {e}')
        # Remove from cache on error
        _downloaded_files_cache.pop(str(file_id), None)
    except Exception as e:
        pending_file.status = 'expired'
        pending_file.save(update_fields=['status'])
        add_log(None, 'error', f'Unexpected error during file analysis for {pending_file.original_filename}: {e}')
        send_pending_file_update(str(file_id), 0, 'error', 'ERROR', f'Analysis failed: {e}')
        # Remove from cache on error
        _downloaded_files_cache.pop(str(file_id), None)
    finally:
        # Cleanup temp file if downloaded AND analysis is complete
        # Note: We keep the cached file if analysis succeeded for reuse in conversion
        # Only delete if:
        # 1. Analysis failed (status is not 'ready')
        # 2. Or if we need to clean up after the finally block runs
        pending_file.refresh_from_db()
        if pending_file.status != 'ready':
            # Analysis failed, clean up cached file
            cached_path = _downloaded_files_cache.pop(str(file_id), None)
            if cached_path and Path(cached_path).exists():
                try:
                    Path(cached_path).unlink()
                except Exception:
                    pass
        
        # Clean up temp directory if it exists and is empty
        if local_file_path and Path(local_file_path).exists():
            try:
                # Only delete if not in cache (cache might still reference this path)
                if str(local_file_path) not in _downloaded_files_cache.values():
                    Path(local_file_path).unlink()
                    temp_dir = Path(local_file_path).parent
                    if temp_dir.exists() and not any(temp_dir.iterdir()):
                        temp_dir.rmdir()
            except Exception:
                pass
