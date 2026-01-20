# Generated migration for avatar and require_auth fields

from django.db import migrations, models


def avatar_upload_to(instance, filename):
    """Generate upload path for avatars."""
    import os
    from django.utils import timezone
    timestamp = int(timezone.now().timestamp())
    ext = os.path.splitext(filename)[1]
    return f'avatars/{instance.id}/{timestamp}/avatar{ext}'


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0004_add_storage_settings'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='avatar',
            field=models.ImageField(blank=True, null=True, upload_to=avatar_upload_to),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='require_auth',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='google_client_id',
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='google_client_secret',
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='github_client_id',
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='github_client_secret',
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='smtp_host',
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='smtp_port',
            field=models.IntegerField(default=587),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='smtp_username',
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='smtp_password',
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='smtp_use_tls',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='smtp_use_ssl',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='smtp_from_email',
            field=models.EmailField(blank=True, max_length=254),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='smtp_from_name',
            field=models.CharField(blank=True, default='mkv2cast', max_length=100),
        ),
    ]
