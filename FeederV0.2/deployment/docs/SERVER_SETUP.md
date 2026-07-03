# Feeder Machine HMI — Server Setup

Configuration guide for the Nginx reverse proxy, PM2 process management, environment variables, and startup/recovery procedures.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Nginx Reverse Proxy Configuration](#2-nginx-reverse-proxy-configuration)
3. [PM2 Process Management](#3-pm2-process-management)
4. [Environment Variables](#4-environment-variables)
5. [Startup on Boot](#5-startup-on-boot)
6. [Power Failure Recovery](#6-power-failure-recovery)

---

## 1. Architecture Overview

```
┌─────────────┐       ┌───────────────────────────────────────┐       ┌──────────┐
│   Tablet    │──────▶│         Raspberry Pi 192.168.1.50      │       │   PLC    │
│  (Browser)  │       │                                       │       │ 192.168. │
│             │       │  ┌──────────┐    ┌──────────────────┐  │       │  1.5     │
│  http://    │       │  │  Nginx   │───▶│ Frontend (:4173) │  │       │          │
│  192.168.1. │       │  │  (:80)   │    └──────────────────┘  │──────▶│  Modbus  │
│  50         │       │  │          │    ┌──────────────────┐  │       │  TCP:502 │
│             │       │  │ /api/*   │───▶│ Backend (:5000)  │  │       │          │
│             │       │  │ /ws      │───▶│ WebSocket :5000  │  │       └──────────┘
└─────────────┘       │  └──────────┘    └──────────────────┘  │
                      └───────────────────────────────────────┘
```

| Component | Port | Purpose |
|-----------|------|---------|
| Nginx | 80/tcp | Reverse proxy, serves frontend, proxies API and WebSocket |
| Frontend (Vite preview) | 4173/tcp | Serves built React app |
| Backend (Express) | 5000/tcp | REST API and WebSocket server |
| PLC | 502/tcp | Modbus TCP communication |

---

## 2. Nginx Reverse Proxy Configuration

### 2.1 — Configuration File

The nginx configuration is located at:

```
/opt/feeder-hmi/deployment/nginx/nginx.conf
```

It is deployed to:

```
/etc/nginx/sites-available/feeder-hmi
```

### 2.2 — Full Configuration

```nginx
# Feeder Machine HMI - Nginx Configuration
# Raspberry Pi at 192.168.1.50

upstream backend {
    server 127.0.0.1:5000;
}

upstream frontend {
    server 127.0.0.1:4173;
}

server {
    listen 80 default_server;
    listen [::]:80 default_server;

    server_name _;

    # Security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Frontend static files
    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        add_header Cache-Control "public, max-age=3600, must-revalidate";
    }

    # Backend API
    location /api/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 5s;
        proxy_read_timeout 10s;
        proxy_send_timeout 10s;
    }

    # WebSocket
    location /ws {
        proxy_pass http://backend/ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    # Deny access to hidden files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }

    # Deny access to sensitive files
    location ~ (\.env|\.git|node_modules|package-lock\.json)$ {
        deny all;
        access_log off;
        log_not_found off;
    }
}
```

### 2.3 — Location Block Breakdown

| Location | Upstream | Timeout | Notes |
|----------|----------|---------|-------|
| `/` | frontend:4173 | 60s (default) | SPA — falls back to `index.html` |
| `/api/` | backend:5000 | 5s connect, 10s read/write | Stateless REST calls |
| `/ws` | backend:5000/ws | 86400s (24h) | Long-lived WebSocket connection |

### 2.4 — Deploying the Configuration

Using the setup script (recommended):

```bash
sudo bash /opt/feeder-hmi/deployment/scripts/setup-server.sh
```

Manual deployment:

```bash
# Copy config
sudo cp /opt/feeder-hmi/deployment/nginx/nginx.conf /etc/nginx/sites-available/feeder-hmi

# Disable default site
sudo rm -f /etc/nginx/sites-enabled/default

# Enable feeder site
sudo ln -sf /etc/nginx/sites-available/feeder-hmi /etc/nginx/sites-enabled/

# Test and reload
sudo nginx -t
sudo systemctl restart nginx
```

### 2.5 — Troubleshooting Nginx

```bash
# Test configuration
sudo nginx -t

# Check error log
sudo tail -f /var/log/nginx/error.log

# Check access log
sudo tail -f /var/log/nginx/access.log

# Check if ports are listening
sudo ss -tlnp | grep -E ':(80|4173|5000)'

# Reload without downtime
sudo systemctl reload nginx
```

Common nginx errors:

| Error | Cause | Fix |
|-------|-------|-----|
| `502 Bad Gateway` | Backend process down | `pm2 restart feeder-backend` |
| `Connection refused` | Frontend preview not running | `pm2 restart feeder-frontend` |
| `address already in use` | Another process on port 80 | `sudo lsof -i :80`, stop conflicting service |
| WebSocket disconnect immediately | Upgrade headers missing | Verify `proxy_set_header Upgrade` and `Connection "upgrade"` |

---

## 3. PM2 Process Management

### 3.1 — Ecosystem Configuration

File: `/opt/feeder-hmi/server/ecosystem.config.js`

```javascript
module.exports = {
  apps: [
    {
      name: 'feeder-frontend',
      cwd: '../',
      script: 'npm',
      args: 'run preview',
      env: {
        PORT: 4173,
      },
      watch: false,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
    {
      name: 'feeder-backend',
      cwd: '.',
      script: 'npm',
      args: 'run dev',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      watch: false,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      max_memory_restart: '500M',
    },
  ],
}
```

### 3.2 — Process Details

| Property | feeder-frontend | feeder-backend |
|----------|----------------|----------------|
| Working directory | `/opt/feeder-hmi` | `/opt/feeder-hmi/server` |
| Command | `npm run preview` | `npm run dev` (production env) |
| Port | 4173 | 5000 |
| Auto-restart | Yes (max 10 attempts) | Yes (max 10 attempts) |
| Restart delay | 5000ms | 3000ms |
| Memory limit | None | 500 MB |
| Log files | `logs/frontend-{error,out}.log` | `logs/backend-{error,out}.log` |

### 3.3 — Managing Processes

```bash
# Start all processes
cd /opt/feeder-hmi/server
pm2 start ecosystem.config.js

# Start individual processes
pm2 start feeder-backend
pm2 start feeder-frontend

# View status
pm2 status
pm2 list

# View logs
pm2 logs                    # All logs (streaming)
pm2 logs feeder-backend     # Backend only
pm2 logs --lines 100        # Last 100 lines

# Monitor in real-time
pm2 monit

# Restart
pm2 restart feeder-backend
pm2 restart all

# Stop
pm2 stop feeder-backend
pm2 stop all

# Delete from PM2 process list
pm2 delete feeder-frontend

# Save process list (persist across reboot)
pm2 save
```

### 3.4 — Log Management

PM2 logs are written to `/opt/feeder-hmi/server/logs/`:

```bash
# View logs by type
tail -f /opt/feeder-hmi/server/logs/backend-out.log
tail -f /opt/feeder-hmi/server/logs/backend-error.log
tail -f /opt/feeder-hmi/server/logs/frontend-out.log
tail -f /opt/feeder-hmi/server/logs/frontend-error.log
```

Log rotation is configured by default in PM2. Logs are automatically rotated and old logs are cleaned. To configure custom rotation:

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
```

---

## 4. Environment Variables

### 4.1 — Configuration Source

The application configuration is defined in `server/src/config.ts`:

```typescript
export const CONFIG = {
  PORT: 5000,
  PLC_IP: '192.168.1.5',
  PLC_PORT: 502,
  PI_IP: '192.168.1.50',
  POLL_INTERVAL_MS: 100,
  RECONNECT_INTERVAL_MS: 3000,
  MAX_RECONNECT_ATTEMPTS: 10,
  REGISTERS: {
    MODIFIER: { MC1: 20002, MC2: 20008, MC3: 20014, MC4: 20020 },
    AXIS_SPEED: { AXIS1: 28022, AXIS2: 28024, AXIS3: 28026, AXIS4: 28028 },
    WIDTH: { EXPAND: 2000, CONTRACT: 2004 },
    BASE_FREQUENCY: 32010,
    MODIFIER_MIN: 0,
    MODIFIER_MAX: 9999,
  },
  WHITELIST_PATH: './whitelist.txt',
  LOG_DIR: './logs',
}
```

### 4.2 — Environment Variables Used

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `production` (in PM2) | Enables production mode (disables mock PLC) |
| `PORT` | `5000` | Express server listen port |

### 4.3 — Setting Custom Environment Variables

To override configuration at runtime, set environment variables before starting:

```bash
# Temporarily override
PLC_IP=192.168.1.10 POLL_INTERVAL_MS=200 pm2 restart feeder-backend

# Permanently in ecosystem.config.js
# Edit the env block and run: pm2 restart ecosystem.config.js
```

---

## 5. Startup on Boot

### 5.1 — PM2 Startup Hook

PM2 uses systemd to start on boot:

```bash
# Generate and enable the startup script
sudo pm2 startup systemd -u root --hp /root

# The command will output instructions to run, typically:
# sudo systemctl enable pm2-root
```

### 5.2 — After Adding/Changing Processes

Always save the process list after changes:

```bash
pm2 save
```

This persists the process list to `/root/.pm2/dump.pm2` so PM2 can resurrect processes on boot.

### 5.3 — Full Startup Sequence on Boot

When the Raspberry Pi powers on:

1. **Kernel boots** — loads drivers, mounts filesystems
2. **Systemd starts** — launches all enabled services
3. **dhcpcd starts** — applies static IP configuration from `/etc/dhcpcd.conf`
4. **Nginx starts** — `systemctl enable nginx` ensures it auto-starts
5. **PM2 starts** — systemd runs `pm2-root.service` which loads the saved process list
6. **PM2 resurrects processes** — `feeder-backend` and `feeder-frontend` start
7. **Backend connects to PLC** — on startup, ModbusService attempts TCP connection to 192.168.1.5:502
8. **Polling begins** — WebSocket broadcasts machine state at 100ms intervals

### 5.4 — Verifying Auto-Start

```bash
# Test by rebooting
sudo reboot

# Wait 2 minutes, then SSH back in
pm2 status
# Both processes should show as "online"

sudo systemctl status nginx
# Should show "active (running)"

curl http://localhost/api/health
# Should return {"status":"ok","uptime":...}
```

---

## 6. Power Failure Recovery

### 6.1 — Automatic Recovery

The system is designed to recover automatically from power loss:

| Component | Recovery Mechanism | Time to Recovery |
|-----------|-------------------|-----------------|
| Static IP | `dhcpcd.conf` — persists on filesystem | 10–15s after boot |
| Nginx | `systemctl enable nginx` | 20–30s after boot |
| PM2 | `pm2 startup` systemd service | 25–35s after boot |
| Backend process | PM2 auto-restart (if crashed) | 3s (restart_delay) |
| Backend → PLC | ModbusService auto-reconnect | 3s intervals, max 10 attempts |

### 6.2 — Data Integrity

The application is stateless — all machine state is held in PLC registers, not in the Pi's memory. After a power failure:

- PLC retains register values (non-volatile memory in the PLC)
- Pi boots and reconnects to the PLC
- Backend reads current register state and broadcasts to connected clients via WebSocket
- No data loss occurs

### 6.3 — Manual Recovery Steps

If automatic recovery fails:

```bash
# Step 1: Check power and network
ping 192.168.1.50
ping 192.168.1.5

# Step 2: Check services
sudo systemctl status nginx
pm2 status

# Step 3: Start services manually
sudo systemctl start nginx
cd /opt/feeder-hmi/server && pm2 start ecosystem.config.js

# Step 4: Check application health
curl http://localhost/api/health
```

### 6.4 — Graceful Shutdown Procedure

Before powering down the Pi:

```bash
# Stop services gracefully
cd /opt/feeder-hmi/server
pm2 stop all

# Save state
pm2 save

# Shutdown
sudo shutdown -h now
```

### 6.5 — Write Endurance Considerations

Industrial environments with frequent power cycles can damage SD cards. Consider:

- **Use a UPS** — a small uninterruptible power supply allows graceful shutdown
- **Use USB SSD** — better write endurance than SD cards
- **Enable read-only mode** — for extreme cases, mount the root filesystem as read-only
- **Monitor SD health** — `sudo smartctl -a /dev/mmcblk0` (if smartmontools is installed)

---

## References

- [Installation Guide](INSTALLATION_GUIDE.md)
- [Raspberry Pi Setup Guide](RASPBERRY_PI_SETUP.md)
- [Network Setup Guide](NETWORK_SETUP.md)
- [Modbus Setup Guide](MODBUS_SETUP.md)
- [Troubleshooting Guide](TROUBLESHOOTING.md)
