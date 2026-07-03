# Feeder Machine HMI — Modbus Setup

Configuration guide for Modbus TCP communication between the Raspberry Pi HMI and the PLC, including register maps, the speed calculation formula, and testing procedures.

---

## Table of Contents

1. [Modbus TCP Configuration](#1-modbus-tcp-configuration)
2. [Register Map](#2-register-map)
3. [Speed Calculation Formula](#3-speed-calculation-formula)
4. [Testing with modbus-cli](#4-testing-with-modbus-cli)
5. [Troubleshooting Connectivity](#5-troubleshooting-connectivity)
6. [Application Mock Mode](#6-application-mock-mode)

---

## 1. Modbus TCP Configuration

### 1.1 — Connection Parameters

| Parameter | Value | Description |
|-----------|-------|-------------|
| Protocol | Modbus TCP | Standard Modbus over Ethernet |
| PLC IP | `192.168.1.5` | Configured in `server/src/config.ts` |
| PLC Port | `502` | Default Modbus TCP port |
| Timeout | `2000 ms` | Socket timeout on the Modbus client |
| Reconnect interval | `3000 ms` | Time between reconnection attempts |
| Max reconnect attempts | `10` | Maximum reconnection retries before giving up |
| Poll interval | `100 ms` | Read cycle for all machine registers |

### 1.2 — Modbus Client Library

The application uses the [`modbus-serial`](https://www.npmjs.com/package/modbus-serial) npm package to communicate with the PLC:

```typescript
import ModbusRTU from 'modbus-serial'

const client = new ModbusRTU()
await client.connectTCP('192.168.1.5', { port: 502 })
client.setTimeout(2000)
```

### 1.3 — PLC Requirements

The PLC must:

- Support Modbus TCP server mode on port 502
- Support reading holding registers (function code 0x03)
- Support writing single holding registers (function code 0x06)
- Have the register map (Section 2) configured in its memory
- Have a static IP of `192.168.1.5`

### 1.4 — Modbus Function Codes Used

| Function Code | Action | Registers |
|--------------|--------|-----------|
| `0x03` (Read Holding Registers) | Read current values | All registers |
| `0x06` (Write Single Register) | Write new value | Modifier registers (20002, 20008, 20014, 20020) |

---

## 2. Register Map

### 2.1 — Modifier Registers (Writeable)

These registers control the speed modifier for each axis. The operator adjusts these via slider controls on the HMI tablet.

| Register | Address | Name | Range | Type | Description |
|----------|---------|------|-------|------|-------------|
| D20002 | `20002` | MC1 | 0–9999 | Holding Register | Modifier for Axis 1 |
| D20008 | `20008` | MC2 | 0–9999 | Holding Register | Modifier for Axis 2 |
| D20014 | `20014` | MC3 | 0–9999 | Holding Register | Modifier for Axis 3 |
| D20020 | `20020` | MC4 | 0–9999 | Holding Register | Modifier for Axis 4 |

Config source (`server/src/config.ts`):

```typescript
MODIFIER: {
  MC1: 20002,
  MC2: 20008,
  MC3: 20014,
  MC4: 20020,
},
MODIFIER_MIN: 0,
MODIFIER_MAX: 9999,
```

### 2.2 — Axis Speed Registers (Read-Only)

These registers contain the calculated output speed for each axis.

| Register | Address | Name | Description |
|----------|---------|------|-------------|
| D28022 | `28022` | AXIS1 | Calculated speed for Axis 1 |
| D28024 | `28024` | AXIS2 | Calculated speed for Axis 2 |
| D28026 | `28026` | AXIS3 | Calculated speed for Axis 3 |
| D28028 | `28028` | AXIS4 | Calculated speed for Axis 4 |

Config source:

```typescript
AXIS_SPEED: {
  AXIS1: 28022,
  AXIS2: 28024,
  AXIS3: 28026,
  AXIS4: 28028,
},
```

### 2.3 — Width Registers (Read-Only)

These registers report the current width gap and offset.

| Register | Address | Name | Description |
|----------|---------|------|-------------|
| D2000 | `2000` | Width Expand Gap | Current expand width gap reading |
| D2004 | `2004` | Width Contract Offset | Current contract offset reading |

Config source:

```typescript
WIDTH: {
  EXPAND: 2000,
  CONTRACT: 2004,
},
```

### 2.4 — Base Frequency Register (Internal)

| Register | Address | Value | Description |
|----------|---------|-------|-------------|
| D32010 | `32010` | `32010` | Base frequency used in speed calculation |

Config source:

```typescript
BASE_FREQUENCY: 32010,
```

### 2.5 — Complete Register Map Summary

| Address | Name | Access | Range | Purpose |
|---------|------|--------|-------|---------|
| 2000 | Width Expand Gap | Read | 0–65535 | Current gap measurement |
| 2004 | Width Contract Offset | Read | 0–65535 | Current offset measurement |
| 20002 | MC1 | Read/Write | 0–9999 | Axis 1 speed modifier |
| 20008 | MC2 | Read/Write | 0–9999 | Axis 2 speed modifier |
| 20014 | MC3 | Read/Write | 0–9999 | Axis 3 speed modifier |
| 20020 | MC4 | Read/Write | 0–9999 | Axis 4 speed modifier |
| 28022 | Axis 1 Speed | Read | 0–65535 | Calculated axis speed |
| 28024 | Axis 2 Speed | Read | 0–65535 | Calculated axis speed |
| 28026 | Axis 3 Speed | Read | 0–65535 | Calculated axis speed |
| 28028 | Axis 4 Speed | Read | 0–65535 | Calculated axis speed |
| 32010 | Base Frequency | Internal | 32010 | Speed calculation constant |

---

## 3. Speed Calculation Formula

### 3.1 — Formula

```
Axis Speed = Modifier × Base Frequency
```

Where:

- **Modifier**: The value written to the modifier register (D20002, D20008, D20014, or D20020), range 0–9999
- **Base Frequency**: Fixed value of `32010` (register D32010)

### 3.2 — Examples

| Modifier | Base Frequency | Axis Speed |
|----------|---------------|------------|
| 0 | 32010 | 0 (stopped) |
| 1000 | 32010 | 32,010,000 |
| 5000 | 32010 | 160,050,000 |
| 9999 | 32010 | 320,067,990 (maximum) |

### 3.3 — Application Implementation

The formula is calculated on the PLC. The HMI only reads the result from the axis speed registers (28022–28028). The HMI writes modifier values and the PLC computes the speed internally.

### 3.4 — Emergency Stop

When the emergency stop button is pressed, all modifier registers are set to 0:

```typescript
async emergencyStop(): Promise<void> {
  await this.writeRegister(20002, 0)  // MC1
  await this.writeRegister(20008, 0)  // MC2
  await this.writeRegister(20014, 0)  // MC3
  await this.writeRegister(20020, 0)  // MC4
}
```

Setting modifiers to 0 causes the calculated axis speeds to become 0 (`0 × 32010 = 0`), stopping all motion.

---

## 4. Testing with modbus-cli

### 4.1 — Installing modbus-cli

On the Raspberry Pi:

```bash
# Install via npm
sudo npm install -g modbus-cli

# Or install via apt
sudo apt install -y modbus-cli
```

### 4.2 — Reading Registers

```bash
# Read a single holding register (e.g., MC1 at address 20002)
modbus-cli read -h 192.168.1.5 -p 502 -a 20002 -c 1 -t holding

# Read multiple registers (4 modifiers starting at 20002)
modbus-cli read -h 192.168.1.5 -p 502 -a 20002 -c 4 -t holding

# Read axis speeds (4 registers starting at 28022)
modbus-cli read -h 192.168.1.5 -p 502 -a 28022 -c 4 -t holding

# Read width registers (2 registers starting at 2000)
modbus-cli read -h 192.168.1.5 -p 502 -a 2000 -c 2 -t holding
```

### 4.3 — Writing Registers

```bash
# Write a value to a single holding register
modbus-cli write -h 192.168.1.5 -p 502 -a 20002 -t holding 5000

# Set all modifiers
modbus-cli write -h 192.168.1.5 -p 502 -a 20002 -t holding 2500
modbus-cli write -h 192.168.1.5 -p 502 -a 20008 -t holding 2500
modbus-cli write -h 192.168.1.5 -p 502 -a 20014 -t holding 2500
modbus-cli write -h 192.168.1.5 -p 502 -a 20020 -t holding 2500
```

### 4.4 — Using the Application API

Alternatively, use the HMI's REST API to test:

```bash
# Read current machine state
curl http://192.168.1.50/api/machine

# Write a modifier value
curl -X POST http://192.168.1.50/api/speed \
  -H "Content-Type: application/json" \
  -d '{"axis": 1, "value": 5000}'

# Read status
curl http://192.168.1.50/api/status
```

### 4.5 — Automated Test Script

Save this as `test-modbus.sh`:

```bash
#!/bin/bash
PLC="192.168.1.5"

echo "=== Modbus Connectivity Test ==="
echo "Testing connection to PLC at $PLC:502..."

# Test 1: Connection
if nc -zv $PLC 502 2>&1 | grep -q "succeeded"; then
  echo "[✓] Port 502 is open"
else
  echo "[✗] Cannot connect to port 502"
  exit 1
fi

# Test 2: Read modifiers
echo ""
echo "Reading Modifier Registers (D20002-D20020)..."
for addr in 20002 20008 20014 20020; do
  VALUE=$(modbus-cli read -h $PLC -a $addr -c 1 -t holding 2>/dev/null)
  echo "  D${addr}: $VALUE"
done

# Test 3: Read speeds
echo ""
echo "Reading Axis Speed Registers (D28022-D28028)..."
for addr in 28022 28024 28026 28028; do
  VALUE=$(modbus-cli read -h $PLC -a $addr -c 1 -t holding 2>/dev/null)
  echo "  D${addr}: $VALUE"
done

# Test 4: Write test (set MC1 to 100, then read back)
echo ""
echo "Writing test value to MC1 (D20002)..."
modbus-cli write -h $PLC -a 20002 -t holding 100 2>/dev/null
sleep 1
VALUE=$(modbus-cli read -h $PLC -a 20002 -c 1 -t holding 2>/dev/null)
echo "  D20002 after write: $VALUE (expected: 100)"

echo ""
echo "[✓] Test complete"
```

---

## 5. Troubleshooting Connectivity

### 5.1 — Connection Flow

```
Application Start
       │
       ▼
ModbusService.connectPLC()
       │
       ├── Mock Mode? ──▶ Return true (development only)
       │
       ▼
client.connectTCP('192.168.1.5', { port: 502 })
       │
       ├── Success ──▶ connected = true, start polling
       │
       └── Failure ──▶ connected = error
                       │
                       ▼
                  Schedule reconnect (3s delay)
                       │
                       ▼
                  Reconnect attempt (max 10)
```

### 5.2 — Common Issues and Fixes

#### Issue: "PLC not connected" in logs

```bash
# Step 1: Verify physical connection
ping 192.168.1.5

# Step 2: Check if Modbus port is open
nc -zv 192.168.1.5 502

# Step 3: Check firewall on Pi
sudo ufw status

# Step 4: Check if PLC is in RUN mode (refer to PLC manual)
```

#### Issue: Intermittent disconnections

```
Modbus connection can drop due to:
- Electrical noise on Ethernet cable
- PLC CPU overload (scan cycle too slow)
- Switch port negotiation issues
- Cable length exceeding 100m
```

```bash
# Check Ethernet link quality
ethtool eth0 | grep -E "Speed|Duplex|Link"

# Expected: Speed: 100Mb/s, Duplex: Full, Link detected: yes

# Check for errors on the interface
ip -s link show eth0

# Look for non-zero error, drop, or overrun counts
```

#### Issue: Read timeouts

```bash
# Increase timeout in config.ts or environment
# server/src/config.ts: client.setTimeout(5000)
```

#### Issue: Write failures

```bash
# Check that the registers are writeable (some PLCs mark ranges as read-only)
# Check PLC documentation for register access permissions

# Verify the value is within range (0–9999 for modifiers)
# The application enforces MODIFIER_MIN (0) and MODIFIER_MAX (9999)
```

### 5.3 — Diagnostic Commands

```bash
# Check application log
pm2 logs feeder-backend --lines 50

# Search for Modbus-related log entries
grep -i "modbus\|plc\|register" /opt/feeder-hmi/server/logs/backend-out.log

# Check backend health
curl http://192.168.1.50/api/health

# Check detailed status (includes PLC connection state)
curl http://192.168.1.50/api/status

# Read all machine state
curl http://192.168.1.50/api/machine

# Continuous monitoring
watch -n 1 'curl -s http://192.168.1.50/api/machine | python3 -m json.tool'
```

### 5.4 — PLC-Side Checklist

| Check | Action |
|-------|--------|
| PLC powered on | Verify LED indicators on PLC |
| PLC in RUN mode | Set PLC to RUN (not STOP/PROG) |
| Modbus TCP enabled | Enable Modbus TCP server in PLC config |
| Modbus port 502 open | Verify PLC firewall or port configuration |
| IP address correct | `192.168.1.5` with subnet `255.255.255.0` |
| Registers mapped | Verify D20002–D20020, D28022–D28028, D2000, D2004 are defined |
| Register access | Modifier registers must be writeable; speed/width registers must be readable |
| Scan cycle time | Ensure PLC scan time is not exceeding 100ms (polling interval) |

### 5.5 — Network-level Checks

```bash
# Check for IP conflicts
arp-scan --localnet 2>/dev/null | grep "192.168.1.5"

# If another device responds on 192.168.1.5, you have an IP conflict

# Check for packet loss
ping -c 100 -i 0.1 192.168.1.5
# Look for any lost packets

# Trace route to PLC
traceroute 192.168.1.5
# Should be 1 hop (direct connection)
```

---

## 6. Application Mock Mode

### 6.1 — Purpose

During development or testing without a physical PLC, the application runs in **mock mode**. This allows the frontend to function with simulated data.

### 6.2 — How It's Triggered

```typescript
private detectPlatform() {
  if (process.platform === 'win32' || CONFIG.isDevelopment) {
    this.mockMode = true
  }
}
```

Mock mode activates when:
- Running on Windows (development machine)
- `NODE_ENV` is not `production`

### 6.3 — Behavior in Mock Mode

| Operation | Behavior |
|-----------|----------|
| `connectPLC()` | Returns `true` immediately, sets state to `connected` |
| `readRegister()` | Returns `0` (or previously written value in internal map) |
| `writeRegister()` | Stores value in internal `mockRegisters` map |
| `readMachineState()` | Reads from internal map, returns all zeros if never written |
| `healthCheck()` | Always returns `true` |

### 6.4 — Disabling Mock Mode

On the Raspberry Pi in production, PM2 sets `NODE_ENV=production`:

```bash
# In ecosystem.config.js
env: {
  NODE_ENV: 'production',
  PORT: 5000,
}
```

Verify it's applied:

```bash
pm2 show feeder-backend | grep "NODE_ENV"
# Expected: NODE_ENV = production
```

---

## References

- [Installation Guide](INSTALLATION_GUIDE.md)
- [Server Setup Guide](SERVER_SETUP.md)
- [Network Setup Guide](NETWORK_SETUP.md)
- [Troubleshooting Guide](TROUBLESHOOTING.md)
- [modbus-serial documentation](https://www.npmjs.com/package/modbus-serial)
- [Modbus TCP specification](https://modbus.org/specs.php)
