#!/bin/bash
set -e

echo "========================================"
echo " Feeder HMI - Full Installation Script"
echo "========================================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
error() { echo -e "${RED}[✗]${NC} $1"; }

# Check root
if [ "$EUID" -ne 0 ]; then
  error "Please run as root (sudo ./install.sh)"
  exit 1
fi

# Update system
log "Updating system packages..."
apt update && apt upgrade -y

# Install essential packages
log "Installing essential packages..."
apt install -y curl git build-essential libssl-dev ufw

# Install Node.js 20.x
log "Installing Node.js 20.x..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node -v
npm -v

# Install PM2 globally
log "Installing PM2..."
npm install -g pm2

# Install Nginx
log "Installing Nginx..."
apt install -y nginx
systemctl enable nginx
systemctl start nginx

# Install Docker (optional)
log "Installing Docker..."
curl -fsSL https://get.docker.com | bash
systemctl enable docker
systemctl start docker

# Install Docker Compose
log "Installing Docker Compose..."
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Clone or copy application
APP_DIR="/opt/feeder-hmi"
if [ ! -d "$APP_DIR" ]; then
  log "Creating application directory..."
  mkdir -p "$APP_DIR"
  warn "Please copy your application files to $APP_DIR"
  warn "Then run: cd $APP_DIR && npm install && cd server && npm install"
fi

# Configure firewall
log "Configuring firewall..."
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'
ufw allow 5000/tcp comment 'Backend API'
ufw --force enable

# Setup PM2 startup
log "Setting up PM2 startup..."
pm2 startup systemd -u root --hp /root

# Create logs directory
mkdir -p /var/log/feeder-hmi

echo ""
log "Installation complete!"
echo ""
echo "Next steps:"
echo "  1. Copy application files to $APP_DIR"
echo "  2. Run: cd $APP_DIR && npm install"
echo "  3. Run: cd $APP_DIR/server && npm install"
echo "  4. Run: ./deployment/scripts/setup-server.sh"
echo "  5. Run: ./deployment/scripts/setup-network.sh"
echo ""
