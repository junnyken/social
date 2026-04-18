#!/bin/bash
# Manual deploy — chạy trực tiếp trên VPS
set -euo pipefail

APP_DIR="/opt/social-tool"
cd "$APP_DIR"

echo "📦 Pulling latest images..."
docker compose -f docker-compose.prod.yml pull

echo "🔄 Deploying..."
docker compose -f docker-compose.prod.yml up -d

echo "⏳ Health check..."
sleep 8
HEALTH=$(curl -sf http://localhost:3000/health | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['status'])" 2>/dev/null || echo "failed")

if [ "$HEALTH" = "ok" ]; then
  echo "✅ Deploy thành công! Status: $HEALTH"
else
  echo "❌ Health check thất bại!"
  docker compose -f docker-compose.prod.yml logs backend --tail=50
  exit 1
fi

docker image prune -f
echo "🧹 Cleanup done"
