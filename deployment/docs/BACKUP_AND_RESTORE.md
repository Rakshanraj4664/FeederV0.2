# Feeder Machine HMI — Backup & Restore Guide

Backup procedures, using the automated scripts, database/config backup strategy, and disaster recovery plan.

---

## Table of Contents

1. [Backup Strategy Overview](#1-backup-strategy-overview)
2. [Automated Backup Script](#2-automated-backup-script)
3. [Manual Backup Procedures](#3-manual-backup-procedures)
4. [Restore Script](#4-restore-script)
5. [Manual Restore Procedures](#5-manual-restore-procedures)
6. [SD Card Image Backup](#6-sd-card-image-backup)
7. [Configuration Backup Strategy](#7-configuration-backup-strategy)
8. [Disaster Recovery Plan](#8-disaster-recovery-plan)

---

## 1. Backup Strategy Overview

### 1.1 — What Gets Backed Up

| Component | Included | Excluded | Location |
|-----------|----------|----------|----------|
| Application source code | All files | `node_modules/`, `dist/`, `.git/` | `/opt/feeder-hmi/` |
| PM2 ecosystem config | `ecosystem.config.js` | — | `/opt/feeder-hmi/server/` |
| Nginx configuration | Included via source | — | `/opt/feeder-hmi/deployment/nginx/` |
| Device whitelist | `whitelist.txt` | — | `/opt/feeder-hmi/deployment/whitelist/` |
| Logs | **Not included** (transient) | `logs/` | `/opt/feeder-hmi/server/logs/` |

### 1.2 — What Is NOT Backed Up (and Why)

| Item | Reason | Recovery Method |
|------|--------|-----------------|
| npm packages (`node_modules/`) | Rebuildable from `package.json` | `npm install` during restore |
| Built frontend (`dist/`) | Rebuildable from source | `npm run build` during restore |
| PLC register values | Stored in PLC non-volatile memory | Not needed — PLC retains values |
| OS configuration | Separate backup strategy | Re-image SD card, re-run setup scripts |

### 1.3 — Backup Retention Policy

| Backup Type | Frequency | Retention | Location |
|-------------|-----------|-----------|----------|
| Automated (script) | On-demand or cron | 14 days (auto-cleanup) | `/opt/backups/` |
| Pre-restore snapshot | Before each restore | Kept until manually cleaned | `/opt/backups/pre-restore-*.tar.gz` |
| Pre-update snapshot | Before each update | Kept until update is stable | `/opt/backups/` |
| SD card image | Monthly or after config changes | 3 most recent images | External storage |

---

## 2. Automated Backup Script

### 2.1 — Script Location

```
/opt/feeder-hmi/deployment/scripts/backup-app.sh
```

### 2.2 — What the Script Does

```bash
#!/bin/bash
set -e

APP_DIR="/opt/feeder-hmi"
BACKUP_DIR="/opt/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/feeder-hmi-$DATE.tar.gz"

# Creates backup directory if missing
mkdir -p "$BACKUP_DIR"

# Creates compressed archive
tar -czf "$BACKUP_FILE" \
  -C "$(dirname "$APP_DIR")" \
  --exclude="node_modules" \
  --exclude="dist" \
  --exclude="server/node_modules" \
  --exclude="server/dist" \
  --exclude=".git" \
  "$(basename "$APP_DIR")"

# Verifies archive integrity
tar -tzf "$BACKUP_FILE" > /dev/null 2>&1

# Reports size
SIZE=$(du -h "$BACKUP_FILE" | cut -f1)

# Cleans backups older than 14 days
find "$BACKUP_DIR" -name "feeder-hmi-*.tar.gz" -mtime +14 -delete
```

### 2.3 — Running the Backup

```bash
# Run manually
sudo bash /opt/feeder-hmi/deployment/scripts/backup-app.sh
```

Expected output:

```
========================================
 Feeder HMI - Backup
========================================
Creating backup: /opt/backups/feeder-hmi-20260624_143000.tar.gz
Verifying backup integrity...
✓ Backup verified
Backup size: 4.2M

✓ Backup complete: /opt/backups/feeder-hmi-20260624_143000.tar.gz
Backups retained: 5
```

### 2.4 — Scheduling Automatic Backups with Cron

```bash
# Edit root's crontab
sudo crontab -e
```

Add one of the following lines:

```cron
# Daily at 3:00 AM
0 3 * * * /bin/bash /opt/feeder-hmi/deployment/scripts/backup-app.sh >> /var/log/feeder-hmi/backup.log 2>&1

# Weekly on Sunday at 4:00 AM
0 4 * * 0 /bin/bash /opt/feeder-hmi/deployment/scripts/backup-app.sh >> /var/log/feeder-hmi/backup.log 2>&1

# Every 12 hours
0 */12 * * * /bin/bash /opt/feeder-hmi/deployment/scripts/backup-app.sh >> /var/log/feeder-hmi/backup.log 2>&1
```

Verify the cron job:

```bash
sudo crontab -l
```

### 2.5 — Listing Available Backups

```bash
ls -lh /opt/backups/
```

Example output:

```
-rw-r--r-- 1 root root 4.2M Jun 24 03:00 feeder-hmi-20260624_030000.tar.gz
-rw-r--r-- 1 root root 4.1M Jun 23 03:00 feeder-hmi-20260623_030000.tar.gz
-rw-r--r-- 1 root root 4.3M Jun 22 03:00 feeder-hmi-20260622_030000.tar.gz
```

---

## 3. Manual Backup Procedures

### 3.1 — Manual Archive Backup

```bash
# Create a timestamped backup manually
sudo tar -czf /opt/backups/feeder-hmi-manual-$(date +%Y%m%d_%H%M%S).tar.gz \
  -C /opt \
  --exclude="node_modules" \
  --exclude="dist" \
  --exclude=".git" \
  feeder-hmi
```

### 3.2 — Backup with Git (if repository is used)

```bash
cd /opt/feeder-hmi
git add -A
git commit -m "backup: $(date +%Y-%m-%d_%H:%M)"
git push origin main
```

### 3.3 — Copy Backup Off-Device

From your development machine:

```bash
# SCP the latest backup
scp pi@192.168.1.50:/opt/backups/feeder-hmi-*.tar.gz /local/backup/directory/

# Or use rsync
rsync -avz pi@192.168.1.50:/opt/backups/ /local/backup/directory/
```

### 3.4 — Backup Configuration Files Only

```bash
# Backup only configs (lighter weight)
sudo tar -czf /opt/backups/feeder-config-$(date +%Y%m%d).tar.gz \
  /opt/feeder-hmi/server/ecosystem.config.js \
  /opt/feeder-hmi/server/src/config.ts \
  /opt/feeder-hmi/deployment/nginx/nginx.conf \
  /opt/feeder-hmi/deployment/whitelist/whitelist.txt \
  /etc/dhcpcd.conf
```

---

## 4. Restore Script

### 4.1 — Script Location

```
/opt/feeder-hmi/deployment/scripts/restore-app.sh
```

### 4.2 — Interactive Restore Flow

```
Restore Script
       │
       ▼
List available backups (numbered menu)
       │
       ▼
User selects a backup number
       │
       ▼
Confirm: "This will OVERWRITE current application. Continue? (y/N)"
       │
       ├── No ──▶ Exit
       │
       └── Yes ─▶ Stop services (pm2 stop feeder-backend)
                  │
                  ▼
             Backup current state (pre-restore-*.tar.gz)
                  │
                  ▼
             Remove current app (rm -rf /opt/feeder-hmi)
                  │
                  ▼
             Extract selected backup
                  │
                  ▼
             Install dependencies (npm install)
                  │
                  ▼
             Build frontend (npm run build)
                  │
                  ▼
             Restart services (pm2, nginx)
                  │
                  ▼
             Done
```

### 4.3 — Running the Restore

```bash
sudo bash /opt/feeder-hmi/deployment/scripts/restore-app.sh
```

Example session:

```
========================================
 Feeder HMI - Restore from Backup
========================================

Available backups:

  [1] 20260624_030000  (4.2M)
  [2] 20260623_030000  (4.1M)
  [3] 20260622_030000  (4.3M)

Enter number to restore (1-3): 1
Selected: /opt/backups/feeder-hmi-20260624_030000.tar.gz
This will OVERWRITE current application. Continue? (y/N): y
Stopping services...
Backing up current state...
Restoring from backup...
Installing dependencies...
Building...
Restarting services...

✓ Restore complete from: feeder-hmi-20260624_030000.tar.gz
```

### 4.4 — Non-Interactive Restore (Scripted)

For automated or remote recovery:

```bash
# Find the latest backup
LATEST=$(ls -t /opt/backups/feeder-hmi-*.tar.gz | head -1)

# Manual restore steps
cd /opt
pm2 stop feeder-backend || true
tar -czf /opt/backups/pre-restore-auto-$(date +%Y%m%d_%H%M%S).tar.gz feeder-hmi 2>/dev/null || true
rm -rf feeder-hmi
mkdir -p feeder-hmi
tar -xzf "$LATEST" -C /opt
cd /opt/feeder-hmi
npm install
cd server && npm install && cd ..
npm run build
pm2 start ecosystem.config.js
pm2 restart feeder-backend 2>/dev/null || pm2 start feeder-backend
nginx -t && systemctl reload nginx
```

---

## 5. Manual Restore Procedures

### 5.1 — Full Manual Restore

```bash
# Step 1: Identify the backup to restore
BACKUP_FILE="/opt/backups/feeder-hmi-20260624_030000.tar.gz"

# Step 2: Stop services
pm2 stop feeder-backend
pm2 stop feeder-frontend

# Step 3: Backup current state (safety net)
sudo tar -czf /opt/backups/pre-restore-manual-$(date +%Y%m%d_%H%M%S).tar.gz -C /opt feeder-hmi

# Step 4: Remove current application
sudo rm -rf /opt/feeder-hmi

# Step 5: Extract backup
sudo mkdir -p /opt/feeder-hmi
sudo tar -xzf "$BACKUP_FILE" -C /opt

# Step 6: Install dependencies
cd /opt/feeder-hmi
npm install
cd server && npm install && cd ..

# Step 7: Build
npm run build

# Step 8: Restart services
pm2 start ecosystem.config.js
nginx -t && sudo systemctl reload nginx

# Step 9: Verify
curl http://localhost/api/health
pm2 status
```

### 5.2 — Restore from Off-Device Backup

If the backup was copied off-device and needs to be restored onto a fresh Pi:

```bash
# Step 1: Copy backup to the Pi
scp /local/path/feeder-hmi-20260624_030000.tar.gz pi@192.168.1.50:/tmp/

# Step 2: SSH into the Pi
ssh pi@192.168.1.50

# Step 3: Run the restore from the copied file
sudo bash /opt/feeder-hmi/deployment/scripts/restore-app.sh
# Or manually follow the manual restore steps above using /tmp/backup.tar.gz
```

---

## 6. SD Card Image Backup

### 6.1 — Purpose

A full SD card image captures the entire OS, configuration, and application. This is the fastest way to recover from a complete hardware failure.

### 6.2 — Creating an SD Card Image

#### On Linux:

```bash
# Find the SD card device
lsblk
# Typically /dev/sdb or /dev/mmcblk0

# Create image (compressed)
sudo dd if=/dev/sdb bs=4M status=progress | gzip > feeder-pi-$(date +%Y%m%d).img.gz

# Or without compression (faster)
sudo dd if=/dev/sdb of=feeder-pi-$(date +%Y%m%d).img bs=4M status=progress
```

#### On Windows (using Win32 Disk Imager or Rufus):

1. Download and install [Win32 Disk Imager](https://sourceforge.net/projects/win32diskimager/)
2. Insert the SD card into the card reader
3. Open Win32 Disk Imager
4. Click the folder icon and choose a save location and filename
5. Select the SD card drive letter from the Device dropdown
6. Click **Read** to create the image

### 6.3 — Restoring an SD Card Image

#### Using Raspberry Pi Imager:

1. Open Raspberry Pi Imager
2. Click **Choose OS** → **Use custom** → select the `.img` file
3. Click **Choose Storage** → select the SD card
4. Click **Write**

#### Using `dd` on Linux:

```bash
# Decompress and write
gunzip -c feeder-pi-20260624.img.gz | sudo dd of=/dev/sdb bs=4M status=progress

# Or if uncompressed
sudo dd if=feeder-pi-20260624.img of=/dev/sdb bs=4M status=progress
```

### 6.4 — SD Card Image Backup Schedule

| Frequency | When | Storage |
|-----------|------|---------|
| Initial setup | After first successful deployment | External drive + cloud |
| Monthly | On a regular schedule | External drive |
| After major changes | After config changes, updates, etc. | External drive |

---

## 7. Configuration Backup Strategy

### 7.1 — Files to Preserve

| File | Path | Criticality |
|------|------|-------------|
| PM2 ecosystem | `/opt/feeder-hmi/server/ecosystem.config.js` | High |
| Nginx config | `/opt/feeder-hmi/deployment/nginx/nginx.conf` | High |
| Application config | `/opt/feeder-hmi/server/src/config.ts` | High |
| Whitelist | `/opt/feeder-hmi/deployment/whitelist/whitelist.txt` | Medium |
| DHCP config | `/etc/dhcpcd.conf` | High |
| SSH config | `/etc/ssh/sshd_config` | Low (defaults) |
| Firewall rules | `/etc/ufw/` | Medium |
| PM2 dump | `/root/.pm2/dump.pm2` | Medium |
| Crontab | Output of `crontab -l` | Low |

### 7.2 — Capture All Configurations in One Command

```bash
sudo tar -czf /opt/backups/feeder-config-full-$(date +%Y%m%d).tar.gz \
  /opt/feeder-hmi/server/ecosystem.config.js \
  /opt/feeder-hmi/server/src/config.ts \
  /opt/feeder-hmi/deployment/nginx/nginx.conf \
  /opt/feeder-hmi/deployment/whitelist/ \
  /opt/feeder-hmi/deployment/scripts/ \
  /etc/dhcpcd.conf \
  /etc/ssh/sshd_config \
  --exclude="*.log" \
  --exclude="node_modules"
```

### 7.3 — Version-Controlled Configuration

For maximum safety, store configuration in a git repository:

```bash
cd /opt/feeder-hmi
git init
git add -A
git commit -m "Initial configuration snapshot"
```

Then push to a remote repository for off-device backup.

---

## 8. Disaster Recovery Plan

### 8.1 — Recovery Scenarios

| Scenario | Recovery Time Objective (RTO) | Recovery Point Objective (RPO) | Method |
|----------|------------------------------|-------------------------------|--------|
| Application corruption | 30 minutes | 24 hours | Restore from backup script |
| SD card failure | 2 hours | 24 hours | Re-image SD card + restore |
| Pi hardware failure | 4 hours | 24 hours | New Pi + restore from backup |
| Complete site loss | 24 hours | 24 hours | New Pi + cloud backup |

### 8.2 — Step-by-Step Disaster Recovery

#### Scenario A: Application corrupted (most common)

```bash
# 1. SSH into the Pi
ssh pi@192.168.1.50

# 2. Check what's wrong
pm2 status
sudo systemctl status nginx

# 3. Attempt quick fix
pm2 restart all

# 4. If that fails, restore from latest backup
sudo bash /opt/feeder-hmi/deployment/scripts/restore-app.sh

# 5. Verify
curl http://localhost/api/health
```

#### Scenario B: SD card failure (won't boot)

```
1. Remove failed SD card from Pi
2. Insert into a computer
3. If card is readable:
   a. Create full image backup (Win32 Disk Imager or dd)
   b. Restore to a new SD card using Raspberry Pi Imager
4. If card is unreadable:
   a. Flash fresh Raspberry Pi OS Lite to a new SD card
   b. Boot the Pi, complete initial setup
   c. Copy the latest backup from external storage
   d. Run restore-app.sh
   e. Re-run setup-network.sh if needed
5. Insert new SD card, boot, verify
```

#### Scenario C: Pi hardware failure (dead board)

```
1. Obtain a replacement Raspberry Pi (same model recommended)
2. Flash the latest SD card image to a new SD card
   - If no image exists, flash fresh OS + run install + restore
3. Insert SD card into new Pi
4. Connect Ethernet, power on
5. Verify network: pi should come up on 192.168.1.50
6. Run restore-app.sh from the latest backup
7. Verify application health
```

#### Scenario D: Complete site loss (fire, flood, etc.)

```
1. Procure new hardware: Pi, SD card, power supply, enclosure
2. Flash fresh Raspberry Pi OS Lite to SD card
3. Download latest backup from cloud/external storage
4. Assemble and boot Pi
5. Run install.sh for system packages
6. Run setup-network.sh for IP and firewall
7. Copy backup to Pi (SCP from external storage)
8. Run restore-app.sh
9. Verify: frontend, API, WebSocket, Modbus
10. Update DNS/router if IP changed
```

### 8.3 — Backup Verification Checklist

Run this monthly to ensure backups are valid:

```bash
#!/bin/bash
CHECKLIST="/var/log/feeder-hmi/backup-check.txt"
echo "Backup Verification: $(date)" > "$CHECKLIST"

# 1. Check backup directory exists
if [ -d "/opt/backups" ]; then
  echo "[✓] Backup directory exists" >> "$CHECKLIST"
else
  echo "[✗] Backup directory missing" >> "$CHECKLIST"
fi

# 2. Check for recent backups (last 48 hours)
LATEST=$(ls -t /opt/backups/feeder-hmi-*.tar.gz 2>/dev/null | head -1)
if [ -n "$LATEST" ]; then
  AGE=$(( ($(date +%s) - $(stat -c %Y "$LATEST")) / 3600 ))
  if [ "$AGE" -le 48 ]; then
    echo "[✓] Latest backup is ${AGE}h old" >> "$CHECKLIST"
  else
    echo "[!] Latest backup is ${AGE}h old (stale)" >> "$CHECKLIST"
  fi
else
  echo "[✗] No backups found" >> "$CHECKLIST"
fi

# 3. Verify integrity of latest 3 backups
for f in $(ls -t /opt/backups/feeder-hmi-*.tar.gz 2>/dev/null | head -3); do
  if tar -tzf "$f" > /dev/null 2>&1; then
    echo "[✓] $(basename $f) integrity OK" >> "$CHECKLIST"
  else
    echo "[✗] $(basename $f) CORRUPTED" >> "$CHECKLIST"
  fi
done

echo "---" >> "$CHECKLIST"
cat "$CHECKLIST"
```

### 8.4 — Backup Storage Recommendations

| Storage Location | Pros | Cons | Recommended For |
|-----------------|------|------|-----------------|
| On-device (`/opt/backups/`) | Fast restore, no network needed | Lost if SD card fails | Day-to-day operations |
| External USB drive | Survives SD card failure | Requires manual mount | Weekly backups |
| Network share (NAS) | Centralized, accessible from anywhere | Requires network | Automated daily backups |
| Cloud storage (S3, etc.) | Off-site, disaster-proof | Internet dependency | Monthly + critical configs |
| USB stick (kept with panel) | Quick physical access | Can be misplaced | Emergency recovery |

### 8.5 — Recommended Minimum Setup

```
Local:  /opt/backups/          ← Auto-clean after 14 days
         ├── feeder-hmi-YYYYMMDD_HHMMSS.tar.gz  (daily cron)
         └── pre-restore-*.tar.gz               (before each restore)

Remote: External USB or NAS    ← Manual monthly
         └── feeder-pi-YYYYMMDD.img.gz          (full SD card image)
```

---

## References

- [Installation Guide](INSTALLATION_GUIDE.md)
- [Raspberry Pi Setup Guide](RASPBERRY_PI_SETUP.md)
- [Server Setup Guide](SERVER_SETUP.md)
- [Network Setup Guide](NETWORK_SETUP.md)
- [Modbus Setup Guide](MODBUS_SETUP.md)
- [Troubleshooting Guide](TROUBLESHOOTING.md)
