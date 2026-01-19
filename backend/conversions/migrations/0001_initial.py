# Generated migration for conversions app
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid
import conversions.models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='ConversionJob',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('original_filename', models.CharField(max_length=500)),
                ('original_file', models.FileField(max_length=500, upload_to=conversions.models.upload_to_path)),
                ('original_file_size', models.BigIntegerField(default=0)),
                ('output_file', models.FileField(blank=True, max_length=500, null=True, upload_to=conversions.models.output_to_path)),
                ('output_file_size', models.BigIntegerField(default=0)),
                ('status', models.CharField(choices=[('pending', 'Pending'), ('queued', 'Queued'), ('analyzing', 'Analyzing'), ('processing', 'Processing'), ('completed', 'Completed'), ('failed', 'Failed'), ('cancelled', 'Cancelled')], default='pending', max_length=20)),
                ('progress', models.IntegerField(default=0)),
                ('current_stage', models.CharField(blank=True, max_length=50)),
                ('container', models.CharField(choices=[('mkv', 'MKV'), ('mp4', 'MP4')], default='mkv', max_length=10)),
                ('suffix', models.CharField(default='.cast', max_length=20)),
                ('hw_backend', models.CharField(choices=[('auto', 'Auto'), ('vaapi', 'VAAPI'), ('qsv', 'QSV'), ('cpu', 'CPU')], default='auto', max_length=10)),
                ('vaapi_qp', models.IntegerField(default=23)),
                ('qsv_quality', models.IntegerField(default=23)),
                ('crf', models.IntegerField(default=20)),
                ('preset', models.CharField(choices=[('ultrafast', 'Ultra Fast'), ('superfast', 'Super Fast'), ('veryfast', 'Very Fast'), ('faster', 'Faster'), ('fast', 'Fast'), ('medium', 'Medium'), ('slow', 'Slow'), ('slower', 'Slower'), ('veryslow', 'Very Slow')], default='slow', max_length=20)),
                ('audio_bitrate', models.CharField(default='192k', max_length=10)),
                ('force_h264', models.BooleanField(default=False)),
                ('allow_hevc', models.BooleanField(default=False)),
                ('force_aac', models.BooleanField(default=False)),
                ('keep_surround', models.BooleanField(default=False)),
                ('integrity_check', models.BooleanField(default=True)),
                ('deep_check', models.BooleanField(default=False)),
                ('needs_video_transcode', models.BooleanField(null=True)),
                ('needs_audio_transcode', models.BooleanField(null=True)),
                ('video_codec', models.CharField(blank=True, max_length=50)),
                ('audio_codec', models.CharField(blank=True, max_length=50)),
                ('video_reason', models.CharField(blank=True, max_length=200)),
                ('duration_ms', models.BigIntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('started_at', models.DateTimeField(blank=True, null=True)),
                ('completed_at', models.DateTimeField(blank=True, null=True)),
                ('error_message', models.TextField(blank=True)),
                ('celery_task_id', models.CharField(blank=True, max_length=50)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='conversion_jobs', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Conversion Job',
                'verbose_name_plural': 'Conversion Jobs',
                'db_table': 'conversions_job',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='ConversionLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('level', models.CharField(choices=[('debug', 'Debug'), ('info', 'Info'), ('warning', 'Warning'), ('error', 'Error')], default='info', max_length=10)),
                ('message', models.TextField()),
                ('timestamp', models.DateTimeField(auto_now_add=True)),
                ('job', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='logs', to='conversions.conversionjob')),
            ],
            options={
                'verbose_name': 'Conversion Log',
                'verbose_name_plural': 'Conversion Logs',
                'db_table': 'conversions_log',
                'ordering': ['timestamp'],
            },
        ),
    ]
