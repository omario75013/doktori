#!/bin/bash
# Doktori prod deploy script — runs on prod, called from CI or manually over SSH.
#
# Usage (manual): ssh root@157.90.152.204 'cd /opt/doktori && ./scripts/deploy.sh'
# Usage (CI):     same, invoked by .github/workflows/deploy-prod.yml after rsync.
#
# Pre-conditions:
#   - /opt/doktori/.env.tpl exists with op:// references
#   - 1Password service account token sourced (/etc/profile.d/op-service-account.sh)
#   - All referenced 1P items exist in vault Dartank-Infra
#
# What it does:
#   1. op inject .env.tpl → .env (chmod 600)
#   2. apply pending DB migrations via apply-migrations-prod.sh (tracked,
#      idempotent — only runs new ones since last deploy)
#   3. docker compose build doktori-web
#   4. docker compose up -d
#   5. healthcheck loop (60s max)
#
# Idempotent: safe to re-run. Migrations use a tracking table
# (__doktori_migrations) so already-applied ones are skipped.

set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -f .env.tpl ]; then
  echo "ERROR: .env.tpl not found in $(pwd)" >&2
  exit 1
fi

# Source 1Password service account token (no-op if already in env)
if [ -f /etc/profile.d/op-service-account.sh ]; then
  # shellcheck disable=SC1091
  source /etc/profile.d/op-service-account.sh
fi

if [ -z "${OP_SERVICE_ACCOUNT_TOKEN:-}" ]; then
  echo "ERROR: OP_SERVICE_ACCOUNT_TOKEN not set; cannot run op inject" >&2
  exit 1
fi

echo "[deploy] op inject .env.tpl → .env"
op inject -i .env.tpl -o .env --force
chmod 600 .env

echo "[deploy] verifying 1P resolution succeeded (no leftover op:// refs in .env)"
if grep -q "^[A-Z_]*=op://" .env; then
  echo "ERROR: some op:// refs failed to resolve. Check that all referenced 1P items exist." >&2
  grep "^[A-Z_]*=op://" .env >&2
  exit 1
fi

# Apply pending DB migrations BEFORE building/restarting the app, so the
# new container code matches the new DB shape on first request.
# Tracking table __doktori_migrations + IF NOT EXISTS in each SQL = idempotent.
if [ -x ./apply-migrations-prod.sh ]; then
  echo "[deploy] applying pending DB migrations"
  if ! ./apply-migrations-prod.sh; then
    echo "ERROR: migration step failed — aborting deploy to avoid runtime SQL errors." >&2
    exit 1
  fi
else
  echo "WARN: apply-migrations-prod.sh not found or not executable — skipping migrations."
  echo "      If new migrations exist in packages/db/migrations/, the app will hit SQL errors."
fi

echo "[deploy] docker compose build"
docker compose -f docker-compose.prod.yml build

echo "[deploy] docker compose up -d"
docker compose -f docker-compose.prod.yml up -d

echo "[deploy] waiting for healthcheck (60s max)"
for i in $(seq 1 12); do
  if curl -sf http://localhost:3005/api/health > /dev/null 2>&1; then
    echo "[deploy] healthcheck OK after ${i}×5s"
    exit 0
  fi
  sleep 5
done
echo "ERROR: healthcheck did not pass after 60s" >&2
docker compose -f docker-compose.prod.yml logs --tail 50 doktori-web >&2
exit 1
