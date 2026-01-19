#!/bin/bash
set -e

echo "=== mkv2cast Backend Entrypoint ==="

# Wait for database to be ready
echo "Waiting for database..."
while ! python -c "import django; django.setup(); from django.db import connection; connection.ensure_connection()" 2>/dev/null; do
    echo "Database not ready, waiting..."
    sleep 2
done
echo "Database is ready!"

# Apply migrations if needed
echo "=== Checking for pending migrations ==="
PENDING=$(python manage.py showmigrations --plan 2>/dev/null | grep '\[ \]' | wc -l)
if [ "$PENDING" -gt 0 ]; then
    echo "Found $PENDING pending migrations, applying..."
    python manage.py migrate --noinput
    echo "Migrations applied successfully!"
else
    echo "All migrations are up to date."
fi

# Collect static files (only for main backend, not celery/daphne)
if [ "$1" = "gunicorn" ] || [ -z "$SKIP_COLLECTSTATIC" ]; then
    echo "=== Collecting static files ==="
    python manage.py collectstatic --noinput --clear 2>/dev/null || python manage.py collectstatic --noinput
    echo "Static files collected!"
fi

echo "=== Starting application ==="
exec "$@"
