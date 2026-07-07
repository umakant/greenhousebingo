#!/usr/bin/env bash
# Greenhouse Bingo production redeploy (Next.js on port 5030).
#
# IMPORTANT — custom company domains (e.g. socialgreenhouse.greenhousebingo.com):
#   • Must be proxied by nginx to THIS Next.js app (port 5000).
#   • Do NOT point subdomains at Vite / Lovable preview (vite preview, vite dev).
#   • Do NOT edit the repo-root vite.config.js — that is Laravel only, not the company site.
#
# After pull, install nginx config from deploy/greenhousebingo.nginx.example if needed.
set -euo pipefail

APP_ROOT="${APP_ROOT:-/var/www/apps/greenhousebingo}"
NEXTJS="$APP_ROOT/nextjs"
PORT="${PORT:-5030}"

echo "[greenhousebingo] App root: $APP_ROOT"

cd "$NEXTJS"

export PORT
export HOSTNAME=0.0.0.0
export NODE_ENV=production

for f in .env .env.local .env.production; do
  if [[ -f "$f" ]]; then
    if grep -q '^PORT=' "$f"; then
      sed -i "s/^PORT=.*/PORT=$PORT/" "$f"
    else
      echo "PORT=$PORT" >> "$f"
    fi
    if ! grep -q '^NEXT_PUBLIC_APP_URL=' "$f"; then
      echo 'NEXT_PUBLIC_APP_URL=https://greenhousebingo.com' >> "$f"
    fi
  fi
done

echo "[greenhousebingo] Installing dependencies..."
npm ci --omit=dev 2>/dev/null || npm install --omit=dev

echo "[greenhousebingo] Ensuring company theme static files..."
npm run db:ensure:company-themes 2>/dev/null || true
npm run db:fix:plant-bingo-asset-paths 2>/dev/null || true

echo "[greenhousebingo] Building Next.js..."
npm run build

echo "[greenhousebingo] Restarting PM2 on port $PORT..."
pm2 delete greenhousebingo 2>/dev/null || true
pm2 start "$APP_ROOT/deploy/greenhousebingo-pm2.config.cjs"
pm2 save

echo "[greenhousebingo] Listening ports (should show :$PORT for node/next):"
ss -tlnp | grep -E ":$PORT|:5173|:4173" || true

echo ""
echo "[greenhousebingo] If socialgreenhouse.greenhousebingo.com still shows a Vite 'allowedHosts' error:"
echo "  1. nginx must include: server_name greenhousebingo.com *.greenhousebingo.com;"
echo "  2. proxy_pass http://127.0.0.1:$PORT;"
echo "  3. Stop any vite preview/dev: pm2 list | grep -i vite; kill stray node on 5173/4173"
echo "  4. DNS: CNAME socialgreenhouse -> greenhousebingo.com (same server, not Lovable)"
echo "  See: $APP_ROOT/deploy/greenhousebingo.nginx.example"
