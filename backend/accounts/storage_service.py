"""
Storage service for S3/MinIO operations.

Provides unified interface for S3-compatible storage (MinIO local or external S3).
Handles presigned URLs, file operations, and automatic region detection.
"""
import re
import boto3
from botocore.config import Config
from botocore.exceptions import ClientError, NoCredentialsError
from django.conf import settings
from accounts.models import SiteSettings


class StorageService:
    """
    Service for managing S3/MinIO storage operations.
    
    Uses SiteSettings for dynamic configuration, supporting both
    MinIO local and external S3 (like Exoscale).
    """
    
    def __init__(self):
        self._client = None
        self._bucket_name = None
        self._endpoint_url = None
        self._region = None
    
    def _get_config(self):
        """Get storage configuration from SiteSettings."""
        site_settings = SiteSettings.get_settings()
        
        # Priority: SiteSettings > Environment variables > MinIO defaults
        if site_settings.use_s3_storage and site_settings.s3_endpoint:
            # Use S3 configuration from SiteSettings
            endpoint = site_settings.s3_endpoint
            access_key = site_settings.s3_access_key
            secret_key = site_settings.s3_secret_key
            bucket = site_settings.s3_bucket_name
            region = site_settings.s3_region or self._extract_region_from_endpoint(endpoint)
        else:
            # Fallback to MinIO local
            endpoint = getattr(settings, 'MINIO_ENDPOINT', 'http://minio:9000')
            access_key = getattr(settings, 'MINIO_ACCESS_KEY', 'minioadmin')
            secret_key = getattr(settings, 'MINIO_SECRET_KEY', 'minioadmin')
            bucket = getattr(settings, 'MINIO_BUCKET_NAME', 'mkv2cast')
            region = 'us-east-1'  # MinIO doesn't care about region
        
        return {
            'endpoint': endpoint,
            'access_key': access_key,
            'secret_key': secret_key,
            'bucket': bucket,
            'region': region,
        }
    
    def _extract_region_from_endpoint(self, endpoint_url: str) -> str:
        """
        Extract region from Exoscale S3 endpoint URL.
        
        Example: https://sos-ch-gva-2.exo.io/ -> ch-gva-2
        """
        if not endpoint_url:
            return 'us-east-1'
        
        # Pattern for Exoscale: sos-{region}.exo.io
        match = re.search(r'sos-([a-z0-9-]+)\.exo\.io', endpoint_url)
        if match:
            return match.group(1)
        
        # Pattern for AWS: s3.{region}.amazonaws.com
        match = re.search(r's3\.([a-z0-9-]+)\.amazonaws\.com', endpoint_url)
        if match:
            return match.group(1)
        
        # Default fallback
        return 'us-east-1'
    
    def get_s3_client(self):
        """Get or create boto3 S3 client with current configuration."""
        config = self._get_config()
        
        # Check if we need to recreate client (config changed)
        if (self._client is None or 
            self._endpoint_url != config['endpoint'] or
            self._region != config['region']):
            
            # Configure boto3 client
            boto_config = Config(
                signature_version='s3v4',
                s3={
                    'addressing_style': 'path' if 'minio' in config['endpoint'] else 'auto'
                }
            )
            
            self._client = boto3.client(
                's3',
                endpoint_url=config['endpoint'],
                aws_access_key_id=config['access_key'],
                aws_secret_access_key=config['secret_key'],
                region_name=config['region'],
                config=boto_config,
            )
            
            self._endpoint_url = config['endpoint']
            self._region = config['region']
            self._bucket_name = config['bucket']
        
        return self._client
    
    def get_bucket_name(self):
        """Get current bucket name."""
        if self._bucket_name is None:
            config = self._get_config()
            self._bucket_name = config['bucket']
        return self._bucket_name
    
    def generate_presigned_put_url(self, key: str, expiry: int = 3600, content_type: str = 'application/octet-stream'):
        """
        Generate presigned PUT URL for direct file upload.
        
        Args:
            key: S3 object key (path)
            expiry: URL expiration time in seconds (default: 1 hour)
            content_type: Content type for the file
            
        Returns:
            Presigned URL string
        """
        client = self.get_s3_client()
        bucket = self.get_bucket_name()
        
        try:
            url = client.generate_presigned_url(
                'put_object',
                Params={
                    'Bucket': bucket,
                    'Key': key,
                    'ContentType': content_type,
                },
                ExpiresIn=expiry,
            )
            return url
        except Exception as e:
            raise Exception(f"Failed to generate presigned PUT URL: {e}")
    
    def generate_presigned_get_url(self, key: str, expiry: int = 3600):
        """
        Generate presigned GET URL for file download.
        
        Args:
            key: S3 object key (path)
            expiry: URL expiration time in seconds (default: 1 hour)
            
        Returns:
            Presigned URL string
        """
        client = self.get_s3_client()
        bucket = self.get_bucket_name()
        
        try:
            url = client.generate_presigned_url(
                'get_object',
                Params={
                    'Bucket': bucket,
                    'Key': key,
                },
                ExpiresIn=expiry,
            )
            return url
        except Exception as e:
            raise Exception(f"Failed to generate presigned GET URL: {e}")
    
    def delete_file(self, key: str):
        """
        Delete a file from S3/MinIO.
        
        Args:
            key: S3 object key (path)
            
        Returns:
            True if deleted, False if not found
        """
        client = self.get_s3_client()
        bucket = self.get_bucket_name()
        
        try:
            client.delete_object(Bucket=bucket, Key=key)
            return True
        except ClientError as e:
            if e.response['Error']['Code'] == 'NoSuchKey':
                return False
            raise
    
    def file_exists(self, key: str) -> bool:
        """
        Check if a file exists in S3/MinIO.
        
        Args:
            key: S3 object key (path)
            
        Returns:
            True if file exists, False otherwise
        """
        client = self.get_s3_client()
        bucket = self.get_bucket_name()
        
        try:
            client.head_object(Bucket=bucket, Key=key)
            return True
        except ClientError as e:
            if e.response['Error']['Code'] == '404':
                return False
            raise
    
    def get_file_size(self, key: str) -> int:
        """
        Get file size from S3/MinIO.
        
        Args:
            key: S3 object key (path)
            
        Returns:
            File size in bytes
            
        Raises:
            Exception if file not found
        """
        client = self.get_s3_client()
        bucket = self.get_bucket_name()
        
        try:
            response = client.head_object(Bucket=bucket, Key=key)
            return response['ContentLength']
        except ClientError as e:
            if e.response['Error']['Code'] == '404':
                raise Exception(f"File not found: {key}")
            raise
    
    def upload_file(self, local_path: str, key: str, content_type: str = 'application/octet-stream'):
        """
        Upload a local file to S3/MinIO.
        
        Args:
            local_path: Path to local file
            key: S3 object key (path)
            content_type: Content type for the file
        """
        client = self.get_s3_client()
        bucket = self.get_bucket_name()
        
        try:
            with open(local_path, 'rb') as f:
                client.upload_fileobj(
                    f,
                    bucket,
                    key,
                    ExtraArgs={'ContentType': content_type}
                )
        except Exception as e:
            raise Exception(f"Failed to upload file: {e}")
    
    def download_file(self, key: str, local_path: str):
        """
        Download a file from S3/MinIO to local path.
        
        Args:
            key: S3 object key (path)
            local_path: Local path to save file
        """
        client = self.get_s3_client()
        bucket = self.get_bucket_name()
        
        try:
            client.download_file(bucket, key, local_path)
        except Exception as e:
            raise Exception(f"Failed to download file: {e}")
    
    def test_connection(self) -> dict:
        """
        Test connection to S3/MinIO storage.
        
        Returns:
            Dict with 'success' (bool) and 'message' (str)
        """
        try:
            client = self.get_s3_client()
            bucket = self.get_bucket_name()
            
            # Test bucket access
            client.head_bucket(Bucket=bucket)
            
            return {
                'success': True,
                'message': f'Successfully connected to bucket: {bucket}'
            }
        except NoCredentialsError:
            return {
                'success': False,
                'message': 'Invalid credentials'
            }
        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code', 'Unknown')
            if error_code == '404':
                return {
                    'success': False,
                    'message': f'Bucket "{bucket}" not found'
                }
            elif error_code == '403':
                return {
                    'success': False,
                    'message': f'Access denied to bucket "{bucket}"'
                }
            return {
                'success': False,
                'message': f'Connection error: {e}'
            }
        except Exception as e:
            return {
                'success': False,
                'message': f'Unexpected error: {e}'
            }


# Singleton instance
_storage_service = None

def get_storage_service() -> StorageService:
    """Get singleton StorageService instance."""
    global _storage_service
    if _storage_service is None:
        _storage_service = StorageService()
    return _storage_service
