# Generated migration for S3 storage configuration

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0002_add_auth_2fa_admin_branding'),
    ]

    operations = [
        migrations.AddField(
            model_name='sitesettings',
            name='use_s3_storage',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='s3_endpoint',
            field=models.URLField(blank=True, help_text='S3-compatible endpoint URL (e.g., https://s3.amazonaws.com)'),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='s3_access_key',
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='s3_secret_key',
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='s3_bucket_name',
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='s3_region',
            field=models.CharField(blank=True, default='us-east-1', max_length=50),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='s3_custom_domain',
            field=models.URLField(blank=True, help_text='Custom domain for serving files (e.g., CDN)'),
        ),
    ]
