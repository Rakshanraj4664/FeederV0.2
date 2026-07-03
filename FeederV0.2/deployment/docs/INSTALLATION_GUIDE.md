# Feeder Machine HMI — Installation Guide

Complete step-by-step guide to set up the Feeder Machine HMI on a Raspberry Pi from unboxing to a fully running system.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Flash Raspberry Pi OS](#2-flash-raspberry-pi-os)
3. [First Boot & Initial Setup](#3-first-boot--initial-setup)
4. [Install System Packages](#4-install-system-packages)
5. [Deploy Application Code](#5-deploy-application-code)
6. [Configure Network](#6-configure-network)
7. [Build & Run](#7-build--run)
8. [Verify Installation](#8-verify-installation)

---

## 1. Prerequisites

### Hardware

| Item | Specification |
|------|--------------|
| Raspberry Pi | Pi 3 Model B+, Pi 4, or Pi 5 (recommended) |
| MicroSD card | 32 GB minimum, Class 10 / A2 recommended |
| Power supply | Official 5.1V / 3A USB-C (Pi 4/5) or micro-USB (Pi 3) |
| Network cable | Cat5e or better Ethernet cable |
| Tablet | Any tablet with a web browser, on same subnet |

### Software

| Tool | Purpose |
|------|---------|
| Raspberry Pi Imager | Writing OS to SD card |
| SSH client | Terminal access (e.g., PuTTY on Windows, Terminal on macOS/Linux) |
| SCP / SFTP client | File transfer (optional, if not cloning via git) |

### Network Information

| Device | IP Address | Purpose |
|--------|-----------|---------|
| Raspberry Pi | `192.168.1.50` (static) | HMI server |
| PLC | `192.168.1.5` | Modbus TCP target |
| Tablet | `192.168.1.x` (DHCP) | Web browser client |

---

## 2. Flash Raspberry Pi OS

### Step 2.1 — Download Raspberry Pi Imager

Download from [raspberrypi.com/software](https://www.raspberrypi.com/software/) and install on your desktop/laptop computer.

### Step 2.2 — Write OS to SD Card

1. Insert the microSD card into your computer.
2. Open Raspberry Pi Imager.
3. Click **Choose OS** → **Raspberry Pi OS (other)** → **Raspberry Pi OS Lite (64-bit)**.  
   *Lite is recommended — no desktop environment is needed for a server.*

4. Click **Choose Storage** → select your SD card.
5. Click the gear icon (⚙) to open advanced options:

   - [x] **Set hostname:** `feeder-pi`
   - [x] **Enable SSH:** Use password authentication
   - [x] **Set username and password:**  
         Username: `pi`  
         Password: `<choose a strong password>`
   - [x] **Configure wireless LAN:** *(leave blank — we use Ethernet)*
   - [x] **Set locale settings:**  
         Time zone: `Europe/London` (or your local time zone)  
         Keyboard layout: `us` (or your local layout)

6. Click **Save**, then **Write**. Confirm the warning — the card will be overwritten.
7. When complete, remove the SD card.

### Step 2.3 — Enable SSH (Alternative Method)

If you missed the gear icon step, create an empty file named `ssh` (no extension) on the boot partition after writing the image:

```
/boot/ssh
```

On Windows, this is the only partition visible after writing the image (typically labelled `boot`).

---

## 3. First Boot & Initial Setup

### Step 3.1 — Boot the Pi

1. Insert the SD card into the Raspberry Pi.
2. Connect Ethernet: Pi to the same network switch as the PLC (192.168.1.x subnet).
3. Connect power. The green LED will blink, then stay solid once booted.
4. Find the Pi's IP address. Check your router's DHCP lease table, or scan the network:

   ```bash
   # From a computer on the same subnet
   nmap -sn 192.168.1.0/24
   # or
   arp -a
   ```

### Step 3.2 — SSH into the Pi

```bash
ssh pi@192.168.1.50
```

If DHCP assigned a different IP, use that address. You will set the static IP in [Section 6](#6-configure-network).

### Step 3.3 — Change Default Password

```bash
passwd
```

Enter a strong password and record it in a secure location.

### Step 3.4 — Update System

```bash
sudo apt update
sudo apt full-upgrade -y
sudo reboot
```

Reconnect via SSH after reboot.

---

## 4. Install System Packages

Run the automated install script:

```bash
cd /opt
sudo git clone <your-repo-url> feeder-hmi
# or manually copy files to /opt/feeder-hmi
```

Then:

```bash
cd /opt/feeder-hmi
sudo bash deployment/scripts/install.sh
```

### What `install.sh` Does

| Step | Description |
|------|-------------|
| System update | `apt update && apt upgrade -y` |
| Essential packages | Installs `curl`, `git`, `build-essential`, `libssl-dev`, `ufw` |
| Node.js 20.x | Adds Nodesource repo, installs Node.js and npm |
| PM2 | Installs PM2 globally for process management |
| Nginx | Installs and enables nginx reverse proxy |
| Docker | Installs Docker Engine and Docker Compose (optional) |
| Firewall | Opens ports 22, 80, 443, 5000; enables UFW |
| PM2 startup | Configures PM2 to start on boot via systemd |
| Log directory | Creates `/var/log/feeder-hmi` |

### Manual Installation (if not using the script)

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install packages
sudo apt install -y curl git build-essential libssl-dev ufw nginx

# Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt install -y nodejs

# PM2
sudo npm install -g pm2

# Docker (optional)
curl -fsSL https://get.docker.com | sudo bash
sudo systemctl enable docker

# Firewall
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 5000/tcp
sudo ufw --force enable

# PM2 startup
sudo pm2 startup systemd -u root --hp /root

# Log directory
sudo mkdir -p /var/log/feeder-hmi
```

---

## 5. Deploy Application Code

### Option A — Clone from Git Repository

```bash
sudo mkdir -p /opt/feeder-hmi
sudo chown pi:pi /opt/feeder-hmi
cd /opt/feeder-hmi
git clone <repository-url> .
```

### Option B — Copy Files via SCP

From your development machine:

```bash
# From project root
scp -r . pi@192.168.1.50:/opt/feeder-hmi
```

### Option C — Use a USB Drive

```bash
# On the Pi, mount the drive
sudo mkdir /mnt/usb
sudo mount /dev/sda1 /mnt/usb
sudo cp -r /mnt/usb/feeder-hmi/* /opt/feeder-hmi/
sudo umount /mnt/usb
```

### Verify File Structure

After deployment, the application directory should contain:

```
/opt/feeder-hmi/
├── package.json
├── vite.config.ts
├── src/                  # Frontend source
├── server/
│   ├── package.json
│   ├── ecosystem.config.js
│   └── src/              # Backend source
└── deployment/
    ├── docs/
    ├── nginx/
    ├── docker/
    ├── scripts/
    └── whitelist/
```

---

## 6. Configure Network

### Run the Network Setup Script

```bash
cd /opt/feeder-hmi
sudo bash deployment/scripts/setup-network.sh
```

This script:

- Detects the active network interface
- Appends static IP configuration to `/etc/dhcpcd.conf`
  - IP: `192.168.1.50/24`
  - Gateway: `192.168.1.1`
  - DNS: `8.8.8.8`, `1.1.1.1`
- Configures UFW firewall rules for ports 80, 5000, and 502
- Sets the hostname to `feeder-pi`

### Reboot to Apply Static IP

```bash
sudo reboot
```

After reboot, confirm the IP:

```bash
hostname -I
# Expected: 192.168.1.50
```

---

## 7. Build & Run

### Step 7.1 — Install Dependencies

```bash
cd /opt/feeder-hmi

# Frontend dependencies
npm install

# Backend dependencies
cd server
npm install
cd ..
```

### Step 7.2 — Build Frontend

```bash
npm run build
```

This produces the production build in `/opt/feeder-hmi/dist/`.

### Step 7.3 — Run the Server Setup Script

```bash
sudo bash deployment/scripts/setup-server.sh
```

This script:

- Configures nginx site at `/etc/nginx/sites-available/feeder-hmi`
- Enables the site and reloads nginx
- Starts the backend process via PM2
- Saves the PM2 process list for auto-start on boot

### Step 7.4 — Verify Processes

```bash
pm2 status
```

Expected output:

```
┌─────┬──────────────────┬──────────────┬─────────┬─────────┬──────────┐
│ id  │ name             │ mode         │ status  │ cpu     │ memory   │
├─────┼──────────────────┼──────────────┼─────────┼─────────┼──────────┤
│ 0   │ feeder-frontend  │ fork         │ online  │ 0%      │ 32.1 MB │
│ 1   │ feeder-backend   │ fork         │ online  │ 0.2%    │ 68.5 MB │
└─────┴──────────────────┴──────────────┴─────────┴─────────┴──────────┘
```

```bash
sudo systemctl status nginx
```

Expected: `active (running)`

---

## 8. Verify Installation

### Frontend

From a tablet or computer on the same network, open:

```
http://192.168.1.50
```

You should see the Feeder Machine HMI dashboard.

### API

```bash
curl http://192.168.1.50/api/health
```

Expected response:

```json
{"status": "ok", "uptime": 1234}
```

### WebSocket

```bash
# Install wscat if needed
sudo npm install -g wscat

wscat -c ws://192.168.1.50/ws
```

You should immediately receive a status message:

```json
{"type":"status","payload":{"plcOnline":true},"timestamp":"2026-06-24T12:00:00.000Z"}
```

### Modbus Connectivity

If the PLC is connected and powered on:

```bash
curl http://192.168.1.50/api/status
```

Expected response includes modbus connection state and PLC uptime.

---

## Troubleshooting Quick Reference

| Symptom | Likely Cause | Check |
|---------|-------------|-------|
| `curl: Connection refused` on port 80 | Nginx not running | `sudo systemctl status nginx` |
| `502 Bad Gateway` from nginx | Backend not running | `pm2 status` |
| WebSocket won't connect | Nginx WebSocket proxy misconfigured | Check `/ws` location block in nginx config |
| PLC shows offline | Modbus connectivity | `ping 192.168.1.5` from the Pi |
| Frontend shows white screen | Build missing or path wrong | Check `/opt/feeder-hmi/dist/index.html` exists |

For detailed troubleshooting, see [TROUBLESHOOTING.md](TROUBLESHOOTING.md).

---

## References

- [Raspberry Pi Setup Guide](RASPBERRY_PI_SETUP.md)
- [Server Setup Guide](SERVER_SETUP.md)
- [Network Setup Guide](NETWORK_SETUP.md)
- [Modbus Setup Guide](MODBUS_SETUP.md)
- [Backup & Restore Guide](BACKUP_AND_RESTORE.md)
- [Troubleshooting Guide](TROUBLESHOOTING.md)
