# Generated migration for PendingFile model

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone
import uuid


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('conversions', '0003_add_amf_support'),
    ]

    operations = [
        migrations.CreateModel(
            name='PendingFile',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('request_id', models.UUIDField(default=uuid.uuid4, editable=False, help_text='UUID generated at file selection', unique=True)),
                ('original_filename', models.CharField(max_length=500)),
                ('file_key', models.CharField(help_text='S3/MinIO object key (path)', max_length=1000)),
                ('file_size', models.BigIntegerField(default=0)),
                ('status', models.CharField(choices=[('uploading', 'Uploading'), ('analyzing', 'Analyzing'), ('ready', 'Ready'), ('expired', 'Expired'), ('used', 'Used')], default='uploading', max_length=20)),
                ('metadata', models.JSONField(blank=True, default=dict, help_text='Extracted metadata (audio tracks, subtitles, etc.)')),
                ('uploaded_at', models.DateTimeField(auto_now_add=True)),
                ('expires_at', models.DateTimeField(help_text='When this file will be deleted if not used')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='pending_files', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Pending File',
                'verbose_name_plural': 'Pending Files',
                'db_table': 'conversions_pending_file',
                'ordering': ['-uploaded_at'],
            },
        ),
        migrations.AddIndex(
            model_name='pendingfile',
            index=models.Index(fields=['user', 'status'], name='conversions_user_stat_idx'),
        ),
        migrations.AddIndex(
            model_name='pendingfile',
            index=models.Index(fields=['expires_at'], name='conversions_expires_idx'),
        ),
        migrations.AddField(
            model_name='conversionjob',
            name='pending_file',
            field=models.ForeignKey(blank=True, help_text='PendingFile used to create this job (if uploaded via new flow)', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='conversion_jobs', to='conversions.pendingfile'),
        ),
        migrations.AlterField(
            model_name='conversionjob',
            name='original_file',
            field=models.FileField(blank=True, help_text='Legacy: local file path (for migration)', max_length=500, null=True, upload_to='uploads/'),
        ),
    ]
