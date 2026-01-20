# Generated migration for storage settings

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0003_add_s3_storage_config'),
    ]

    operations = [
        migrations.AddField(
            model_name='sitesettings',
            name='minio_endpoint',
            field=models.URLField(blank=True, default='http://minio:9000', help_text='MinIO endpoint URL (default: http://minio:9000)'),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='minio_access_key',
            field=models.CharField(blank=True, default='minioadmin', max_length=255),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='minio_secret_key',
            field=models.CharField(blank=True, default='minioadmin', max_length=255),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='signed_url_expiry_seconds',
            field=models.IntegerField(default=3600, help_text='Presigned URL expiration time in seconds (default: 1 hour)'),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='pending_file_expiry_hours',
            field=models.IntegerField(default=24, help_text='Hours before unused pending files are deleted (default: 24)'),
        ),
    ]
