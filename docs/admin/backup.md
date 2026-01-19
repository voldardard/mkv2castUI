# Backup and Recovery

Backup strategies for mkv2castUI data.

## What to Backup

| Component | Data | Priority |
|-----------|------|----------|
| PostgreSQL | Users, jobs, settings | Critical |
| Media files | Uploaded/converted videos | Important |
| Configuration | .env, docker-compose | Important |
| Redis | Sessions, cache | Optional |

## Database Backup

### Manual Backup

```bash
# Create backup
docker-compose exec postgres pg_dump -U mkv2cast mkv2cast > backup_$(date +%Y%m%d_%H%M%S).sql

# Compressed backup
docker-compose exec postgres pg_dump -U mkv2cast mkv2cast | gzip > backup_$(date +%Y%m%d).sql.gz
```

### Restore Database

```bash
# From SQL file
cat backup.sql | docker-compose exec -T postgres psql -U mkv2cast mkv2cast

# From compressed
gunzip -c backup.sql.gz | docker-compose exec -T postgres psql -U mkv2cast mkv2cast
```

### Automated Backup

Create `backup.sh`:
```bash
#!/bin/bash
BACKUP_DIR=/backups
DATE=$(date +%Y%m%d_%H%M%S)

# Database
docker-compose exec -T postgres pg_dump -U mkv2cast mkv2cast | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Keep last 7 days
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_DIR/db_$DATE.sql.gz"
```

Add to cron:
```bash
# Daily at 2 AM
0 2 * * * /path/to/backup.sh >> /var/log/mkv2cast-backup.log 2>&1
```

## Media Files Backup

### Local Storage

```bash
# Backup Docker volume
docker run --rm \
  -v mkv2castui_media_files:/data:ro \
  -v /backups:/backup \
  alpine tar czf /backup/media_$(date +%Y%m%d).tar.gz -C /data .
```

### S3 Storage

```bash
# Sync to backup bucket
aws s3 sync s3://mkv2cast-media s3://mkv2cast-backup-$(date +%Y%m%d)

# Or use rclone
rclone sync s3:mkv2cast-media backup:mkv2cast/$(date +%Y%m%d)
```

### Incremental Backup

Using rsync:
```bash
rsync -av --delete \
  /var/lib/docker/volumes/mkv2castui_media_files/_data/ \
  /backups/media/
```

## Configuration Backup

```bash
# Backup config files
tar czf config_backup.tar.gz .env docker-compose.yml nginx/
```

```{warning}
Store configuration backups securely - they contain secrets!
```

## Full System Backup

### Docker Compose

```bash
#!/bin/bash
BACKUP_DIR=/backups/$(date +%Y%m%d)
mkdir -p $BACKUP_DIR

# Stop services (optional, for consistency)
# docker-compose stop

# Database
docker-compose exec -T postgres pg_dump -U mkv2cast mkv2cast > $BACKUP_DIR/database.sql

# Media
docker run --rm \
  -v mkv2castui_media_files:/data:ro \
  -v $BACKUP_DIR:/backup \
  alpine tar czf /backup/media.tar.gz -C /data .

# Config
cp .env docker-compose.yml $BACKUP_DIR/

# Start services
# docker-compose start

echo "Full backup completed: $BACKUP_DIR"
```

### Kubernetes

Using Velero:
```bash
# Install Velero
velero install --provider aws --bucket mkv2cast-backup

# Create backup
velero backup create mkv2cast-full \
  --include-namespaces mkv2cast

# Schedule daily backup
velero schedule create daily \
  --schedule="0 2 * * *" \
  --include-namespaces mkv2cast \
  --ttl 168h
```

## Disaster Recovery

### Full Recovery

1. **Deploy fresh instance**
```bash
git clone https://github.com/voldardard/mkv2castUI.git
cd mkv2castUI
cp /backups/config/.env .
```

2. **Start database only**
```bash
docker-compose up -d postgres
sleep 10
```

3. **Restore database**
```bash
cat /backups/database.sql | docker-compose exec -T postgres psql -U mkv2cast mkv2cast
```

4. **Restore media**
```bash
docker run --rm \
  -v mkv2castui_media_files:/data \
  -v /backups:/backup \
  alpine tar xzf /backup/media.tar.gz -C /data
```

5. **Start all services**
```bash
docker-compose up -d
```

### Point-in-Time Recovery

For PostgreSQL with WAL archiving:

```bash
# Enable in postgresql.conf
archive_mode = on
archive_command = 'cp %p /backups/wal/%f'

# Recover to specific time
recovery_target_time = '2026-01-19 10:30:00'
```

## Backup Verification

### Test Restore

Regularly test backups:

```bash
# Create test database
docker-compose exec postgres createdb -U mkv2cast mkv2cast_test

# Restore to test
cat backup.sql | docker-compose exec -T postgres psql -U mkv2cast mkv2cast_test

# Verify
docker-compose exec postgres psql -U mkv2cast mkv2cast_test -c "SELECT COUNT(*) FROM conversions_conversionjob"

# Cleanup
docker-compose exec postgres dropdb -U mkv2cast mkv2cast_test
```

### Checksum Verification

```bash
# Generate checksum
sha256sum backup.sql.gz > backup.sql.gz.sha256

# Verify
sha256sum -c backup.sql.gz.sha256
```

## Offsite Backup

### Cloud Storage

```bash
# AWS S3
aws s3 cp /backups/db_latest.sql.gz s3://company-backups/mkv2cast/

# Google Cloud Storage
gsutil cp /backups/db_latest.sql.gz gs://company-backups/mkv2cast/

# Backblaze B2
b2 upload-file company-backups /backups/db_latest.sql.gz mkv2cast/db_latest.sql.gz
```

### Encrypted Backup

```bash
# Encrypt before upload
gpg --symmetric --cipher-algo AES256 backup.sql.gz

# Decrypt for restore
gpg --decrypt backup.sql.gz.gpg > backup.sql.gz
```
