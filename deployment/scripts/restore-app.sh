#!/bin/bash
set -e

echo "========================================"
echo " Feeder HMI - Restore from Backup"
echo "========================================"

APP_DIR="/opt/feeder-hmi"
BACKUP_DIR="/opt/backups"

if [ ! -d "$BACKUP_DIR" ]; then
  echo "Error: Backup directory not found at $BACKUP_DIR"
  exit 1
fi

# List available backups
echo "Available backups:"
echo ""
BACKUPS=($(ls -t "$BACKUP_DIR"/feeder-hmi-*.tar.gz 2>/dev/null))
if [ ${#BACKUPS[@]} -eq 0 ]; then
  echo "No backups found."
  exit 1
fi

for i in "${!BACKUPS[@]}"; do
  FILE="${BACKUPS[$i]}"
  SIZE=$(du -h "$FILE" | cut -f1)
  DATE=$(echo "$FILE" | grep -oP '\d{8}_\d{6}')
  echo "  [$((i+1))] $DATE  ($SIZE)"
done

echo ""
read -p "Enter number to restore (1-${#BACKUPS[@]}): " SELECTION

if ! [[ "$SELECTION" =~ ^[0-9]+$ ]] || [ "$SELECTION" -lt 1 ] || [ "$SELECTION" -gt "${#BACKUPS[@]}" ]; then
  echo "Invalid selection."
  exit 1
fi

SELECTED="${BACKUPS[$((SELECTION-1))]}"
echo "Selected: $SELECTED"

# Confirm
read -p "This will OVERWRITE current application. Continue? (y/N): " CONFIRM
if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
  echo "Restore cancelled."
  exit 0
fi

# Stop services
echo "Stopping services..."
pm2 stop feeder-backend 2>/dev/null || true

# Backup current state first
CURRENT_BACKUP="$BACKUP_DIR/pre-restore-$(date +%Y%m%d_%H%M%S).tar.gz"
if [ -d "$APP_DIR" ]; then
  echo "Backing up current state..."
  tar -czf "$CURRENT_BACKUP" -C "$(dirname "$APP_DIR")" "$(basename "$APP_DIR")" 2>/dev/null || true
fi

# Restore
echo "Restoring from backup..."
rm -rf "$APP_DIR"
mkdir -p "$APP_DIR"
tar -xzf "$SELECTED" -C "$(dirname "$APP_DIR")"

# Install dependencies
echo "Installing dependencies..."
cd "$APP_DIR"
npm install
cd server && npm install && cd ..

# Build
echo "Building..."
npm run build

# Restart services
echo "Restarting services..."
pm2 start feeder-backend 2>/dev/null || pm2 restart feeder-backend
nginx -t && systemctl reload nginx

echo ""
echo "✓ Restore complete from: $(basename "$SELECTED")"
