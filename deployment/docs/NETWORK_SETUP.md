# Feeder Machine HMI — Network Setup

Network architecture, static IP configuration, firewall rules, and VLAN isolation recommendations for the Feeder HMI deployment.

---

## Table of Contents

1. [Network Architecture](#1-network-architecture)
2. [IP Addressing Scheme](#2-ip-addressing-scheme)
3. [Static IP Configuration](#3-static-ip-configuration)
4. [Firewall Rules](#4-firewall-rules)
5. [VLAN & Isolation Recommendations](#5-vlan--isolation-recommendations)
6. [Network Testing](#6-network-testing)

---

## 1. Network Architecture

### Topology

```
┌─────────────────────────────────────────────────────────────┐
│                    Machine Network (192.168.1.0/24)          │
│                                                             │
│  ┌──────────┐        ┌──────────────┐       ┌──────────┐   │
│  │  Tablet  │        │ Raspberry Pi │       │   PLC    │   │
│  │ (Client) │        │   Feeder     │       │ Modbus   │   │
│  │          │        │   HMI Host   │       │ Server   │   │
│  │ DHCP     │◄──────▶│ 192.168.1.60 │◄─────▶│ 192.168. │   │
│  │ or Static│  HTTP  │  (Static)    │ Modbus│  1.5     │   │
│  │          │  WS    │              │ TCP   │ (Static) │   │
│  └──────────┘        └──────────────┘       └──────────┘   │
│                                                             │
│                        ┌──────────┐                         │
│                        │ Gateway  │                         │
│                        │ 192.168. │                         │
│                        │  1.1     │                         │
│                        └────┬─────┘                         │
│                             │                               │
└─────────────────────────────┼───────────────────────────────┘
                              │
                     (Internet, if needed
                      for updates only)
```

### Traffic Flows

| Flow | Protocol | Direction | Description |
|------|----------|-----------|-------------|
| Tablet → Pi :80 | HTTP | Inbound | Browser loads HMI frontend |
| Tablet → Pi :80/ws | WebSocket | Inbound | Real-time machine state updates |
| Tablet → Pi :80/api/* | HTTP/REST | Inbound | Slider changes, speed commands |
| Pi → PLC :502 | Modbus TCP | Outbound | Read/write holding registers |

---

## 2. IP Addressing Scheme

### Static Assignments

| Device | IP Address | Subnet | Gateway | Purpose |
|--------|-----------|--------|---------|---------|
| Raspberry Pi | `192.168.1.60` | `/24` | `192.168.1.1` | HMI web server |
| PLC | `192.168.1.6` | `/24` | `192.168.1.1` (or none) | Modbus TCP target |
| Network Gateway | `192.168.1.1` | `/24` | — | Router / L3 switch |

### DHCP Pool (for Tablets and other clients)

| Range | Usage |
|-------|-------|
| `192.168.1.100` – `192.168.1.200` | DHCP-assigned tablet addresses |
| `192.168.1.1` – `192.168.1.49` | Reserved for infrastructure |
| `192.168.1.60` – `192.168.1.99` | Reserved for static devices |

### DNS Configuration

| Server | Address | Purpose |
|--------|---------|---------|
| Primary | `8.8.8.8` | Google DNS (internet access) |
| Secondary | `1.1.1.1` | Cloudflare DNS (fallback) |

---

## 3. Static IP Configuration

### 3.1 — Raspberry Pi Static IP

The Pi uses `dhcpcd` to set a static IP. Configuration is in `/etc/dhcpcd.conf`.

#### Automated Configuration

```bash
sudo bash /opt/feeder-hmi/deployment/scripts/setup-network.sh
```

This script:

1. Detects the active network interface (typically `eth0`)
2. Appends static IP configuration to `/etc/dhcpcd.conf`
3. Configures UFW firewall rules
4. Sets the hostname to `feeder-pi`

#### Manual Configuration

Edit `/etc/dhcpcd.conf`:

```bash
sudo nano /etc/dhcpcd.conf
```

Add at the end:

```
interface eth0
static ip_address=192.168.1.60/24
static routers=192.168.1.1
static domain_name_servers=8.8.8.8 1.1.1.1
```

#### Apply and Verify

```bash
sudo reboot
# After reboot:
hostname -I
# Expected: 192.168.1.60
```

### 3.2 — PLC Static IP

Configure the PLC's static IP according to its manufacturer's instructions. Ensure:

- IP: `192.168.1.6`
- Subnet mask: `255.255.255.0`
- Gateway: `192.168.1.1` (or leave blank if isolated)
- The PLC should be configured **before** connecting it to the production network

### 3.3 — Verifying IP Configuration

```bash
# On the Pi, check all interfaces
ip addr show

# Confirm Pi IP
hostname -I

# Confirm PLC is reachable
ping -c 3 192.168.1.6

# Check ARP table
arp -a

# Check routing
ip route
```

Expected route output:

```
default via 192.168.1.1 dev eth0
192.168.1.0/24 dev eth0 proto kernel scope link src 192.168.1.60
```

---

## 4. Firewall Rules

### 4.1 — UFW Configuration

The firewall is managed via UFW (Uncomplicated Firewall).

#### Base Rules

```bash
# Default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# SSH — restrict to local subnet only
sudo ufw allow from 192.168.1.0/24 to any port 22 proto tcp comment 'SSH access'

# HTTP — HMI frontend, accessible from tablets on the subnet
sudo ufw allow from 192.168.1.0/24 to any port 80 proto tcp comment 'HMI Frontend HTTP'

# Backend API — localhost only (proxied via nginx)
sudo ufw allow from 127.0.0.1 to any port 5000 proto tcp comment 'Backend API local'

# Enable firewall
sudo ufw --force enable
```

#### Outbound Rules

```bash
# Allow Modbus TCP to PLC
sudo ufw allow out on eth0 to 192.168.1.6 port 502 proto tcp comment 'Modbus TCP to PLC'

# Allow DNS (for outbound name resolution if internet is available)
sudo ufw allow out to any port 53 proto udp comment 'DNS'

# Allow NTP (for time synchronization)
sudo ufw allow out to any port 123 proto udp comment 'NTP'

# Allow HTTP/HTTPS for system updates (if internet access is needed)
sudo ufw allow out to any port 80 proto tcp comment 'HTTP updates'
sudo ufw allow out to any port 443 proto tcp comment 'HTTPS updates'
```

#### Complete Rule Set

```bash
sudo ufw status verbose
```

Expected:

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

Outbound:
502/tcp                    ALLOW OUT   192.168.1.6 (eth0)
53/udp                     ALLOW OUT   Anywhere
123/udp                    ALLOW OUT   Anywhere
80,443/tcp                 ALLOW OUT   Anywhere
```

### 4.2 — Port Reference

| Port | Protocol | Service | Direction | Source → Destination |
|------|----------|---------|-----------|-------------------|
| 22 | TCP | SSH | Inbound | `192.168.1.0/24` → Pi |
| 80 | TCP | HTTP (HMI) | Inbound | `192.168.1.0/24` → Pi |
| 5000 | TCP | Backend API | Local | `127.0.0.1` → Pi |
| 502 | TCP | Modbus | Outbound | Pi → `192.168.1.6` |
| 53 | UDP | DNS | Outbound | Pi → Any |
| 123 | UDP | NTP | Outbound | Pi → Any |
| 443 | TCP | HTTPS | Outbound | Pi → Any (updates) |

### 4.3 — Port Justification

| Port | Why It's Open | Risk if Exposed | Mitigation |
|------|--------------|-----------------|------------|
| 22 (SSH) | Remote administration | Brute-force attacks | Restricted to subnet, key-only auth, Fail2Ban |
| 80 (HTTP) | HMI web interface | Unencrypted traffic | Internal network only; no sensitive credentials transmitted |
| 5000 (API) | Backend server | Direct API access | Bound to localhost only; nginx proxies public requests |
| 502 (Modbus) | PLC communication | Modbus has no auth | Outbound only to known PLC IP |

---

## 5. VLAN & Isolation Recommendations

### 5.1 — Recommended Network Segmentation

For production environments, separate the machine network from the corporate/office network:

```                                                    
┌─────────────────────────────────────────────────────────┐
│                  Corporate Network                       │
│                  (10.0.0.0/24)                           │
│                                                         │
│  Only plant supervisory systems have access to the      │
│  machine network through a managed switch ACL or        │
│  firewall rule.                                         │
└────────────────────────┬────────────────────────────────┘
                         │
               ┌─────────┴─────────┐
               │   Managed Switch   │
               │  (L3 with ACLs)   │
               └─────────┬─────────┘
                         │
┌────────────────────────┴────────────────────────────────┐
│                  Machine Network                          │
│                  (192.168.1.0/24)                        │
│                                                         │
│  ┌──────────┐    ┌──────────────┐    ┌──────────┐      │
│  │  Tablet  │    │  Pi (HMI)    │    │   PLC    │      │
│  │ .100-.200│    │  .50 (static)│    │  .5      │      │
│  └──────────┘    └──────────────┘    └──────────┘      │
└─────────────────────────────────────────────────────────┘
```

### 5.2 — VLAN Configuration (Managed Switch)

If using a managed switch with VLAN support:

| VLAN ID | Name | Subnet | Ports | Devices |
|---------|------|--------|-------|---------|
| 10 | Machine | `192.168.1.0/24` | 1–4 | Pi, PLC, tablets |
| 1 | Default/Management | `10.0.0.0/24` | Uplink | Switch management |

Access Control List (ACL) on the switch:

```
# Allow HMI traffic from tablet to Pi
permit tcp 192.168.1.0/24 192.168.1.60/32 eq 80
permit tcp 192.168.1.0/24 192.168.1.60/32 eq 443

# Allow Modbus from Pi to PLC
permit tcp 192.168.1.60/32 192.168.1.6/32 eq 502

# Allow SSH from management station to Pi
permit tcp 10.0.0.100/32 192.168.1.60/32 eq 22

# Deny all other traffic between VLANs
deny ip any any
```

### 5.3 — Physical Isolation (No Switch Configuration)

For the simplest deployment with an unmanaged switch:

- Connect Pi, PLC, and tablet(s) to the same unmanaged switch
- Do **not** connect the switch to the corporate network (air-gap)
- Configure PLC without a gateway (no internet route from the machine network)

### 5.4 — Security Best Practices

| Practice | Implementation |
|----------|---------------|
| Air gap the machine network | No direct connection to the internet or corporate LAN |
| Use managed switch ACLs | Restrict inter-VLAN traffic to only necessary protocols |
| Disable PLC services | Turn off unused PLC services (web server, FTP, etc.) |
| Change default passwords | Change Pi `pi` user password and any PLC default credentials |
| Log MAC addresses | Record all device MACs connected to the network |
| Physical security | Lock the control panel containing the Pi and switch |
| Monitor for rogue devices | Check ARP table periodically: `arp -a` |
| Disable Wi-Fi and Bluetooth on Pi | `sudo rfkill block wifi && sudo rfkill block bluetooth` |

### 5.5 — Network Redundancy (Optional)

For critical applications:

- **Dual Pi setup**: A secondary Pi on standby with the same configuration
- **Redundant switch**: Stacked switches with Rapid Spanning Tree Protocol (RSTP)
- **UPS**: Uninterruptible power supply for the switch, Pi, and PLC

---

## 6. Network Testing

### 6.1 — Connectivity Tests

Run these from the Raspberry Pi:

```bash
# Can we reach the gateway?
ping -c 3 192.168.1.1

# Can we reach the PLC?
ping -c 3 192.168.1.6

# Is port 502 open on the PLC?
nc -zv 192.168.1.6 502
# Expected: Connection to 192.168.1.6 port 502 [tcp/mbap] succeeded!

# Is nginx listening on port 80?
sudo ss -tlnp | grep ':80'

# Is the backend listening on port 5000?
sudo ss -tlnp | grep ':5000'

# Can we reach the internet? (if connected)
ping -c 3 8.8.8.8
```

### 6.2 — From a Tablet

```bash
# Open a browser and navigate to:
http://192.168.1.60

# The HMI dashboard should load and show live data
```

### 6.3 — Bandwidth Considerations

| Connection | Data Rate | Acceptable? |
|-----------|-----------|-------------|
| WebSocket broadcast | ~1 KB per message at 100ms = ~10 KB/s | Yes, negligible |
| REST API calls | ~500 B per request, infrequent | Yes, negligible |
| Total bandwidth | < 100 KB/s | Well within 100 Mbps Ethernet capacity |

---

## References

- [Installation Guide](INSTALLATION_GUIDE.md)
- [Raspberry Pi Setup Guide](RASPBERRY_PI_SETUP.md)
- [Server Setup Guide](SERVER_SETUP.md)
- [Modbus Setup Guide](MODBUS_SETUP.md)
- [Troubleshooting Guide](TROUBLESHOOTING.md)
