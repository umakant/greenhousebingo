#!/bin/bash
set -e

# Applies to all Node steps in this script (install, prisma, next build workers inherit env).
export NODE_OPTIONS="--max-old-space-size=8192"

cd /home/runner/workspace/nextjs

# Ensure the packages symlink exists so /packages/workdo/... paths are served correctly
ln -sfn /home/runner/workspace/packages public/packages

npm install --production=false
npx prisma generate

# Push schema with retry logic for transient platform database issues
MAX_RETRIES=8
RETRY_DELAY=20
for i in $(seq 1 $MAX_RETRIES); do
  echo "[build] prisma db push attempt $i/$MAX_RETRIES..."
  if npx prisma db push --accept-data-loss; then
    echo "[build] Schema push succeeded."
    break
  fi
  if [ "$i" -eq "$MAX_RETRIES" ]; then
    echo "[build] ERROR: prisma db push failed after $MAX_RETRIES attempts."
    exit 1
  fi
  echo "[build] Retrying in ${RETRY_DELAY}s..."
  sleep $RETRY_DELAY
done

# Run schema ensure scripts — allow individual failures (|| true) so one
# broken script doesn't abort the entire build
node scripts/ensure-notifications-schema.js || echo "[build] WARN: ensure-notifications-schema failed (non-fatal)"
node scripts/ensure-currencies-schema.js    || echo "[build] WARN: ensure-currencies-schema failed (non-fatal)"
node scripts/ensure-projects-schema.js      || echo "[build] WARN: ensure-projects-schema failed (non-fatal)"
node scripts/ensure-cms-schema.js           || echo "[build] WARN: ensure-cms-schema failed (non-fatal)"
node scripts/ensure-helpdesk-schema.js      || echo "[build] WARN: ensure-helpdesk-schema failed (non-fatal)"
node scripts/ensure-subscription-schema.js  || echo "[build] WARN: ensure-subscription-schema failed (non-fatal)"
node scripts/ensure-users-plan-columns.js   || echo "[build] WARN: ensure-users-plan-columns failed (non-fatal)"
node scripts/ensure-storefront-events-schema.js || echo "[build] WARN: ensure-storefront-events-schema failed (non-fatal)"
node scripts/ensure-st-faqs-schema.js           || echo "[build] WARN: ensure-st-faqs-schema failed (non-fatal)"

npm run build
