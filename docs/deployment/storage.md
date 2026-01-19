# Storage Configuration

Configure storage for uploaded and converted video files.

## Storage Options

| Option | Best For | Pros | Cons |
|--------|----------|------|------|
| Local | Single server | Fast, simple | Not scalable |
| S3 | Multi-server | Scalable, durable | Network latency |
| NFS | Kubernetes | Shared access | Complex setup |

## Local Storage (Default)

Files are stored in Docker volumes by default.

### Configuration

```yaml
# docker-compose.yml
volumes:
  media_files:
    driver: local
```

### Custom Path

```yaml
volumes:
  media_files:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: /path/to/storage
```

### Permissions

```bash
# Ensure proper ownership
sudo chown -R 1000:1000 /path/to/storage
```

## S3-Compatible Storage

### AWS S3

```bash
# .env
USE_S3=true
S3_ACCESS_KEY=AKIAIOSFODNN7EXAMPLE
S3_SECRET_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
S3_BUCKET_NAME=mkv2cast-media
S3_REGION=us-east-1
```

### MinIO

```bash
# .env
USE_S3=true
S3_ENDPOINT=http://minio:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET_NAME=mkv2cast
S3_REGION=us-east-1
```

### DigitalOcean Spaces

```bash
# .env
USE_S3=true
S3_ENDPOINT=https://nyc3.digitaloceanspaces.com
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key
S3_BUCKET_NAME=mkv2cast
S3_REGION=nyc3
```

### Backblaze B2

```bash
# .env
USE_S3=true
S3_ENDPOINT=https://s3.us-west-000.backblazeb2.com
S3_ACCESS_KEY=your-key-id
S3_SECRET_KEY=your-application-key
S3_BUCKET_NAME=mkv2cast
S3_REGION=us-west-000
```

## Bucket Policy

For S3 storage, configure CORS:

```json
{
  "CORSRules": [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
      "AllowedOrigins": ["https://your-domain.com"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3600
    }
  ]
}
```

## File Organization

```
media/
├── uploads/           # Original uploaded files
│   └── {user_id}/
│       └── {job_id}/
│           └── input.mkv
├── outputs/           # Converted files
│   └── {user_id}/
│       └── {job_id}/
│           └── output.mkv
└── temp/              # Temporary files (auto-cleaned)
```

## Cleanup Policy

### Automatic Cleanup

Set retention period:

```bash
# .env
MKV2CAST_JOB_RETENTION_DAYS=30
```

Cleanup runs daily via Celery beat.

### Manual Cleanup

```bash
# Delete jobs older than 30 days
docker-compose exec backend python manage.py cleanup_jobs --days=30

# Delete orphaned files
docker-compose exec backend python manage.py cleanup_orphans
```

## Disk Space Monitoring

### Check Usage

```bash
# Docker volume
docker system df -v

# Host filesystem
df -h /path/to/storage
```

### Alerts

Configure alerts when disk usage exceeds threshold:

```yaml
# Prometheus alert rule
groups:
  - name: mkv2cast
    rules:
      - alert: HighDiskUsage
        expr: (node_filesystem_size_bytes - node_filesystem_free_bytes) / node_filesystem_size_bytes > 0.9
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High disk usage"
```

## Backup

### Local Storage

```bash
# Backup media volume
docker run --rm \
  -v mkv2castui_media_files:/data \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/media_$(date +%Y%m%d).tar.gz /data
```

### S3 Storage

Use AWS CLI or rclone:

```bash
# Sync to backup bucket
aws s3 sync s3://mkv2cast-media s3://mkv2cast-backup

# Or with rclone
rclone sync s3:mkv2cast-media backup:mkv2cast-backup
```

## Performance

### Local SSD

For best performance with local storage:
- Use NVMe SSD
- Ensure adequate IOPS
- Monitor disk latency

### S3 Performance

- Use regional bucket (same region as servers)
- Enable S3 Transfer Acceleration for uploads
- Consider S3 Express One Zone for low latency

### NFS Optimization

```bash
# Mount options for better performance
mount -t nfs4 -o rw,hard,intr,rsize=1048576,wsize=1048576 \
  nfs-server:/media /mnt/media
```
