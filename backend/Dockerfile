FROM python:3.12-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app
ENV DJANGO_SETTINGS_MODULE=mkv2cast_api.settings

# Install system dependencies
# Enable non-free-firmware repo for Intel VA-API drivers
RUN echo "deb http://deb.debian.org/debian trixie main contrib non-free non-free-firmware" > /etc/apt/sources.list.d/nonfree.list && \
    apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libpq-dev \
    gcc \
    git \
    vainfo \
    intel-media-va-driver \
    mesa-va-drivers \
    # Pillow dependencies
    libjpeg-dev \
    zlib1g-dev \
    libtiff-dev \
    libfreetype6-dev \
    liblcms2-dev \
    libwebp-dev \
    libopenjp2-7-dev \
    && rm -rf /var/lib/apt/lists/*

# Set work directory
WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project files
COPY . .

# Make entrypoint executable
RUN chmod +x /app/entrypoint.sh

# Create media directories with proper permissions
RUN mkdir -p /app/media/uploads /app/media/outputs /app/static && \
    chmod -R 777 /app/media /app/static

# Expose port
EXPOSE 8000

# Use entrypoint for migrations and setup
ENTRYPOINT ["/app/entrypoint.sh"]

# Default command (can be overridden in docker-compose)
CMD ["gunicorn", "mkv2cast_api.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "4"]
