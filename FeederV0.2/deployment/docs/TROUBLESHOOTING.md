# Feeder Machine HMI — Troubleshooting Guide

Common issues, diagnostic procedures, log analysis, and emergency recovery for the Feeder HMI system.

---

## Table of Contents

1. [Quick Reference](#1-quick-reference)
2. [PLC Not Connecting](#2-plc-not-connecting)
3. [WebSocket Disconnects](#3-websocket-disconnects)
4. [Slider Not Responding](#4-slider-not-responding)
5. [Nginx 502 Bad Gateway](#5-nginx-502-bad-gateway)
6. [High Latency](#6-high-latency)
7. [Log File Locations & Analysis](#7-log-file-locations--analysis)
8. [Emergency Recovery Procedures](#8-emergency-recovery-procedures)

---

## 1. Quick Reference

| Symptom | Most Likely Cause | First Command to Run |
|---------|-------------------|----------------------|
| Blank page at `http://192.168.1.50` | Frontend build missing or nginx down | `sudo systemctl status nginx` |
| "PLC Offline" shown on HMI | PLC unreachable or Modbus port blocked | `ping 192.168.1.5` |
| Slider moves but machine doesn't respond | Modbus write failing | `pm2 logs feeder-backend --lines 20` |
| WebSocket keeps disconnecting | Nginx WebSocket proxy misconfig | `sudo nginx -t` |
| 502 Bad Gateway | Backend process crashed | `pm2 status` |
| Slow updates (>1s lag) | High PLC scan cycle or network congestion | `curl http://localhost:5000/api/status` |
| Page loads but no data | WebSocket connection failed | Check browser console for WebSocket errors |
| `pm2` processes not starting on boot | PM2 startup not configured | `pm2 startup` then `pm2 save` |

---

## 2. PLC Not Connecting

### 2.1 — Symptoms

- HMI dashboard shows "PLC Offline" indicator
- Modbus registers show all zeros
- `api/status` returns `plcOnline: false`

### 2.2 — Diagnostic Steps

```bash
# Step 1: Is the PLC physically reachable?
ping -c 3 192.168.1.5

# Step 2: Is port 502 open?
nc -zv 192.168.1.5 502

# Step 3: Check backend logs for Modbus errors
pm2 logs feeder-backend --lines 30
# Look for: "modbus", "PLC connection failed", "Reconnecting"

# Step 4: Check if backend thinks it's in mock mode
curl http://localhost:5000/api/status
# Look for: mockMode field

# Step 5: Check firewall rules
sudo ufw status verbose
# Verify: 502/tcp ALLOW OUT to 192.168.1.5

# Step 6: Test Modbus directly from command line
modbus-cli read -h 192.168.1.5 -p 502 -a 20002 -c 1 -t holding
```

### 2.3 — Solutions

| Cause | Solution |
|-------|----------|
| Ethernet cable unplugged | Check cable at Pi and PLC |
| PLC powered off | Power on PLC, check LED status |
| Wrong PLC IP | Verify PLC IP is `192.168.1.5` |
| Wrong subnet | Both Pi and PLC must be on `192.168.1.0/24` |
| PLC in STOP mode | Set PLC to RUN mode |
| Modbus TCP disabled on PLC | Enable Modbus TCP server in PLC configuration |
| Firewall blocking outbound 502 | `sudo ufw allow out on eth0 to 192.168.1.5 port 502` |
| IP conflict | `arp-scan --localnet \| grep 192.168.1.5` |
| Backend in mock mode | Set `NODE_ENV=production` in PM2 ecosystem config |

### 2.4 — Reconnection Behavior

The `ModbusService` automatically retries:

```
Interval:  3 seconds
Max attempts: 10
After 10 failures: stop retrying, log error
```

To reset and force a reconnection attempt, restart the backend:

```bash
pm2 restart feeder-backend
```

---

## 3. WebSocket Disconnects

### 3.1 — Symptoms

- HMI dashboard loads but shows stale data
- Browser console shows WebSocket close events
- Intermittent "connection lost" indicators

### 3.2 — Diagnostic Steps

```bash
# Step 1: Check WS connection directly from Pi
wscat -c ws://localhost:5000/ws
# Expected: immediate JSON status message every 100ms

# Step 2: Check WS through nginx proxy
wscat -c ws://192.168.1.50/ws
# Expected: same as above

# Step 3: Check nginx WebSocket proxy config
sudo cat /etc/nginx/sites-available/feeder-hmi | grep -A5 "location /ws"

# Step 4: Check nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log | grep "/ws"

# Step 5: Check backend logs for WebSocket errors
pm2 logs feeder-backend --lines 30 | grep -i "websocket\|ws"
```

### 3.3 — Solutions

| Cause | Solution |
|-------|----------|
| Missing WebSocket upgrade headers | Ensure nginx config has: `proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection "upgrade";` |
| `proxy_read_timeout` too low | Set to `86400s` (24 hours) for `/ws` location |
| Backend restarting | Check `pm2 status` — backend should not restart frequently |
| Network timeout | Tablet may be going to sleep; try disabling WiFi power saving |
| Two tabs open | Each tab opens a separate WS connection; this is normal |
| Browser blocks WS from HTTP | Ensure page is loaded via `http://` not `file://` |

### 3.4 — Client-Side Debugging

In the tablet browser's Developer Console:

```javascript
// Check WebSocket connection
const ws = new WebSocket('ws://192.168.1.50/ws')
ws.onmessage = (e) => console.log(JSON.parse(e.data))
ws.onclose = (e) => console.log('Closed:', e.code, e.reason)
ws.onerror = (e) => console.error('Error:', e)

// Expected output every 100ms:
// { type: "machineState", payload: {...}, timestamp: "..." }
// { type: "status", payload: { plcOnline: true }, timestamp: "..." }
```

---

## 4. Slider Not Responding

### 4.1 — Symptoms

- Moving a slider on the HMI has no effect on the machine
- Slider value changes but machine speed doesn't change
- No error visible on screen

### 4.2 — Diagnostic Steps

```bash
# Step 1: Check if backend is receiving slider requests
pm2 logs feeder-backend --lines 20 | grep -i "write\|speed\|modifier"

# Step 2: Test write directly via API
curl -X POST http://localhost:5000/api/speed \
  -H "Content-Type: application/json" \
  -d '{"axis": 1, "value": 5000}'

# Step 3: Read back to confirm write took effect
curl http://localhost:5000/api/machine

# Step 4: Check Modbus directly
modbus-cli read -h 192.168.1.5 -p 502 -a 20002 -c 1 -t holding

# Step 5: Check browser console for network errors
# Look for failed POST requests to /api/speed
```

### 4.3 — Solutions

| Cause | Solution |
|-------|----------|
| PLC offline | See [PLC Not Connecting](#2-plc-not-connecting) |
| Write to read-only register | Verify MC1–MC4 are writeable in PLC config |
| Value out of range | Modifiers must be 0–9999 (enforced by app) |
| Network issue between Pi and PLC | Check cable, switch, IP configuration |
| Browser not sending POST | Check CORS; verify frontend is configured correctly |

### 4.4 — Emergency Stop

If sliders are not responding and the machine needs to stop:

```bash
# Trigger emergency stop via API
curl -X POST http://192.168.1.50/api/machine/emergency-stop

# This writes 0 to all four modifier registers
```

---

## 5. Nginx 502 Bad Gateway

### 5.1 — Symptoms

- Browser shows "502 Bad Gateway" when loading `http://192.168.1.50`
- `curl http://localhost` returns HTML with 502 status
- `curl http://localhost/api/health` returns HTML 502

### 5.2 — Diagnostic Steps

```bash
# Step 1: Is the backend running?
pm2 status
# feeder-backend should show "online"

# Step 2: Is the backend listening?
sudo ss -tlnp | grep 5000

# Step 3: Check nginx error log
sudo tail -30 /var/log/nginx/error.log

# Step 4: Test backend directly
curl http://localhost:5000/api/health

# Step 5: Test nginx config
sudo nginx -t
```

### 5.3 — Solutions

| Cause | Solution |
|-------|----------|
| Backend crashed | `pm2 restart feeder-backend` |
| Backend port changed | Check `PORT` env var in PM2 config, should be 5000 |
| Nginx config error | `sudo nginx -t` to find syntax errors; fix and `sudo systemctl reload nginx` |
| Upstream defined wrong | Check `upstream backend { server 127.0.0.1:5000; }` in nginx config |
| Port conflict | `sudo lsof -i :5000` — ensure no other process is using the port |

### 5.4 — Restart Sequence

```bash
# Full restart of all services
sudo systemctl restart nginx
pm2 restart all

# Or restart just the affected service
pm2 restart feeder-backend
sudo systemctl reload nginx    # reload (not restart) for zero-downtime
```

---

## 6. High Latency

### 6.1 — Symptoms

- Values on the HMI update slower than expected (lag > 500ms)
- Slider movement followed by delayed machine response
- WebSocket messages arrive at intervals > 100ms

### 6.2 — Diagnostic Steps

```bash
# Step 1: Measure WebSocket latency
# From the Pi, count messages in 5 seconds
timeout 5 wscat -c ws://localhost:5000/ws -o | wc -l
# Expected: ~50 messages (100ms interval × 5 seconds)

# Step 2: Check backend CPU usage
pm2 monit
# feeder-backend CPU should be < 5%

# Step 3: Check system resources
top -bn1 | head -10
free -h
# CPU idle should be > 90%, memory should not be exhausted

# Step 4: Check PLC scan cycle
# If the PLC scan cycle exceeds 100ms, the 100ms poll interval will stack

# Step 5: Check network latency
ping -c 10 192.168.1.5
# Expected: rtt avg < 1ms on a local network
```

### 6.3 — Solutions

| Cause | Solution |
|-------|----------|
| PLC scan cycle too long | Optimize PLC program; increase poll interval if needed |
| Network congestion | Verify switch isn't saturated; check for broadcast storms |
| Pi CPU throttling | Check temperature: `vcgencmd measure_temp`; should be < 80°C |
| Memory swap | `free -h` — if swap is used, add more RAM or reduce processes |
| Too many WebSocket clients | Each client adds overhead; typical max is 10–20 tablets |
| Frontend rendering bottleneck | Check browser FPS; reduce animation/debounce updates |

### 6.4 — Adjusting Poll Interval

If the PLC cannot keep up with 100ms polling, increase the interval in `server/src/config.ts`:

```typescript
POLL_INTERVAL_MS: 200,  // Change from 100 to 200
```

Or set via environment variable (if supported):

```bash
# Modify ecosystem.config.js to pass the variable
pm2 restart feeder-backend --update-env
```

---

## 7. Log File Locations & Analysis

### 7.1 — Log File Inventory

| Log File | Location | Purpose |
|----------|----------|---------|
| Backend output | `/opt/feeder-hmi/server/logs/backend-out.log` | Standard application logs |
| Backend errors | `/opt/feeder-hmi/server/logs/backend-error.log` | Error-level logs only |
| Frontend output | `/opt/feeder-hmi/server/logs/frontend-out.log` | Vite preview server logs |
| Frontend errors | `/opt/feeder-hmi/server/logs/frontend-error.log` | Frontend error logs |
| Nginx access | `/var/log/nginx/access.log` | All HTTP requests |
| Nginx errors | `/var/log/nginx/error.log` | Nginx configuration and proxy errors |
| PM2 logs | `/root/.pm2/logs/` | PM2 process manager logs |
| System logs | `/var/log/syslog` | OS-level messages |

### 7.2 — Log Analysis Commands

```bash
# Follow backend logs in real-time
tail -f /opt/feeder-hmi/server/logs/backend-out.log

# Search for errors in the last 100 lines
tail -100 /opt/feeder-hmi/server/logs/backend-error.log | grep -i "error\|fail\|exception"

# Count error frequency
grep -c "error" /opt/feeder-hmi/server/logs/backend-error.log

# Find Modbus-related entries
grep -i "modbus" /opt/feeder-hmi/server/logs/backend-out.log

# Find WebSocket-related entries
grep -i "websocket\|client connected\|client disconnected" /opt/feeder-hmi/server/logs/backend-out.log

# View PM2 logs
pm2 logs --lines 100 --nostream
```

### 7.3 — Log Severity Levels

| Level | Prefix | Description |
|-------|--------|-------------|
| INFO | `[INFO]` | Normal operation messages |
| ERROR | `[ERROR]` | Errors that don't crash the process |
| WARN | `[WARN]` | Unexpected but non-critical events |

Log format example:

```
2026-06-24 12:00:00 [INFO]  [modbus] PLC connected at 192.168.1.5:502
2026-06-24 12:00:01 [ERROR] [modbus] Failed to read register 20002
2026-06-24 12:00:02 [INFO]  [system] WebSocket client connected
```

### 7.4 — Log Management

#### Log Rotation

PM2 logs are automatically rotated. To configure:

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
```

#### Manual Log Cleanup

```bash
# Clear all application logs (will be recreated)
pm2 flush

# Remove old log files manually
rm -f /opt/feeder-hmi/server/logs/*.log

# Clear nginx logs
sudo truncate -s 0 /var/log/nginx/access.log
sudo truncate -s 0 /var/log/nginx/error.log
```

---

## 8. Emergency Recovery Procedures

### 8.1 — Quick Recovery Checklist

```bash
# 1. Check physical
#    - Pi power LED (red) is on
#    - Pi activity LED (green) is blinking
#    - Ethernet link LEDs are lit on Pi, switch, and PLC

# 2. Check network
ping -c 2 192.168.1.50     # Can you reach the Pi?
ping -c 2 192.168.1.5      # Can the Pi reach the PLC?

# 3. Check services
ssh pi@192.168.1.50
sudo systemctl status nginx
pm2 status

# 4. Restart services
sudo systemctl restart nginx
pm2 restart all

# 5. Check health
curl http://localhost/api/health
```

### 8.2 — System Hang Recovery

If the Pi is unresponsive (no SSH, no web):

```bash
# Step 1: Attempt SSH with verbose output
ssh -vvv pi@192.168.1.50

# Step 2: If no response, check if Pi is powered
#    - Red LED should be solid
#    - Green LED should blink or be solid

# Step 3: Force restart
#    - Disconnect power, wait 10 seconds, reconnect
#    - Or use a remote power switch / PoE if available

# Step 4: Wait 2 minutes, try SSH again
ssh pi@192.168.1.50
pm2 status
sudo systemctl status nginx
```

### 8.3 — Application Crash Recovery

```bash
# If backend keeps crashing
pm2 logs feeder-backend --lines 50
# Identify the cause from the error log

# Reset crash counters and restart
pm2 reset feeder-backend
pm2 restart feeder-backend

# If frontend keeps crashing
pm2 reset feeder-frontend
pm2 restart feeder-frontend

# If both keep crashing
pm2 delete all
cd /opt/feeder-hmi/server
pm2 start ecosystem.config.js
pm2 save
```

### 8.4 — Corrupted Installation Recovery

If the application files are corrupted or misconfigured:

```bash
# Option A: Restore from backup
sudo bash /opt/feeder-hmi/deployment/scripts/restore-app.sh

# Option B: Reinstall from scratch
sudo bash /opt/feeder-hmi/deployment/scripts/install.sh
sudo bash /opt/feeder-hmi/deployment/scripts/setup-server.sh

# Option C: Full re-image (last resort)
# Re-flash the SD card following INSTALLATION_GUIDE.md
```

### 8.5 — SD Card Corruption Recovery

If the Pi fails to boot (green LED blinks in a pattern):

```bash
# Pattern: 3 long, 3 short = generic failure to boot
# Pattern: 4 long, 6 short = SD card not detected

# Solution:
# 1. Remove SD card, insert into computer
# 2. Check if card is detected
# 3. If detected, run fsck:
#    fsck /dev/sdX2   (Linux)
#    chkdsk E: /f     (Windows)
# 4. If undetected or too many bad sectors, re-flash the card
# 5. Restore from backup after re-flashing
```

### 8.6 — PLC Communication Emergency

If the HMI cannot communicate with the PLC and the machine must run:

```bash
# Option 1: Restart the backend to force reconnection
pm2 restart feeder-backend

# Option 2: Bypass the Pi and connect the tablet directly to the PLC
# (Only if the PLC has a built-in web server for diagnostics)

# Option 3: Use a laptop with modbus-cli directly connected to the PLC
# Laptop IP: 192.168.1.100
modbus-cli read -h 192.168.1.5 -p 502 -a 20002 -c 1 -t holding
modbus-cli write -h 192.168.1.5 -p 502 -a 20002 -t holding 0  # Emergency stop
```

### 8.7 — Emergency Stop Activation

If the HMI frontend is not responding but SSH is available:

```bash
# Via API
curl -X POST http://localhost:5000/api/machine/emergency-stop

# Via Modbus directly (writes 0 to all modifier registers)
modbus-cli write -h 192.168.1.5 -p 502 -a 20002 -t holding 0
modbus-cli write -h 192.168.1.5 -p 502 -a 20008 -t holding 0
modbus-cli write -h 192.168.1.5 -p 502 -a 20014 -t holding 0
modbus-cli write -h 192.168.1.5 -p 502 -a 20020 -t holding 0
```

### 8.8 — Contact Information

Record local support contacts here:

| Role | Name | Phone |
|------|------|-------|
| System administrator | | |
| Electrical engineer | | |
| PLC programmer | | |
| Raspberry Pi support | | |

---

## References

- [Installation Guide](INSTALLATION_GUIDE.md)
- [Raspberry Pi Setup Guide](RASPBERRY_PI_SETUP.md)
- [Server Setup Guide](SERVER_SETUP.md)
- [Network Setup Guide](NETWORK_SETUP.md)
- [Modbus Setup Guide](MODBUS_SETUP.md)
- [Backup & Restore Guide](BACKUP_AND_RESTORE.md)
