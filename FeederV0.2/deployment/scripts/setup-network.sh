#!/bin/bash
set -e

echo "========================================"
echo " Feeder HMI - Network Configuration"
echo "========================================"

if [ "$EUID" -ne 0 ]; then
  echo "Please run as root (sudo ./setup-network.sh)"
  exit 1
fi

# Get current interface
INTERFACE=$(ip route get 1 | awk '{print $5; exit}')
echo "Detected network interface: $INTERFACE"

# Configure static IP
echo ""
echo "Configuring static IP: 192.168.1.50/24"
echo "Gateway: 192.168.1.1"
echo "DNS: 8.8.8.8, 1.1.1.1"
echo ""

# Backup current config
cp /etc/dhcpcd.conf /etc/dhcpcd.conf.backup 2>/dev/null || true

cat >> /etc/dhcpcd.conf <<EOF

# Static IP for Feeder HMI
interface $INTERFACE
static ip_address=192.168.1.50/24
static routers=192.168.1.1
static domain_name_servers=8.8.8.8 1.1.1.1
EOF

echo "✓ Static IP configured for $INTERFACE (192.168.1.50)"
echo ""

# Configure firewall
echo "Configuring firewall rules..."
ufw allow from 192.168.1.0/24 to any port 80 proto tcp comment 'HMI Frontend'
ufw allow from 192.168.1.0/24 to any port 5000 proto tcp comment 'HMI Backend'
ufw allow from 192.168.1.0/24 to any port 502 proto tcp comment 'Modbus TCP'
echo "✓ Firewall rules updated"
echo ""

# Configure hostname
current_hostname=$(hostname)
if [ "$current_hostname" != "feeder-pi" ]; then
  echo "Setting hostname to feeder-pi..."
  hostnamectl set-hostname feeder-pi
  sed -i 's/127.0.1.1.*/127.0.1.1\tfeeder-pi/' /etc/hosts
  echo "✓ Hostname set to feeder-pi"
fi

echo ""
echo "Network configuration complete!"
echo "Reboot recommended to apply static IP."
echo "Run: sudo reboot"
