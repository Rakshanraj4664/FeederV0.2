# ---- Build Frontend ----
FROM node:20-alpine AS frontend-build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- Build Backend ----
FROM node:20-alpine AS backend-build
WORKDIR /app

COPY server/package*.json ./
RUN npm ci --production

COPY server/ .

# ---- Production ----
FROM node:20-alpine
WORKDIR /app

RUN apk add --no-cache nginx

# Frontend
COPY --from=frontend-build /app/dist /usr/share/nginx/html
COPY deployment/nginx/nginx.conf /etc/nginx/nginx.conf

# Backend
COPY --from=backend-build /app /app/backend

# PM2
RUN npm install -g pm2

# Entrypoint
COPY deployment/docker/docker-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 80 5000

ENTRYPOINT ["/entrypoint.sh"]
