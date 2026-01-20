# Portainer Deployment

This guide explains how to deploy mkv2castUI using Portainer stacks.

## Overview

Portainer provides a web-based interface for managing Docker containers and stacks. mkv2castUI can be deployed as a Portainer stack with a simple copy-paste operation.

**Why Portainer?**
- ✅ Web-based GUI - no command line needed
- ✅ One-click deployment
- ✅ Easy management and monitoring
- ✅ Built-in logs and console access
- ✅ Simple updates and scaling

## Prerequisites

- Portainer installed and running
- Docker and Docker Compose available to Portainer
- 4GB RAM minimum (8GB recommended)
- 20GB disk space

## Deployment Methods

### Method 1: Using Stack File (Recommended)

1. **Open Portainer**
   - Navigate to your Portainer instance (usually http://your-server:9000)
   - Go to **Stacks** > **Add Stack**

2. **Configure Stack**
   - **Name**: `mkv2castui` (or any name you prefer)
   - **Build method**: Select **Web editor**
   - **Stack file**: Copy contents from [`portainer/stack.yml`](https://raw.githubusercontent.com/voldardard/mkv2castUI/main/portainer/stack.yml)
     - Or download: `wget https://raw.githubusercontent.com/voldardard/mkv2castUI/main/portainer/stack.yml`

3. **Set Environment Variables**
   - Scroll down to **Environment variables** section
   - Click **Add environment variable** for each required variable
   - Or edit the stack file directly to add variables like:
     ```yaml
     environment:
       - DJANGO_SECRET_KEY=${DJANGO_SECRET_KEY}
       - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
     ```
   - Then add values in the Environment variables section below

4. **Deploy**
   - Review your configuration
   - Click **Deploy the stack**
   - Wait for services to start (may take 1-2 minutes)
   - Check status in the Stacks view

### Method 2: Using App Template

1. **Import Template** (if available)
   - Go to **App Templates** in Portainer
   - Import `portainer/app-template.json`
   - Or manually add the template configuration

2. **Deploy from Template**
   - Select **mkv2castUI** template
   - Fill in environment variables
   - Click **Deploy**

### Method 3: Using Git Repository (Best for Updates)

1. **Add Stack from Git**
   - Go to **Stacks** > **Add Stack**
   - Select **Repository**
   - **Repository URL**: `https://github.com/voldardard/mkv2castUI`
   - **Repository reference**: `main` (or specific branch/tag like `v1.0.0`)
   - **Compose path**: `portainer/stack.yml`
   - **Authentication**: Leave empty for public repository

2. **Configure and Deploy**
   - Set environment variables in the form below
   - Or use **Environment variables** section
   - Click **Deploy the stack**
   - **Note**: This method allows easy updates via "Pull and redeploy" button

## Configuration

### Required Environment Variables

**Minimum required for deployment:**

```yaml
DJANGO_SECRET_KEY: "your-secret-key-here"  # Generate: openssl rand -hex 32
POSTGRES_PASSWORD: "your-secure-password"  # Use strong password
DJANGO_ALLOWED_HOSTS: "localhost,your-domain.com"  # Comma-separated, no spaces
```

**Quick generation:**
```bash
# On your local machine or server
openssl rand -hex 32  # For DJANGO_SECRET_KEY
openssl rand -hex 16  # For POSTGRES_PASSWORD
```

**For local mode (no authentication):**
```yaml
REQUIRE_AUTH: "false"  # Add this to skip OAuth setup
```

### Optional Environment Variables

```yaml
# Authentication
REQUIRE_AUTH: "false"  # Set to false for local mode

# OAuth (if REQUIRE_AUTH=true)
GOOGLE_CLIENT_ID: "your-google-client-id"
GOOGLE_CLIENT_SECRET: "your-google-client-secret"
GITHUB_CLIENT_ID: "your-github-client-id"
GITHUB_CLIENT_SECRET: "your-github-client-secret"
NEXTAUTH_SECRET: "your-nextauth-secret"

# Hardware Acceleration
MKV2CAST_DEFAULT_HW: "auto"  # Options: auto, cpu, vaapi, qsv, nvenc

# Storage
USE_S3: "false"  # Set to true for external S3
S3_ENDPOINT: "https://s3.amazonaws.com"
S3_ACCESS_KEY: "your-access-key"
S3_SECRET_KEY: "your-secret-key"
S3_BUCKET_NAME: "mkv2cast"
```

### Setting Variables in Portainer

**Method 1: Environment Variables Section (Recommended)**
1. In the stack creation form, scroll to **Environment variables**
2. Click **Add environment variable**
3. Enter variable name (e.g., `DJANGO_SECRET_KEY`)
4. Enter variable value (e.g., your generated secret key)
5. Repeat for all required variables

**Method 2: In Stack File**
1. Edit the stack file directly in the web editor
2. Add variables like:
   ```yaml
   environment:
     - DJANGO_SECRET_KEY=${DJANGO_SECRET_KEY}
     - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
   ```
3. Then add actual values in the **Environment variables** section below

**Method 3: Using .env File**
1. Create a `.env` file with your variables
2. Some Portainer versions support uploading `.env` files
3. Or copy-paste contents into environment variables section

**Example Environment Variables Setup:**
```
DJANGO_SECRET_KEY = a1b2c3d4e5f6... (64 character hex string)
POSTGRES_PASSWORD = MySecurePassword123!
DJANGO_ALLOWED_HOSTS = localhost,192.168.1.100,mkv2cast.example.com
REQUIRE_AUTH = false
NGINX_PORT = 8080
```

## Production Stack

For production deployments, use `portainer/stack-prod.yml`:
- Uses external S3 storage (no MinIO)
- Optimized for production workloads
- Health checks configured

### Deploying Production Stack

1. Use `portainer/stack-prod.yml` instead of `stack.yml`
2. Configure S3 credentials:
   ```yaml
   USE_S3: "true"
   S3_ENDPOINT: "https://s3.amazonaws.com"
   S3_ACCESS_KEY: "your-key"
   S3_SECRET_KEY: "your-secret"
   S3_BUCKET_NAME: "mkv2cast"
   ```

## Managing the Stack

### View Logs

1. Go to **Stacks** > **mkv2castui**
2. Click on a service to view logs
3. Or use **Logs** tab in stack view

### Restart Services

1. Go to **Stacks** > **mkv2castui**
2. Select service(s)
3. Click **Restart**

### Update Stack

1. **Pull Latest Images**:
   - Go to **Stacks** > **mkv2castui**
   - Click **Editor**
   - Update image tags if needed
   - Click **Update the stack**

2. **Update from Git**:
   - If using Git repository method
   - Click **Pull and redeploy** in stack settings

### Scale Services

1. Go to **Stacks** > **mkv2castui**
2. Select service (e.g., `celery`)
3. Click **Duplicate/Edit**
4. Adjust replica count
5. Deploy

## Creating Admin User

After deployment, create an admin user to access the application:

**Method 1: Via Portainer Console (Recommended)**
1. Go to **Stacks** > **mkv2castui**
2. Find and click on the `backend` service
3. Click **Console** tab
4. Select **bash** or **sh** as shell
5. Click **Connect**
6. Run the command:
   ```bash
   python manage.py createadminuser \
     --username admin \
     --email admin@example.com \
     --password 'YourSecurePassword123!'
   ```
7. You should see: `Admin user 'admin' created successfully!`

**Method 2: Via Containers View**
1. Go to **Containers**
2. Find `mkv2cast-backend` container
3. Click on it
4. Go to **Console** tab
5. Select shell and connect
6. Run the same command as above

**Method 3: Using Exec (Advanced)**
1. Go to **Containers** > **mkv2cast-backend**
2. Click **Execute container**
3. Command: `python manage.py createadminuser --username admin --email admin@example.com --password 'YourPassword'`
4. Click **Execute**

**Note:** After creating the admin user, you can log in at `http://your-server:8080` (or your configured port).

## Accessing the Application

After deployment and creating an admin user:

1. **Check Service Status**
   - Go to **Stacks** > **mkv2castui**
   - Verify all services show as "Running" (green)
   - If any service is red/yellow, check logs

2. **Access Web Interface**
   - Open browser: `http://your-server:8080`
   - Or use the port configured in `NGINX_PORT` variable
   - Default port is `8080`

3. **First Login**
   - If `REQUIRE_AUTH=false`: No login needed, access directly
   - If `REQUIRE_AUTH=true`: Use OAuth (Google/GitHub) or admin credentials

4. **Troubleshooting Access**
   - Check `nginx` container logs if page doesn't load
   - Verify `NGINX_PORT` matches your access URL
   - Check firewall rules allow the port
   - Ensure `DJANGO_ALLOWED_HOSTS` includes your domain/IP

## Troubleshooting

### Services Won't Start

1. **Check Logs**:
   - View container logs in Portainer
   - Look for error messages

2. **Verify Environment Variables**:
   - Ensure all required variables are set
   - Check for typos in variable names

3. **Check Resources**:
   - Verify sufficient RAM/disk space
   - Check Docker resource limits

### Database Connection Errors

1. **Wait for Database**:
   - PostgreSQL may need time to initialize
   - Check `postgres` container logs

2. **Verify DATABASE_URL**:
   - Should be: `postgresql://mkv2cast:password@postgres:5432/mkv2cast`
   - Match with POSTGRES_USER and POSTGRES_PASSWORD

### Port Conflicts

1. **Change Port**:
   - Set `NGINX_PORT` to different value (e.g., `8081`)
   - Update stack and redeploy

### Volume Permissions

1. **Check Volume Access**:
   - Ensure Docker has permission to create volumes
   - Check volume mounts in stack configuration

## Advanced Configuration

### Hardware Acceleration

For VAAPI (Intel/AMD GPU):
1. Ensure `/dev/dri` is accessible
2. Stack file already includes device mount for `celery` service
3. Set `MKV2CAST_DEFAULT_HW=vaapi`

For NVIDIA:
1. Install nvidia-docker2 on host
2. Add to `celery` service:
   ```yaml
   runtime: nvidia
   environment:
     - NVIDIA_VISIBLE_DEVICES=all
   ```

### Custom Networks

If using custom networks:
1. Update `networks` section in stack file
2. Ensure all services use the same network

### Resource Limits

Add resource limits to services:
```yaml
deploy:
  resources:
    limits:
      cpus: '2'
      memory: 4G
    reservations:
      cpus: '1'
      memory: 2G
```

## Backup and Restore

### Database Backup

1. Use Portainer console on `postgres` container:
   ```bash
   pg_dump -U mkv2cast mkv2cast > /backup.sql
   ```

2. Copy backup from container:
   - Use Portainer's file browser
   - Or `docker cp` command

### Restore Database

1. Copy backup to container
2. Execute in `postgres` container:
   ```bash
   psql -U mkv2cast mkv2cast < /backup.sql
   ```

## Support

- **Documentation**: https://voldardard.github.io/mkv2castUI/
- **GitHub**: https://github.com/voldardard/mkv2castUI
- **Issues**: https://github.com/voldardard/mkv2castUI/issues
- **Portainer Docs**: https://docs.portainer.io/
