#!/bin/bash
set -e

cd /home/runner/workspace/nextjs

# Explicitly set PORT=5000 so Next.js and all middleware bind to the correct port.
# The platform forwards localPort=5000 → externalPort=80.
# We override the PORT env var here so nothing else can change it.
export PORT=5000
export HOSTNAME=0.0.0.0

echo "[start] Starting Next.js on port $PORT (hostname $HOSTNAME)"
exec node_modules/.bin/next start --port "$PORT" --hostname "$HOSTNAME"
