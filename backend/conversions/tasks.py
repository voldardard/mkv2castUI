"""
Celery tasks for video conversion.

Integrates with mkv2cast CLI for actual conversion work.
"""
import json
import os
import re
import subprocess
import tempfile
from pathlib import Path

from celery import shared_task
from celery.exceptions import Ignore
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from django.utils import timezone
from django.conf import settings

from .models import ConversionJob, ConversionLog


def send_progress_update(job_id: str, progress: int, status: str, stage: str = '', eta: int = None, error: str = '', speed: float = None):
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
        }
    )


def add_log(job: ConversionJob, level: str, message: str):
    """Add a log entry for the job."""
    ConversionLog.objects.create(job=job, level=level, message=message)


def parse_ffmpeg_progress(line: str, duration_ms: int) -> tuple:
    """
    Parse ffmpeg progress output to extract current time.
    
    Returns:
        Tuple of (progress_percent, current_time_ms)
    """
    # Match time=HH:MM:SS.ms format
    match = re.search(r'time=(\d{2}):(\d{2}):(\d{2})\.(\d{2})', line)
    if match:
        hours, minutes, seconds, centiseconds = map(int, match.groups())
        current_ms = (hours * 3600 + minutes * 60 + seconds) * 1000 + centiseconds * 10
        
        if duration_ms > 0:
            progress = min(99, int((current_ms / duration_ms) * 100))
            return progress, current_ms
    
    return None, None


def build_mkv2cast_command(job: ConversionJob, input_path: str, output_path: str) -> list:
    """
    Build the mkv2cast/ffmpeg command for conversion.
    
    Uses mkv2cast's converter module directly if available, otherwise
    constructs ffmpeg command manually.
    """
    cmd = ['mkv2cast']
    
    # Hardware backend
    if job.hw_backend != 'auto':
        cmd.extend(['--hw', job.hw_backend])
    
    # Container
    cmd.extend(['--container', job.container])
    
    # Quality settings based on backend
    if job.hw_backend == 'cpu' or job.hw_backend == 'auto':
        cmd.extend(['--crf', str(job.crf)])
        cmd.extend(['--preset', job.preset])
    
    # Hardware-specific quality settings
    if job.hw_backend == 'vaapi':
        cmd.extend(['--vaapi-qp', str(job.vaapi_qp)])
    elif job.hw_backend == 'qsv':
        cmd.extend(['--qsv-quality', str(job.qsv_quality)])
    elif job.hw_backend == 'nvenc':
        cmd.extend(['--nvenc-cq', str(job.nvenc_cq)])
    
    # Audio
    cmd.extend(['--abr', job.audio_bitrate])
    
    # Audio/Subtitle selection (new mkv2cast v1.1+ options)
    if job.audio_lang:
        cmd.extend(['--audio-lang', job.audio_lang])
    if job.audio_track is not None:
        cmd.extend(['--audio-track', str(job.audio_track)])
    if job.subtitle_lang:
        cmd.extend(['--subtitle-lang', job.subtitle_lang])
    if job.subtitle_track is not None:
        cmd.extend(['--subtitle-track', str(job.subtitle_track)])
    if job.prefer_forced_subs:
        cmd.append('--prefer-forced-subs')
    else:
        cmd.append('--no-forced-subs')
    if job.no_subtitles:
        cmd.append('--no-subtitles')
    
    # Optimization options
    if job.skip_when_ok:
        cmd.append('--skip-when-ok')
    else:
        cmd.append('--no-skip-when-ok')
    if job.no_silence:
        cmd.append('--no-silence')
    
    # Codec decisions
    if job.force_h264:
        cmd.append('--force-h264')
    if job.allow_hevc:
        cmd.append('--allow-hevc')
    if job.force_aac:
        cmd.append('--force-aac')
    if job.keep_surround:
        cmd.append('--keep-surround')
    
    # Integrity checks
    if not job.integrity_check:
        cmd.append('--no-integrity-check')
    if job.deep_check:
        cmd.append('--deep-check')
    
    # Input file
    cmd.append(input_path)
    
    return cmd


def analyze_file(job: ConversionJob, input_path: str) -> dict:
    """
    Analyze the input file to determine what transcoding is needed.
    
    Uses ffprobe to get file information.
    """
    try:
        cmd = [
            'ffprobe', '-v', 'error',
            '-print_format', 'json',
            '-show_streams', '-show_format',
            input_path
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        
        if result.returncode != 0:
            raise Exception(f'ffprobe failed: {result.stderr}')
        
        data = json.loads(result.stdout)
        
        # Extract duration
        duration_ms = 0
        if 'format' in data and 'duration' in data['format']:
            duration_ms = int(float(data['format']['duration']) * 1000)
        
        # Find video stream
        video_codec = ''
        for stream in data.get('streams', []):
            if stream.get('codec_type') == 'video':
                video_codec = stream.get('codec_name', '')
                break
        
        # Find audio stream
        audio_codec = ''
        for stream in data.get('streams', []):
            if stream.get('codec_type') == 'audio':
                audio_codec = stream.get('codec_name', '')
                break
        
        # Determine if transcoding is needed
        needs_video = video_codec.lower() not in ('h264',) or job.force_h264
        if video_codec.lower() in ('hevc', 'h265') and not job.allow_hevc:
            needs_video = True
        if video_codec.lower() == 'av1':
            needs_video = True
        
        needs_audio = audio_codec.lower() not in ('aac', 'mp3') or job.force_aac
        
        return {
            'duration_ms': duration_ms,
            'video_codec': video_codec,
            'audio_codec': audio_codec,
            'needs_video_transcode': needs_video,
            'needs_audio_transcode': needs_audio,
            'video_reason': f'Video codec: {video_codec}',
        }
    
    except Exception as e:
        raise Exception(f'File analysis failed: {str(e)}')


@shared_task(bind=True, max_retries=1)
def run_conversion(self, job_id: str):
    """
    Main Celery task for running video conversion.
    
    This task:
    1. Loads the job from database
    2. Analyzes the input file
    3. Runs mkv2cast/ffmpeg for conversion
    4. Updates progress via WebSocket
    5. Saves the output file
    """
    try:
        job = ConversionJob.objects.get(id=job_id)
    except ConversionJob.DoesNotExist:
        return
    
    # Update status to analyzing
    job.status = 'analyzing'
    job.started_at = timezone.now()
    job.save(update_fields=['status', 'started_at'])
    send_progress_update(job_id, 0, 'analyzing', 'Analyzing file...')
    add_log(job, 'info', f'Starting analysis of {job.original_filename}')
    
    try:
        # Get the input file path
        input_path = job.original_file.path
        
        # Analyze the file
        analysis = analyze_file(job, input_path)
        
        job.duration_ms = analysis['duration_ms']
        job.video_codec = analysis['video_codec']
        job.audio_codec = analysis['audio_codec']
        job.needs_video_transcode = analysis['needs_video_transcode']
        job.needs_audio_transcode = analysis['needs_audio_transcode']
        job.video_reason = analysis['video_reason']
        job.status = 'processing'
        job.save()
        
        add_log(job, 'info', f'Analysis complete: video={analysis["video_codec"]}, audio={analysis["audio_codec"]}')
        add_log(job, 'info', f'Transcode needed: video={analysis["needs_video_transcode"]}, audio={analysis["needs_audio_transcode"]}')
        
        send_progress_update(job_id, 5, 'processing', 'Starting conversion...')
        
        # Check if conversion is actually needed
        if not analysis['needs_video_transcode'] and not analysis['needs_audio_transcode']:
            # Just remux
            job.current_stage = 'REMUX'
            add_log(job, 'info', 'File is already compatible, remuxing only')
        elif analysis['needs_video_transcode'] and analysis['needs_audio_transcode']:
            job.current_stage = 'TRANSCODE'
        elif analysis['needs_video_transcode']:
            job.current_stage = 'VIDEO'
        else:
            job.current_stage = 'AUDIO'
        job.save(update_fields=['current_stage'])
        
        # Create temporary output file
        output_dir = Path(settings.MEDIA_ROOT) / 'outputs' / str(job.user.id)
        output_dir.mkdir(parents=True, exist_ok=True)
        
        # Generate output filename
        tag = ''
        if analysis['needs_video_transcode']:
            tag += '.h264'
        if analysis['needs_audio_transcode']:
            tag += '.aac'
        if not tag:
            tag = '.remux'
        
        name, _ = os.path.splitext(job.original_filename)
        output_filename = f'{name}{tag}{job.suffix}.{job.container}'
        output_path = str(output_dir / f'{job.id}.{job.container}')
        
        # Build and run conversion command
        cmd = build_mkv2cast_command(job, input_path, output_path)
        add_log(job, 'debug', f'Command: {" ".join(cmd)}')
        
        # Run conversion with progress tracking
        # Use ffmpeg directly with progress output
        ffmpeg_cmd = [
            'ffmpeg', '-hide_banner', '-y',
            '-i', input_path,
            '-progress', 'pipe:1',
            '-nostats',
        ]
        
        # Add video encoding options
        if analysis['needs_video_transcode']:
            if job.hw_backend == 'vaapi':
                # Get VAAPI device - empty means auto-detect, use common default
                vaapi_device = getattr(settings, 'MKV2CAST_VAAPI_DEVICE', '')
                if not vaapi_device:
                    vaapi_device = '/dev/dri/renderD128'  # Common default for Intel/AMD
                ffmpeg_cmd.extend([
                    '-vaapi_device', vaapi_device,
                    '-vf', 'format=nv12,hwupload',
                    '-c:v', 'h264_vaapi',
                    '-qp', str(job.vaapi_qp),
                ])
            elif job.hw_backend == 'qsv':
                ffmpeg_cmd.extend([
                    '-vf', 'format=nv12',
                    '-c:v', 'h264_qsv',
                    '-global_quality', str(job.qsv_quality),
                ])
            elif job.hw_backend == 'nvenc':
                ffmpeg_cmd.extend([
                    '-c:v', 'h264_nvenc',
                    '-cq', str(job.nvenc_cq),
                    '-preset', 'p4',  # Good balance quality/speed
                    '-tune', 'hq',
                ])
            else:
                ffmpeg_cmd.extend([
                    '-c:v', 'libx264',
                    '-preset', job.preset,
                    '-crf', str(job.crf),
                    '-pix_fmt', 'yuv420p',
                ])
            ffmpeg_cmd.extend(['-profile:v', 'high', '-level', '4.1'])
        else:
            ffmpeg_cmd.extend(['-c:v', 'copy'])
        
        # Add audio encoding options
        if analysis['needs_audio_transcode']:
            ffmpeg_cmd.extend([
                '-c:a', 'aac',
                '-b:a', job.audio_bitrate,
            ])
            if not job.keep_surround:
                ffmpeg_cmd.extend(['-ac', '2'])
        else:
            ffmpeg_cmd.extend(['-c:a', 'copy'])
        
        # Output format
        if job.container == 'mp4':
            ffmpeg_cmd.extend(['-f', 'mp4', '-movflags', '+faststart'])
        else:
            ffmpeg_cmd.extend(['-f', 'matroska'])
        
        ffmpeg_cmd.append(output_path)
        
        add_log(job, 'debug', f'FFmpeg command: {" ".join(ffmpeg_cmd)}')
        
        # Run ffmpeg with progress monitoring
        process = subprocess.Popen(
            ffmpeg_cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            universal_newlines=True,
            bufsize=1
        )
        
        last_progress = 0
        current_speed = None
        speed_history = []  # Rolling window for speed averaging
        last_time_ms = 0
        last_check_time = timezone.now()
        
        for line in process.stdout:
            # Check if job was cancelled (every few lines to reduce DB hits)
            if 'progress=' in line:
                job.refresh_from_db()
                if job.status == 'cancelled':
                    process.terminate()
                    process.wait()
                    if os.path.exists(output_path):
                        os.remove(output_path)
                    add_log(job, 'info', 'Conversion cancelled by user')
                    raise Ignore()
            
            # Parse speed from ffmpeg output
            if 'speed=' in line:
                try:
                    speed_str = line.split('=')[1].strip().rstrip('x')
                    if speed_str and speed_str != 'N/A':
                        speed_val = float(speed_str)
                        if speed_val > 0:
                            speed_history.append(speed_val)
                            # Keep only last 10 speed samples for moving average
                            if len(speed_history) > 10:
                                speed_history.pop(0)
                            current_speed = sum(speed_history) / len(speed_history)
                except (ValueError, IndexError):
                    pass
            
            # Parse progress
            if 'out_time_ms=' in line:
                try:
                    time_ms = int(line.split('=')[1].strip())
                    if job.duration_ms > 0:
                        progress = min(99, int((time_ms / 1000 / job.duration_ms) * 100 * 1000))
                        if progress > last_progress:
                            last_progress = progress
                            job.progress = progress
                            job.save(update_fields=['progress'])
                            
                            # Calculate ETA using speed if available, else use elapsed time
                            eta = None
                            if current_speed and current_speed > 0 and job.duration_ms > 0:
                                # ETA based on encoding speed
                                remaining_ms = job.duration_ms * 1000 - time_ms
                                eta = int((remaining_ms / 1000) / current_speed)
                            else:
                                # Fallback to linear estimation
                                elapsed = (timezone.now() - job.started_at).total_seconds()
                                if progress > 0:
                                    eta = int((elapsed / progress) * (100 - progress))
                            
                            # Clamp ETA to reasonable bounds (max 24 hours)
                            if eta is not None:
                                eta = max(0, min(eta, 86400))
                            
                            send_progress_update(
                                job_id, 
                                progress, 
                                'processing', 
                                job.current_stage, 
                                eta,
                                speed=round(current_speed, 2) if current_speed else None
                            )
                            
                            last_time_ms = time_ms
                except (ValueError, IndexError):
                    pass
        
        process.wait()
        
        if process.returncode != 0:
            raise Exception(f'FFmpeg exited with code {process.returncode}')
        
        # Verify output file exists
        if not os.path.exists(output_path):
            raise Exception('Output file was not created')
        
        # Save output file to job
        output_size = os.path.getsize(output_path)
        
        # Move file to proper location
        final_output_path = f'outputs/{job.user.id}/{job.id}.{job.container}'
        job.output_file.name = final_output_path
        job.output_file_size = output_size
        job.status = 'completed'
        job.progress = 100
        job.completed_at = timezone.now()
        job.save()
        
        # Update user storage
        job.user.storage_used += output_size
        job.user.save(update_fields=['storage_used'])
        
        add_log(job, 'info', f'Conversion completed successfully. Output size: {output_size} bytes')
        send_progress_update(job_id, 100, 'completed', 'Done!')
        
    except Ignore:
        raise
    
    except Exception as e:
        error_msg = str(e)
        job.status = 'failed'
        job.error_message = error_msg
        job.completed_at = timezone.now()
        job.save(update_fields=['status', 'error_message', 'completed_at'])
        
        add_log(job, 'error', f'Conversion failed: {error_msg}')
        send_progress_update(job_id, 0, 'failed', error=error_msg)


def cancel_conversion(task_id: str):
    """
    Cancel a running conversion task.
    """
    from celery.result import AsyncResult
    from mkv2cast_api.celery import app
    
    result = AsyncResult(task_id, app=app)
    result.revoke(terminate=True, signal='SIGTERM')
