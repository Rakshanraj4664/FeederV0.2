# Deployment Guide

## Prerequisites

- **Hardware:** Raspberry Pi 4 (2GB+ RAM recommended)
- **OS:** Raspberry Pi OS Lite (Bookworm) 64-bit — `2024-07-04-raspios-bookworm-arm64-lite.img.xz` or later
- **Network:** Local LAN with PLC at `192.168.1.6`, Pi assigned `192.168.1.60`
- **Storage:** 16GB+ microSD, 8GB+ free space after OS
- **Power:** 5V/3A USB-C power supply (official Pi PSU recommended)

---

## Step-by-Step Deployment

### 1. Flash Raspberry Pi OS

```bash
# Download Raspberry Pi OS Lite (64-bit)
wget https://downloads.raspberrypi.com/raspios_lite_arm64/images/ \
  raspi_lite_images/2024-07-04-raspios-bookworm-arm64-lite.img.xz

# Flash to SD card (replace /dev/sdX with your SD card device)
xzcat 2024-07-04-raspios-bookworm-arm64-lite.img.xz | \
  sudo dd of=/dev/sdX bs=4M status=progress
```

### 2. Initial Configuration

Create an empty `ssh` file on the boot partition to enable SSH:

```bash
touch /mnt/bootfs/ssh
```

Create `userconf.txt` for first-boot user setup (optional):

```bash
echo 'pi:$6$...hashedpassword...' > /mnt/bootfs/userconf.txt
```

### 3. Boot and Connect

```bash
# Insert SD card, power on Pi
# Find Pi IP from router DHCP table, then:
ssh pi@<dhcp-ip>
# Default password: raspberry (change immediately)
passwd
```

### 4. Run Installation Script

```bash
# Clone the application repository
git clone <repo-url> /opt/feeder-hmi
cd /opt/feeder-hmi

# Run the full installation script
sudo bash deployment/scripts/install.sh
```

This script automates:
- System package update (`apt update && apt upgrade -y`)
- Essential packages: `curl`, `git`, `build-essential`, `libssl-dev`, `ufw`
- Node.js 20.x (Nodesource)
- PM2 (global npm install)
- Nginx
- Docker + Docker Compose
- Application directory `/opt/feeder-hmi`
- Firewall baseline (SSH, HTTP, HTTPS, API)

### 5. Install Application Dependencies

```bash
# Frontend
cd /opt/feeder-hmi
npm install

# Backend
cd server
npm install
cd ..
```

### 6. Build Frontend

```bash
npm run build
# Output: /opt/feeder-hmi/dist/
```

### 7. Configure Static IP

```bash
sudo bash deployment/scripts/setup-network.sh
```

What it does:
- Sets static IP `192.168.1.60/24` on the active interface
- Gateway `192.168.1.1`
- DNS `8.8.8.8`, `1.1.1.1`
- Configures firewall rules for HMI traffic (ports 80, 5000, 502 from `192.168.1.0/24`)
- Sets hostname to `feeder-pi`

**Reboot to apply static IP:**

```bash
sudo reboot
```

After reboot, reconnect via SSH to `192.168.1.60`.

### 8. Configure and Start Services

```bash
cd /opt/feeder-hmi
sudo bash deployment/scripts/setup-server.sh
```

What it does:
- Installs the Nginx site configuration (reverse proxy)
- Enables the site, disables default, tests config, restarts Nginx
- Starts the backend with PM2
- Saves PM2 process list for automatic restart on boot

### 9. Verify Running Services

```bash
# Check Nginx
curl -s http://localhost | head -5

# Check API
curl -s http://localhost/api/health

# Check WebSocket (using wscat)
npm install -g wscat
wscat -c ws://localhost/ws

# Check PM2
pm2 status

# Check Nginx
nginx -t
systemctl status nginx

# Check firewall
ufw status
```

### 10. Access from Tablet

Open a browser on the tablet and navigate to:

```
http://192.168.1.60
```

---

## Docker Deployment (Alternative)

### Build and Run

```bash
cd /opt/feeder-hmi

# Build the Docker image
docker build -f deployment/docker/Dockerfile -t feeder-hmi:latest .

# Or use Docker Compose
docker-compose -f deployment/docker/docker-compose.yml up -d
```

### Verify Docker

```bash
docker ps
docker logs feeder-backend
docker logs feeder-frontend
```

### Docker Architecture

```
  Container: feeder-frontend (Nginx, port 80, IP 192.168.1.61)
  Container: feeder-backend  (Node,   port 5000, IP 192.168.1.60)

  Both on bridge network "feeder-net" (subnet 192.168.1.0/24)
```

The frontend container serves the built static files via Nginx and proxies `/api/` and `/ws` to the backend container.

---

## Post-Deployment Verification

### Checklist

| Check                          | Command / Method                          |
|--------------------------------|-------------------------------------------|
| Pi is reachable at 192.168.1.60 | `ping 192.168.1.60`                      |
| Frontend loads                 | Browse `http://192.168.1.60`             |
| API responds                   | `curl http://192.168.1.60/api/health`    |
| WebSocket connects             | `wscat -c ws://192.168.1.60/ws`          |
| PLC communication              | `curl http://192.168.1.60/api/status`    |
| PLC registers readable         | `curl http://192.168.1.60/api/registers` |
| Modbus TCP reachable           | `nc -zv 192.168.1.6 502`                |
| PM2 processes running          | `pm2 status`                             |
| Nginx reverse proxy working    | `curl -v http://localhost/api/status`    |
| Firewall allows HMI traffic    | `ufw status verbose`                     |
| Auto-restart on boot           | Reboot Pi, re-run checklist              |

### Troubleshooting

```
Problem: Frontend loads but shows "PLC OFFLINE"
  → Check Modbus connection: curl http://localhost:5000/api/status
  → Verify PLC IP: ping 192.168.1.6
  → Check firewall: ufw status (ensure port 502 allowed)

Problem: WebSocket not connecting
  → Verify path: should be /ws (not /)
  → Check Nginx proxy: systemctl status nginx
  → Check backend logs: pm2 logs feeder-backend

Problem: Can't reach Pi at 192.168.1.60
  → Check physical Ethernet connection
  → Verify static IP: ip addr show
  → Connect monitor/keyboard to debug
```

---

## Maintenance and Updates

### Update Application

```bash
cd /opt/feeder-hmi
sudo bash deployment/scripts/update-app.sh
```

This script:
1. Creates a timestamped backup to `/opt/backups/`
2. Pulls latest from git (if git repo)
3. Reinstalls npm dependencies (frontend + backend)
4. Rebuilds frontend
5. Restarts PM2 services
6. Reloads Nginx

### Backup

```bash
# Manual backup
sudo bash deployment/scripts/backup-app.sh
```

Backup archive is created at `/opt/backups/feeder-hmi-YYYYMMDD_HHMMSS.tar.gz`.

### Restore

```bash
sudo bash deployment/scripts/restore-app.sh
```

### Log Management

```bash
# View backend logs
pm2 logs feeder-backend

# View frontend logs
pm2 logs feeder-frontend

# View Nginx access log
tail -f /var/log/nginx/access.log

# View Nginx error log
tail -f /var/log/nginx/error.log

# Application logs
ls -la /opt/feeder-hmi/server/logs/
```

### PM2 Commands

```bash
pm2 status                    # List all processes
pm2 logs feeder-backend       # Tail backend logs
pm2 restart feeder-backend    # Restart backend
pm2 restart feeder-frontend   # Restart frontend
pm2 stop feeder-backend       # Stop a process
pm2 startup                   # Re-enable PM2 on boot (if needed)
pm2 save                      # Save current process list
```

### Rotating Logs

PM2 log rotation is recommended to prevent disk exhaustion:

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
```

### System Updates

```bash
# Regular maintenance
sudo apt update
sudo apt upgrade -y
sudo reboot
```
