#!/bin/bash
# Backup logs + config
# Cron: 0 2 * * * /opt/social-tool/scripts/backup.sh

set -euo pipefail

BACKUP_DIR="/opt/backups/social-tool"
DATE=$(date +%Y%m%d_%H%M%S)
APP_DIR="/opt/social-tool"

mkdir -p "$BACKUP_DIR"

echo "💾 Backup $DATE..."

# Backup nginx logs
tar -czf "$BACKUP_DIR/nginx-logs-$DATE.tar.gz" \
  /var/lib/docker/volumes/*/nginx/log/ 2>/dev/null || true

# Backup .env (encrypted)
if [ -f "$APP_DIR/.env.production" ]; then
  cp "$APP_DIR/.env.production" "$BACKUP_DIR/env-$DATE.bak"
  chmod 600 "$BACKUP_DIR/env-$DATE.bak"
fi

# Keep chỉ 30 ngày backup
find "$BACKUP_DIR" -type f -mtime +30 -delete

echo "✅ Backup xong: $BACKUP_DIR"
ls -lh "$BACKUP_DIR" | tail -5
