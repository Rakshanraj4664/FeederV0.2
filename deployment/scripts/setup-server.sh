#!/bin/bash
set -e

echo "========================================"
echo " Feeder HMI - Server Setup"
echo "========================================"

APP_DIR="/opt/feeder-hmi"

if [ ! -d "$APP_DIR" ]; then
  echo "Error: Application directory $APP_DIR not found."
  echo "Please run install.sh first or copy files to $APP_DIR"
  exit 1
fi

cd "$APP_DIR"

# Install frontend dependencies
echo "Installing frontend dependencies..."
npm install

# Build frontend
echo "Building frontend..."
npm run build

# Install backend dependencies
echo "Installing backend dependencies..."
cd server
npm install
cd ..

# Compile backend TypeScript
echo "Compiling backend TypeScript..."
cd server
npx tsc
cd ..

# Configure Nginx
echo "Configuring Nginx..."
cat > /etc/nginx/sites-available/feeder-hmi <<'NGINX'
upstream backend {
    server 127.0.0.1:5000;
}

server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    root /opt/feeder-hmi/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "public, max-age=3600, must-revalidate";
    }

    location /api/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /ws {
        proxy_pass http://backend/ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400s;
    }

    location ~ /\. { deny all; }
}
NGINX

# Enable site
rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/feeder-hmi /etc/nginx/sites-enabled/
nginx -t && systemctl restart nginx

# Start backend with PM2
echo "Starting backend with PM2..."
cd server
pm2 start ecosystem.config.cjs
pm2 save
cd ..

echo ""
echo "✓ Server setup complete!"
echo ""
echo "Services:"
echo "  Frontend: http://192.168.1.50 (port 80)"
echo "  Backend:  http://192.168.1.50:5000/api"
echo "  WebSocket: ws://192.168.1.50/ws"
echo ""
pm2 status
