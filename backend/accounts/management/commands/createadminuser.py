"""
Django management command to create the first admin user.

Usage:
    python manage.py createadminuser --username admin --email admin@example.com --password 'SecurePass!'

With Docker:
    docker-compose exec backend python manage.py createadminuser \
        --username admin --email admin@example.com --password 'SecurePass!'
"""
from django.core.management.base import BaseCommand, CommandError
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
from django.contrib.auth import get_user_model

User = get_user_model()


class Command(BaseCommand):
    help = 'Create an admin user for mkv2castUI'

    def add_arguments(self, parser):
        parser.add_argument(
            '--username',
            required=True,
            help='Username for the admin user'
        )
        parser.add_argument(
            '--email',
            required=True,
            help='Email address for the admin user'
        )
        parser.add_argument(
            '--password',
            required=True,
            help='Password for the admin user'
        )
        parser.add_argument(
            '--first-name',
            default='Admin',
            help='First name (default: Admin)'
        )
        parser.add_argument(
            '--last-name',
            default='User',
            help='Last name (default: User)'
        )
        parser.add_argument(
            '--no-superuser',
            action='store_true',
            default=False,
            help='Create as app admin only (not Django superuser)'
        )
        parser.add_argument(
            '--update',
            action='store_true',
            default=False,
            help='Update existing user if username/email exists'
        )

    def handle(self, *args, **options):
        username = options['username']
        email = options['email']
        password = options['password']
        first_name = options['first_name']
        last_name = options['last_name']
        make_superuser = not options['no_superuser']
        update_existing = options['update']

        # Validate email
        try:
            validate_email(email)
        except ValidationError:
            raise CommandError(f'Invalid email address: {email}')

        # Check password strength (basic check)
        if len(password) < 8:
            raise CommandError('Password must be at least 8 characters long')

        # Check if user exists
        existing_user = User.objects.filter(username=username).first()
        if not existing_user:
            existing_user = User.objects.filter(email=email).first()

        if existing_user:
            if update_existing:
                existing_user.username = username
                existing_user.email = email
                existing_user.set_password(password)
                existing_user.first_name = first_name
                existing_user.last_name = last_name
                existing_user.is_admin = True
                existing_user.is_active = True
                if make_superuser:
                    existing_user.is_staff = True
                    existing_user.is_superuser = True
                existing_user.save()
                self.stdout.write(
                    self.style.SUCCESS(f'Admin user "{username}" updated successfully!')
                )
            else:
                raise CommandError(
                    f'User with username "{username}" or email "{email}" already exists. '
                    'Use --update to modify the existing user.'
                )
        else:
            # Create new user
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name,
            )
            user.is_admin = True
            user.is_active = True
            if make_superuser:
                user.is_staff = True
                user.is_superuser = True
            user.save()

            self.stdout.write(
                self.style.SUCCESS(f'Admin user "{username}" created successfully!')
            )
            self.stdout.write(f'  Email: {email}')
            self.stdout.write(f'  Is Superuser: {make_superuser}')
            self.stdout.write(f'  Is App Admin: True')
