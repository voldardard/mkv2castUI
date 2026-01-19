"""
Management command to migrate local files to S3 storage.

This command:
1. Reads S3 configuration from SiteSettings
2. Configures Django storage to use S3
3. Migrates all ConversionJob files (original and output) from local storage to S3
4. Updates file references in the database

Usage:
    python manage.py migrate_to_s3 [--dry-run] [--skip-existing]
"""
import os
import sys
from django.core.management.base import BaseCommand
from django.conf import settings
from django.db import transaction
from accounts.models import SiteSettings
from conversions.models import ConversionJob
import boto3
from botocore.exceptions import ClientError, NoCredentialsError


class Command(BaseCommand):
    help = 'Migrate local files to S3 storage'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be migrated without actually doing it',
        )
        parser.add_argument(
            '--skip-existing',
            action='store_true',
            help='Skip files that already exist in S3',
        )
        parser.add_argument(
            '--batch-size',
            type=int,
            default=10,
            help='Number of jobs to process in each batch (default: 10)',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        skip_existing = options['skip_existing']
        batch_size = options['batch_size']

        # Get S3 configuration from SiteSettings
        site_settings = SiteSettings.get_settings()
        
        if not site_settings.use_s3_storage:
            self.stdout.write(
                self.style.ERROR('S3 storage is not enabled in SiteSettings.')
            )
            self.stdout.write('Please configure S3 settings in the admin panel first.')
            return

        if not all([
            site_settings.s3_endpoint,
            site_settings.s3_access_key,
            site_settings.s3_secret_key,
            site_settings.s3_bucket_name,
        ]):
            self.stdout.write(
                self.style.ERROR('S3 configuration is incomplete in SiteSettings.')
            )
            self.stdout.write('Please configure all S3 settings (endpoint, access_key, secret_key, bucket_name).')
            return

        self.stdout.write(self.style.SUCCESS('S3 Configuration:'))
        self.stdout.write(f'  Endpoint: {site_settings.s3_endpoint}')
        self.stdout.write(f'  Bucket: {site_settings.s3_bucket_name}')
        self.stdout.write(f'  Region: {site_settings.s3_region}')
        self.stdout.write('')

        # Configure boto3 client
        self.stdout.write('Testing S3 connection...')
        try:
            s3_client = boto3.client(
                's3',
                endpoint_url=site_settings.s3_endpoint,
                aws_access_key_id=site_settings.s3_access_key,
                aws_secret_access_key=site_settings.s3_secret_key,
                region_name=site_settings.s3_region or 'us-east-1',
            )
            
            # Test connection with detailed logging
            self.stdout.write(f'  Attempting to access bucket: {site_settings.s3_bucket_name}')
            try:
                s3_client.head_bucket(Bucket=site_settings.s3_bucket_name)
                self.stdout.write(self.style.SUCCESS('  ✓ Bucket access successful'))
            except ClientError as e:
                error_code = e.response.get('Error', {}).get('Code', 'Unknown')
                if error_code == '404':
                    self.stdout.write(
                        self.style.ERROR(f'  ✗ Bucket "{site_settings.s3_bucket_name}" not found')
                    )
                elif error_code == '403':
                    self.stdout.write(
                        self.style.ERROR(f'  ✗ Access denied to bucket "{site_settings.s3_bucket_name}"')
                    )
                else:
                    self.stdout.write(
                        self.style.ERROR(f'  ✗ Failed to access bucket: {e}')
                    )
                return
            
            # List a few objects to verify read access
            try:
                response = s3_client.list_objects_v2(Bucket=site_settings.s3_bucket_name, MaxKeys=5)
                object_count = response.get('KeyCount', 0)
                self.stdout.write(f'  ✓ Read access verified (found {object_count} objects in bucket)')
            except ClientError as e:
                self.stdout.write(
                    self.style.WARNING(f'  ⚠ Could not list objects (may not have permission): {e}')
                )
            
            # Test write access by checking if we can put a test object
            test_key = '__mkv2cast_migration_test__'
            try:
                s3_client.put_object(
                    Bucket=site_settings.s3_bucket_name,
                    Key=test_key,
                    Body=b'test',
                    ContentType='text/plain'
                )
                # Delete the test object
                s3_client.delete_object(Bucket=site_settings.s3_bucket_name, Key=test_key)
                self.stdout.write(self.style.SUCCESS('  ✓ Write access verified'))
            except ClientError as e:
                self.stdout.write(
                    self.style.ERROR(f'  ✗ Write access denied: {e}')
                )
                return
            
            self.stdout.write(self.style.SUCCESS('\n✓ S3 connection fully verified\n'))
        except NoCredentialsError:
            self.stdout.write(
                self.style.ERROR('Failed to connect to S3: Invalid credentials')
            )
            return
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Failed to connect to S3: {type(e).__name__}: {e}')
            )
            import traceback
            self.stdout.write(traceback.format_exc())
            return

        # Get all jobs with files
        jobs = ConversionJob.objects.exclude(
            original_file=''
        ).select_related('user')

        total_jobs = jobs.count()
        self.stdout.write(f'\nFound {total_jobs} jobs with files to migrate\n')

        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN MODE - No files will be migrated\n'))

        migrated_count = 0
        skipped_count = 0
        error_count = 0

        # Process jobs in batches
        for i in range(0, total_jobs, batch_size):
            batch = jobs[i:i + batch_size]
            
            for job in batch:
                try:
                    # Migrate original file
                    if job.original_file:
                        result = self._migrate_file(
                            s3_client,
                            site_settings.s3_bucket_name,
                            job.original_file,
                            job,
                            'original',
                            dry_run,
                            skip_existing
                        )
                        if result == 'migrated':
                            migrated_count += 1
                        elif result == 'skipped':
                            skipped_count += 1
                        elif result == 'error':
                            error_count += 1

                    # Migrate output file
                    if job.output_file:
                        result = self._migrate_file(
                            s3_client,
                            site_settings.s3_bucket_name,
                            job.output_file,
                            job,
                            'output',
                            dry_run,
                            skip_existing
                        )
                        if result == 'migrated':
                            migrated_count += 1
                        elif result == 'skipped':
                            skipped_count += 1
                        elif result == 'error':
                            error_count += 1

                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(f'Error processing job {job.id}: {e}')
                    )
                    error_count += 1

            # Progress update
            processed = min(i + batch_size, total_jobs)
            self.stdout.write(f'Progress: {processed}/{total_jobs} jobs processed')

        # Summary
        self.stdout.write('\n' + '=' * 50)
        self.stdout.write(self.style.SUCCESS('Migration Summary:'))
        self.stdout.write(f'  Total jobs: {total_jobs}')
        self.stdout.write(f'  Files migrated: {migrated_count}')
        self.stdout.write(f'  Files skipped: {skipped_count}')
        self.stdout.write(f'  Errors: {error_count}')
        self.stdout.write('=' * 50)

    def _migrate_file(self, s3_client, bucket_name, file_field, job, file_type, dry_run, skip_existing):
        """Migrate a single file to S3."""
        try:
            # Get local file path
            if not file_field.name:
                return 'skipped'

            local_path = file_field.path if hasattr(file_field, 'path') else None
            
            # Check if file is already on S3 (starts with http/https or s3://)
            if file_field.name.startswith(('http://', 'https://', 's3://')):
                self.stdout.write(
                    f'  [{job.id}] {file_type} file already on S3: {file_field.name}'
                )
                return 'skipped'

            # Check if local file exists
            if not local_path or not os.path.exists(local_path):
                self.stdout.write(
                    self.style.WARNING(f'  [{job.id}] {file_type} file not found locally: {local_path}')
                )
                return 'error'

            # S3 key (path in bucket) - use the same path structure
            s3_key = file_field.name

            # Check if file already exists in S3
            if skip_existing:
                try:
                    s3_client.head_object(Bucket=bucket_name, Key=s3_key)
                    self.stdout.write(
                        f'  [{job.id}] {file_type} file already exists in S3: {s3_key}'
                    )
                    return 'skipped'
                except ClientError:
                    # File doesn't exist, proceed with upload
                    pass

            if dry_run:
                file_size = os.path.getsize(local_path)
                self.stdout.write(
                    f'  [DRY RUN] Would migrate {file_type} file: {s3_key} ({self._format_size(file_size)})'
                )
                return 'migrated'

            # Upload to S3
            file_size = os.path.getsize(local_path)
            self.stdout.write(
                f'  [{job.id}] Uploading {file_type} file to S3...'
            )
            self.stdout.write(f'    Local path: {local_path}')
            self.stdout.write(f'    S3 key: {s3_key}')
            self.stdout.write(f'    Size: {self._format_size(file_size)}')

            try:
                with open(local_path, 'rb') as f:
                    s3_client.upload_fileobj(
                        f,
                        bucket_name,
                        s3_key,
                        ExtraArgs={
                            'ContentType': 'application/octet-stream',
                        }
                    )
                
                # Verify upload by checking if file exists in S3
                try:
                    s3_client.head_object(Bucket=bucket_name, Key=s3_key)
                    self.stdout.write(
                        self.style.SUCCESS(f'    ✓ Upload verified - file exists in S3')
                    )
                except ClientError as verify_error:
                    self.stdout.write(
                        self.style.ERROR(f'    ✗ Upload verification failed: {verify_error}')
                    )
                    return 'error'

                # Update file field to point to S3
                # The file_field.name already contains the correct path
                # We just need to ensure Django knows it's on S3
                with transaction.atomic():
                    if file_type == 'original':
                        job.original_file.name = s3_key
                    else:
                        job.output_file.name = s3_key
                    job.save(update_fields=[f'{file_type}_file'])
                
                # Verify the file field was updated
                job.refresh_from_db()
                updated_field = job.original_file if file_type == 'original' else job.output_file
                self.stdout.write(
                    self.style.SUCCESS(f'    ✓ Database updated - file field: {updated_field.name}')
                )

                self.stdout.write(
                    self.style.SUCCESS(f'  [{job.id}] ✓ {file_type} file migrated successfully\n')
                )
            except Exception as upload_error:
                self.stdout.write(
                    self.style.ERROR(f'    ✗ Upload failed: {type(upload_error).__name__}: {upload_error}')
                )
                import traceback
                self.stdout.write(traceback.format_exc())
                return 'error'

            # Optionally delete local file after successful migration
            # Uncomment the following lines if you want to delete local files after migration
            # try:
            #     os.remove(local_path)
            #     self.stdout.write(f'  [{job.id}] Local file deleted: {local_path}')
            # except Exception as e:
            #     self.stdout.write(
            #         self.style.WARNING(f'  [{job.id}] Could not delete local file: {e}')
            #     )

            return 'migrated'

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'  [{job.id}] Error migrating {file_type} file: {e}')
            )
            return 'error'

    def _format_size(self, size_bytes):
        """Format file size in human-readable format."""
        for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
            if size_bytes < 1024.0:
                return f'{size_bytes:.2f} {unit}'
            size_bytes /= 1024.0
        return f'{size_bytes:.2f} PB'
