#!/bin/bash
set -e

echo "========================================"
echo " Feeder HMI - Backup"
echo "========================================"

APP_DIR="/opt/feeder-hmi"
BACKUP_DIR="/opt/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/feeder-hmi-$DATE.tar.gz"

if [ ! -d "$APP_DIR" ]; then
  echo "Error: Application directory not found."
  exit 1
fi

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

# Create backup
echo "Creating backup: $BACKUP_FILE"
tar -czf "$BACKUP_FILE" \
  -C "$(dirname "$APP_DIR")" \
  --exclude="node_modules" \
  --exclude="dist" \
  --exclude="server/node_modules" \
  --exclude="server/dist" \
  --exclude=".git" \
  "$(basename "$APP_DIR")"

# Check backup integrity
echo "Verifying backup integrity..."
tar -tzf "$BACKUP_FILE" > /dev/null 2>&1 && echo "✓ Backup verified" || echo "⚠ Backup may be corrupted"

# Get file size
SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "Backup size: $SIZE"

# Clean old backups (keep last 14 days)
find "$BACKUP_DIR" -name "feeder-hmi-*.tar.gz" -mtime +14 -delete

echo ""
echo "✓ Backup complete: $BACKUP_FILE"
echo "Backups retained: $(find "$BACKUP_DIR" -name 'feeder-hmi-*.tar.gz' | wc -l)"
