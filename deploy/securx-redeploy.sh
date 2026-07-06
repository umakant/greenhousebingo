#!/bin/bash
# Clean rebuild + restart SecurX on port 5025 (never 5010 — that port is GardaWorld).
set -euo pipefail

APP_ROOT="${APP_ROOT:-/var/www/apps/securx}"
NEXT_DIR="$APP_ROOT/nextjs"

cd "$NEXT_DIR"

export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=8192}"
export PORT=5025
export HOSTNAME=0.0.0.0

fix_port_in_env() {
  local f="$1"
  if [ -f "$f" ]; then
    if grep -q '^PORT=' "$f"; then
      sed -i 's/^PORT=.*/PORT=5025/' "$f"
    else
      echo 'PORT=5025' >> "$f"
    fi
  fi
}

fix_port_in_env .env.local
fix_port_in_env .env
fix_port_in_env prisma/.env

if [ -f .env.local ] && ! grep -q '^NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=' .env.local; then
  echo "[securx] Adding NEXT_SERVER_ACTIONS_ENCRYPTION_KEY (fixes Server Action mismatch)..."
  echo "NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=$(openssl rand -base64 32)" >> .env.local
fi

echo "[securx] Removing old build..."
node scripts/clean-next.js

echo "[securx] Installing dependencies..."
npm install --production=false

echo "[securx] Building..."
npm run build

echo "[securx] Restarting PM2 (port 5025 only)..."
pm2 delete securx 2>/dev/null || true
pm2 start "$APP_ROOT/deploy/securx-pm2.config.cjs"
pm2 save
pm2 flush securx 2>/dev/null || true

echo "[securx] Listening ports:"
ss -tlnp | grep 5025 || true

echo "[securx] Done. Hard-refresh the browser (Ctrl+Shift+R) after deploy."
