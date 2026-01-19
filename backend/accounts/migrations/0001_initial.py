# Generated migration for accounts app
from django.db import migrations, models
import django.contrib.auth.models
import django.contrib.auth.validators
import django.utils.timezone


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('auth', '0012_alter_user_first_name_max_length'),
    ]

    operations = [
        migrations.CreateModel(
            name='User',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('password', models.CharField(max_length=128, verbose_name='password')),
                ('last_login', models.DateTimeField(blank=True, null=True, verbose_name='last login')),
                ('is_superuser', models.BooleanField(default=False, help_text='Designates that this user has all permissions without explicitly assigning them.', verbose_name='superuser status')),
                ('username', models.CharField(error_messages={'unique': 'A user with that username already exists.'}, help_text='Required. 150 characters or fewer. Letters, digits and @/./+/-/_ only.', max_length=150, unique=True, validators=[django.contrib.auth.validators.UnicodeUsernameValidator()], verbose_name='username')),
                ('first_name', models.CharField(blank=True, max_length=150, verbose_name='first name')),
                ('last_name', models.CharField(blank=True, max_length=150, verbose_name='last name')),
                ('is_staff', models.BooleanField(default=False, help_text='Designates whether the user can log into this admin site.', verbose_name='staff status')),
                ('is_active', models.BooleanField(default=True, help_text='Designates whether this user should be treated as active. Unselect this instead of deleting accounts.', verbose_name='active')),
                ('date_joined', models.DateTimeField(default=django.utils.timezone.now, verbose_name='date joined')),
                ('email', models.EmailField(max_length=254, unique=True)),
                # Subscription tier fields
                ('subscription_tier', models.CharField(choices=[('free', 'Free'), ('pro', 'Pro'), ('enterprise', 'Enterprise')], default='free', max_length=20)),
                ('subscription_expires_at', models.DateTimeField(blank=True, null=True)),
                ('max_concurrent_jobs', models.IntegerField(default=1)),
                ('max_file_size', models.BigIntegerField(default=2147483648)),  # 2GB
                ('monthly_conversion_limit', models.IntegerField(default=10)),
                ('conversions_this_month', models.IntegerField(default=0)),
                ('conversions_reset_date', models.DateField(blank=True, null=True)),
                ('hw_acceleration_enabled', models.BooleanField(default=False)),
                ('priority_queue', models.BooleanField(default=False)),
                # User preferences
                ('preferred_language', models.CharField(choices=[('en', 'English'), ('fr', 'Français'), ('de', 'Deutsch'), ('es', 'Español'), ('it', 'Italiano')], default='en', max_length=5)),
                ('default_container', models.CharField(choices=[('mkv', 'MKV'), ('mp4', 'MP4')], default='mkv', max_length=10)),
                ('default_hw_backend', models.CharField(choices=[('auto', 'Auto'), ('vaapi', 'VAAPI'), ('qsv', 'QSV'), ('cpu', 'CPU')], default='auto', max_length=10)),
                ('default_quality_preset', models.CharField(choices=[('fast', 'Fast'), ('balanced', 'Balanced'), ('quality', 'High Quality')], default='balanced', max_length=20)),
                # Storage tracking
                ('storage_used', models.BigIntegerField(default=0)),
                ('storage_limit', models.BigIntegerField(default=10737418240)),  # 10GB
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('groups', models.ManyToManyField(blank=True, help_text='The groups this user belongs to.', related_name='user_set', related_query_name='user', to='auth.group', verbose_name='groups')),
                ('user_permissions', models.ManyToManyField(blank=True, help_text='Specific permissions for this user.', related_name='user_set', related_query_name='user', to='auth.permission', verbose_name='user permissions')),
            ],
            options={
                'verbose_name': 'User',
                'verbose_name_plural': 'Users',
                'db_table': 'accounts_user',
            },
            managers=[
                ('objects', django.contrib.auth.models.UserManager()),
            ],
        ),
    ]
