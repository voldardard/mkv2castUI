# Quick Start

Get mkv2castUI running in 5 minutes!

## Step 1: Clone the Repository

```bash
git clone https://github.com/voldardard/mkv2castUI.git
cd mkv2castUI
```

## Step 2: Configure Environment

```bash
# Copy the example configuration
cp .env.example .env
```

For quick local testing, enable local mode (no authentication required):

```bash
# Edit .env and add:
REQUIRE_AUTH=false
DJANGO_SECRET_KEY=dev-secret-key-change-in-production
POSTGRES_PASSWORD=dev-password
```

## Step 3: Build and Start

```bash
# Build all containers
docker-compose build

# Start in background
docker-compose up -d
```

Wait for all services to start (about 30-60 seconds on first run):

```bash
# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

## Step 4: Access the Application

Open your browser and navigate to:

**http://localhost:8080**

You should see the mkv2castUI home page!

```{image} /_static/screenshots/homepage.png
:alt: mkv2castUI Homepage
:class: screenshot
:align: center
```

## Step 5: Convert Your First Video

1. **Drag and drop** an MKV file onto the upload area
2. **Configure options** (or use defaults):
   - Output format: MKV (Chromecast-compatible)
   - Hardware: Auto (will use GPU if available)
   - Quality: 20 (high quality)
3. Click **Start Conversion**
4. Watch the real-time progress
5. **Download** when complete!

## What's Next?

### Enable Hardware Acceleration

If you have an Intel or AMD GPU:

```bash
# Check if VAAPI is available
docker-compose exec celery vainfo
```

If it shows available profiles, hardware acceleration is working!

### Enable Authentication

For multi-user or public deployments:

1. Set up OAuth credentials (Google/GitHub)
2. Update `.env`:

```bash
REQUIRE_AUTH=true
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
```

3. Restart:

```bash
docker-compose down
docker-compose up -d
```

### Check Conversion History

Navigate to **History** in the menu to see all your conversions.

### Explore Advanced Options

Click **Show Advanced Options** when converting to access:

- Video quality (CRF)
- Encoding preset
- Force H.264/AAC
- Integrity checking

## Troubleshooting

### Services Won't Start

```bash
# Check logs
docker-compose logs backend
docker-compose logs celery

# Common fixes:
# 1. Wait longer - database might still be initializing
# 2. Check disk space
# 3. Verify port 8080 is free
```

### Upload Fails

```bash
# Check max file size
echo $MKV2CAST_MAX_FILE_SIZE

# Increase in .env if needed:
MKV2CAST_MAX_FILE_SIZE=21474836480  # 20GB
```

### Conversion Stuck

```bash
# Check Celery worker
docker-compose logs celery

# Restart worker
docker-compose restart celery
```

## Learn More

- {doc}`configuration` - All configuration options
- {doc}`/user-guide/conversion-options` - Understand all options
- {doc}`/user-guide/hardware-acceleration` - GPU encoding setup
- {doc}`/deployment/docker` - Production deployment
