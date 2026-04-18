#!/bin/bash
# Chạy 1 lần trên VPS mới (Ubuntu 22.04)
# Usage: bash setup-vps.sh yourdomain.com your@email.com

set -euo pipefail

DOMAIN="${1:?Usage: setup-vps.sh <domain> <email>}"
EMAIL="${2:?Usage: setup-vps.sh <domain> <email>}"
APP_DIR="/opt/social-tool"

echo "🚀 Setting up VPS for $DOMAIN..."

# ── 1. Update system ──────────────────────────────────────────
apt-get update && apt-get upgrade -y
apt-get install -y curl wget git ufw fail2ban

# ── 2. Install Docker ─────────────────────────────────────────
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker
usermod -aG docker "${SUDO_USER:-ubuntu}"

# ── 3. Firewall ───────────────────────────────────────────────
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow http
ufw allow https
ufw --force enable

# ── 4. Fail2ban ───────────────────────────────────────────────
cat > /etc/fail2ban/jail.local <<EOF
[DEFAULT]
bantime  = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
EOF
systemctl enable fail2ban && systemctl start fail2ban

# ── 5. App directory + .env ───────────────────────────────────
mkdir -p "$APP_DIR"/{nginx/conf.d,scripts,certbot-www}
chown -R "${SUDO_USER:-ubuntu}:${SUDO_USER:-ubuntu}" "$APP_DIR"

# ── 6. Initial SSL Certificate ───────────────────────────────
echo "📜 Obtaining SSL certificate for $DOMAIN..."

# Tạm thời serve file cho ACME challenge
docker run --rm \
  -v "$APP_DIR/certbot-www:/var/www/certbot" \
  -v "/etc/letsencrypt:/etc/letsencrypt" \
  -p 80:80 \
  nginx:alpine sh -c "
    nginx -g 'daemon off; events{} http{server{listen 80; location /.well-known/acme-challenge/{ root /var/www/certbot; }}}' &
    sleep 2
    certbot certonly --webroot -w /var/www/certbot \
      -d $DOMAIN -d www.$DOMAIN \
      --email $EMAIL \
      --agree-tos --non-interactive
  " || echo "⚠️  SSL cert failed - tiếp tục setup, chạy lại sau"

# ── 7. Create .env.production ─────────────────────────────────
cat > "$APP_DIR/.env.production" <<EOF
NODE_ENV=production
PORT=3000
JWT_SECRET=$(openssl rand -base64 48)
JWT_EXPIRES_IN=7d
ALLOWED_ORIGINS=https://$DOMAIN,https://www.$DOMAIN
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
LOG_LEVEL=combined
# Điền các API keys sau:
OPENAI_API_KEY=
FB_APP_ID=
FB_APP_SECRET=
EOF

chmod 600 "$APP_DIR/.env.production"

# ── 8. Swap (nếu VPS RAM < 2GB) ──────────────────────────────
RAM_MB=$(free -m | awk '/^Mem:/{print $2}')
if [ "$RAM_MB" -lt 2048 ]; then
  echo "💾 RAM < 2GB — tạo 2GB swap..."
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

echo ""
echo "✅ VPS setup hoàn tất!"
echo "━━━━━━━━━━━━━━━━━━━━━━"
echo "📁 App dir: $APP_DIR"
echo "📝 Điền API keys vào: $APP_DIR/.env.production"
echo "🔑 Set GitHub Secrets:"
echo "   VPS_HOST = $(curl -s ifconfig.me)"
echo "   VPS_USER = $(whoami)"
echo "   VPS_SSH_KEY = <private key>"
echo ""
echo "→ Push code lên main để deploy tự động!"
