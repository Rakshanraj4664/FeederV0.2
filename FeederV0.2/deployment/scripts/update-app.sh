#!/bin/bash
set -e

echo "========================================"
echo " Feeder HMI - Application Update"
echo "========================================"

APP_DIR="/opt/feeder-hmi"

if [ ! -d "$APP_DIR" ]; then
  echo "Error: Application directory not found."
  exit 1
fi

cd "$APP_DIR"

# Backup current version
BACKUP_DIR="/opt/backups/feeder-hmi-$(date +%Y%m%d_%H%M%S)"
echo "Creating backup at $BACKUP_DIR..."
mkdir -p "$BACKUP_DIR"
cp -r . "$BACKUP_DIR"
echo "✓ Backup created"

# Pull latest changes (if git repo)
if [ -d ".git" ]; then
  echo "Pulling latest changes from git..."
  git pull
fi

# Install dependencies
echo "Updating frontend dependencies..."
npm install

echo "Updating backend dependencies..."
cd server && npm install && cd ..

# Build
echo "Building frontend..."
npm run build

# Restart services
echo "Restarting services..."
pm2 restart feeder-backend
pm2 restart feeder-frontend 2>/dev/null || true

# Reload Nginx
nginx -t && systemctl reload nginx

echo ""
echo "✓ Update complete!"
echo "Current version: $(date)"
pm2 status
