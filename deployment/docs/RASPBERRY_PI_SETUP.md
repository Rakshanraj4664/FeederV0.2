# Feeder Machine HMI — Raspberry Pi Setup

Detailed instructions for preparing the Raspberry Pi hardware and operating system for the Feeder HMI deployment.

---

## Table of Contents

1. [Hardware Requirements](#1-hardware-requirements)
2. [Raspberry Pi OS Installation](#2-raspberry-pi-os-installation)
3. [First Boot & SSH Access](#3-first-boot--ssh-access)
4. [Static IP Configuration](#4-static-ip-configuration)
5. [Installing Node.js 20.x](#5-installing-nodejs-20x)
6. [Installing npm & Git](#6-installing-npm--git)
7. [Installing PM2](#7-installing-pm2)
8. [Installing Nginx](#8-installing-nginx)
9. [Installing Docker (Optional)](#9-installing-docker-optional)
10. [SSH Hardening](#10-ssh-hardening)
11. [Firewall Rules](#11-firewall-rules)
12. [Final Verification](#12-final-verification)

---

## 1. Hardware Requirements

| Component | Recommended Specification |
|-----------|-------------------------|
| Board | Raspberry Pi 4 Model B (2 GB RAM minimum, 4 GB recommended) |
| Power | Official Raspberry Pi 5.1V / 3A USB-C power supply |
| Storage | 32 GB+ microSD (Class 10 / A2) or USB SSD for better reliability |
| Network | Gigabit Ethernet cable, Cat5e or better |
| Cooling | Heatsink case or fan (the Pi runs 24/7 in an industrial environment) |
| Enclosure | DIN-rail mount enclosure recommended for panel installation |

### SD Card vs USB SSD

| Storage | Pros | Cons |
|---------|------|------|
| microSD | Simple, no extra hardware | Lower write endurance, slower I/O |
| USB SSD | Higher endurance, faster I/O, more reliable | Requires USB port, slightly more complex setup |

For production environments, a USB SSD is strongly recommended.

---

## 2. Raspberry Pi OS Installation

### Step 2.1 — Download Raspberry Pi Imager

Download and install from: [https://www.raspberrypi.com/software/](https://www.raspberrypi.com/software/)

### Step 2.2 — Write OS to SD Card

1. Insert the microSD card into your computer's card reader.
2. Launch Raspberry Pi Imager.
3. Click **Choose OS** → **Raspberry Pi OS (other)** → **Raspberry Pi OS Lite (64-bit)**.  
   - **Why Lite?** No desktop environment reduces attack surface, saves RAM, and avoids unnecessary updates. All interaction is via SSH and the web browser.
4. Click **Choose Storage** → select your SD card.
5. Click the gear icon (⚙) to pre-configure the image:

   | Setting | Value |
   |---------|-------|
   | Set hostname | `feeder-pi` |
   | Enable SSH | `√ Allow password authentication` |
   | Set username and password | Username: `pi`, Password: *(choose a strong password)* |
   | Configure wireless LAN | *(leave blank — Ethernet only)* |
   | Locale settings | Timezone: your local timezone (e.g. `Europe/London`) |

6. Click **Save**, then **Write**.
7. Wait for the write and verification to complete, then remove the SD card.

### Step 2.3 — Manual SSH Enablement

If you forgot the pre-configuration step, mount the boot partition after writing and create an empty file:

```bash
# On Linux/macOS
touch /Volumes/boot/ssh

# On Windows (after inserting the card)
# Create an empty file called "ssh" (no extension) on the boot partition
```

---

## 3. First Boot & SSH Access

### Step 3.1 — Boot

1. Insert the SD card into the Pi.
2. Connect Ethernet cable to the same switch as the PLC network (192.168.1.x subnet).
3. Connect the power supply.
4. Wait approximately 60–90 seconds for first boot.

### Step 3.2 — Locate the Pi on the Network

```bash
# From a computer on the same subnet, scan for the Pi
nmap -sn 192.168.1.0/24
# or
arp -a | grep -i "b8:27:eb\|dc:a6:32\|e4:5f:01"
```

The Pi's MAC address (first octets) will identify it.

### Step 3.3 — Connect via SSH

```bash
ssh pi@<discovered-ip>
```

Accept the host key fingerprint when prompted.

### Step 3.4 — Post-Login Checks

```bash
# Check OS version
cat /etc/os-release

# Check memory
free -h

# Check disk
df -h

# Check temperature
vcgencmd measure_temp

# Update immediately
sudo apt update && sudo apt full-upgrade -y
sudo reboot
```

---

## 4. Static IP Configuration

The Pi must have a fixed IP of `192.168.1.60` on the machine network.

### Step 4.1 — Identify the Network Interface

```bash
ip route get 1 | awk '{print $5; exit}'
# Typically: eth0
```

### Step 4.2 — Configure Static IP via dhcpcd

Edit `/etc/dhcpcd.conf`:

```bash
sudo nano /etc/dhcpcd.conf
```

Add at the end of the file:

```
# Static IP for Feeder HMI
interface eth0
static ip_address=192.168.1.60/24
static routers=192.168.1.1
static domain_name_servers=8.8.8.8 1.1.1.1
```

Or run the automated script:

```bash
sudo bash /opt/feeder-hmi/deployment/scripts/setup-network.sh
```

### Step 4.3 — Apply Configuration

```bash
sudo reboot
```

### Step 4.4 — Verify

```bash
hostname -I
# Expected: 192.168.1.60
```

If the IP is different, check:
- No other device on the network uses `192.168.1.60`
- The gateway `192.168.1.1` is reachable: `ping 192.168.1.1`
- The `dhcpcd` service is running: `sudo systemctl status dhcpcd`

---

## 5. Installing Node.js 20.x

### Via Nodesource (Recommended)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt install -y nodejs
```

### Verify Installation

```bash
node -v
# Expected: v20.x.x

npm -v
# Expected: 10.x.x
```

### Manual Installation (if Nodesource is unavailable)

```bash
# Download and extract
wget https://nodejs.org/dist/v20.12.0/node-v20.12.0-linux-arm64.tar.xz
sudo mkdir -p /usr/local/lib/nodejs
sudo tar -xJf node-v20.12.0-linux-arm64.tar.xz -C /usr/local/lib/nodejs

# Set PATH
export PATH=/usr/local/lib/nodejs/node-v20.12.0-linux-arm64/bin:$PATH
echo 'export PATH=/usr/local/lib/nodejs/node-v20.12.0-linux-arm64/bin:$PATH' >> ~/.bashrc
```

---

## 6. Installing npm & Git

npm is bundled with Node.js. Git must be installed separately:

```bash
sudo apt install -y git

# Verify
git --version
# Expected: git 2.30.x or later
```

---

## 7. Installing PM2

PM2 manages the Node.js backend process with auto-restart and logging.

### Global Installation

```bash
sudo npm install -g pm2
```

### Verify

```bash
pm2 --version
# Expected: 5.x.x
```

### Configure PM2 for System Startup

```bash
sudo pm2 startup systemd -u root --hp /root
```

This creates a systemd service at `/etc/systemd/system/pm2-root.service` that starts PM2 on boot.

### PM2 Key Commands

```bash
# Start a process
pm2 start ecosystem.config.js

# List all processes
pm2 status
# or
pm2 list

# View logs
pm2 logs feeder-backend
pm2 logs feeder-frontend

# Restart
pm2 restart feeder-backend

# Stop
pm2 stop feeder-backend

# Save process list (required after changes to persist across reboot)
pm2 save

# Monitor in real-time
pm2 monit
```

---

## 8. Installing Nginx

Nginx serves as the reverse proxy, routing traffic to the frontend (port 4173) and backend (port 5000).

### Installation

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

### Verify

```bash
sudo systemctl status nginx
# Expected: active (running)

curl http://localhost
# Expected: 502 Bad Gateway (expected — no site configured yet)
```

### Nginx Key Commands

```bash
# Test configuration
sudo nginx -t

# Reload (graceful, no downtime)
sudo systemctl reload nginx

# Restart
sudo systemctl restart nginx

# View error log
sudo tail -f /var/log/nginx/error.log

# View access log
sudo tail -f /var/log/nginx/access.log
```

---

## 9. Installing Docker (Optional)

Docker is optional but useful for containerized deployment and consistent environments.

### Installation

```bash
curl -fsSL https://get.docker.com | sudo bash
sudo systemctl enable docker
sudo systemctl start docker

# Add pi user to docker group
sudo usermod -aG docker pi
```

### Verify

```bash
docker --version
docker compose version
```

---

## 10. SSH Hardening

### Step 10.1 — Create a Non-Root User (if not using `pi`)

```bash
sudo adduser feeder
sudo usermod -aG sudo feeder
```

### Step 10.2 — Configure SSH Daemon

Edit `/etc/ssh/sshd_config`:

```bash
sudo nano /etc/ssh/sshd_config
```

Apply these settings:

```
# Disable root login
PermitRootLogin no

# Use only SSH protocol 2
Protocol 2

# Disable password authentication (after setting up key-based auth)
PasswordAuthentication no

# Use key-based authentication only
PubkeyAuthentication yes

# Limit users who can SSH
AllowUsers pi feeder

# Change default port (optional, reduces log noise)
# Port 2222

# Idle timeout
ClientAliveInterval 300
ClientAliveCountMax 2

# Maximum authentication attempts
MaxAuthTries 3

# Disable challenge-response
ChallengeResponseAuthentication no

# Use more secure ciphers
Ciphers chacha20-poly1305@openssh.com,aes256-gcm@openssh.com,aes128-gcm@openssh.com
KexAlgorithms curve25519-sha256,diffie-hellman-group-exchange-sha256
MACs hmac-sha2-512-etm@openssh.com,hmac-sha2-256-etm@openssh.com
```

### Step 10.3 — Set Up SSH Key Authentication

```bash
# From your development machine
ssh-keygen -t ed25519 -C "feeder-hmi"
ssh-copy-id pi@192.168.1.60
```

### Step 10.4 — Disable Password Authentication (after verifying key works)

Only after confirming key-based login works, set in `/etc/ssh/sshd_config`:

```
PasswordAuthentication no
```

Then restart SSH:

```bash
sudo systemctl restart sshd
```

**Warning**: Keep an active SSH session open while testing a new one. If key auth fails, you'll still have the working session to recover.

### Step 10.5 — Install Fail2Ban (Optional)

```bash
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

---

## 11. Firewall Rules

### Step 11.1 — Install UFW

```bash
sudo apt install -y ufw
```

### Step 11.2 — Configure Rules

```bash
# Default deny
sudo ufw default deny incoming
sudo ufw default allow outgoing

# SSH (always allow from local subnet)
sudo ufw allow from 192.168.1.0/24 to any port 22 proto tcp comment 'SSH'

# HTTP - HMI frontend
sudo ufw allow from 192.168.1.0/24 to any port 80 proto tcp comment 'HMI Frontend'

# Backend API (local access only, proxied through nginx)
sudo ufw allow from 127.0.0.1 to any port 5000 proto tcp comment 'Backend API local'

# Modbus TCP to PLC
sudo ufw allow out on eth0 to 192.168.1.6 port 502 proto tcp comment 'Modbus PLC'

# Enable firewall
sudo ufw --force enable
```

### Step 11.3 — Verify

```bash
sudo ufw status verbose
```

Expected output:

```
Status: active
Logging: on (low)
Default: deny (incoming), allow (outgoing), disabled (routed)
New profiles: skip

To                         Action      From
--                         ------      ----
22/tcp                     ALLOW IN    192.168.1.0/24
80/tcp                     ALLOW IN    192.168.1.0/24
5000/tcp                   ALLOW IN    127.0.0.1
502/tcp                    ALLOW OUT   192.168.1.6 (eth0)
```

---

## 12. Final Verification

Run these checks to confirm the Pi is fully set up:

```bash
echo "=== Network ==="
hostname -I
ping -c 2 192.168.1.1
ping -c 2 8.8.8.8

echo "=== Services ==="
sudo systemctl is-active ssh
sudo systemctl is-active nginx
sudo systemctl is-active ufw

echo "=== Node.js ==="
node -v
npm -v

echo "=== PM2 ==="
pm2 --version
pm2 status

echo "=== Docker ==="
docker --version 2>/dev/null || echo "Docker not installed"

echo "=== Storage ==="
df -h /
```

All checks should pass before proceeding to the application deployment.

---

## References

- [Installation Guide](INSTALLATION_GUIDE.md)
- [Server Setup Guide](SERVER_SETUP.md)
- [Network Setup Guide](NETWORK_SETUP.md)
- [Troubleshooting Guide](TROUBLESHOOTING.md)
