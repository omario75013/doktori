#!/usr/bin/env bash
# setup-crons.sh — Install Doktori production cron jobs on 157.90.152.204
#
# Usage (run from your Mac):
#   bash scripts/setup-crons.sh
#
# Requirements:
#   - SSH access as root to 157.90.152.204
#   - CRON_SECRET available at /opt/doktori/.env on the server (via 1Password inject)
#
# The script is idempotent: it replaces the full Doktori cron block each run.
# Non-Doktori entries in the root crontab are left untouched.

set -euo pipefail

PROD_HOST="root@157.90.152.204"
APP_PORT="3005"
BASE_URL="http://localhost:${APP_PORT}"
ENV_FILE="/opt/doktori/.env"
LOG_FILE="/var/log/doktori/cron.log"
LOGROTATE_FILE="/etc/logrotate.d/doktori-cron"

echo "==> Connecting to ${PROD_HOST} to install Doktori cron jobs..."

ssh "${PROD_HOST}" bash -s << REMOTE_EOF
set -euo pipefail

# ── Ensure log directory exists ──────────────────────────────────────────────
mkdir -p /var/log/doktori
touch "${LOG_FILE}"

# ── Install logrotate config (idempotent) ────────────────────────────────────
cat > "${LOGROTATE_FILE}" << 'LOGROTATE'
/var/log/doktori/cron.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 0640 root root
}
LOGROTATE
echo "  [ok] logrotate config written to ${LOGROTATE_FILE}"

# ── Build the new Doktori cron block ─────────────────────────────────────────
# CRON_SECRET is loaded from the .env file at runtime via the wrapper function.
# Each job sources the env file then curls the endpoint and appends to the log.
read -r -d '' CRON_BLOCK << 'CRONBLOCK' || true
# ── BEGIN DOKTORI CRONS ─────────────────────────────────────────────────────
SHELL=/bin/bash
MAILTO=""

# Helper: source env file and POST to a cron endpoint, log stdout+stderr
# Format: <schedule> source /opt/doktori/.env && curl ... >> /var/log/doktori/cron.log 2>&1

# ── Appointment reminders ────────────────────────────────────────────────────

# J-3 email reminders — email patients 3 days before their appointment (daily 7am)
0 7 * * * source /opt/doktori/.env && curl -s -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:3005/api/cron/reminders-j3 >> /var/log/doktori/cron.log 2>&1

# J-1 reminders — SMS + email + WhatsApp + push 1 day before appointment (daily 8am)
0 8 * * * source /opt/doktori/.env && curl -s -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:3005/api/cron/reminders >> /var/log/doktori/cron.log 2>&1

# Teleconsult reminders — SMS + email 30min before video appointment (every 15 min)
*/15 * * * * source /opt/doktori/.env && curl -s -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:3005/api/cron/teleconsult-reminders >> /var/log/doktori/cron.log 2>&1

# ── No-show detection ────────────────────────────────────────────────────────

# No-show auto-detection — mark stale confirmed appointments + progressive 3-strike ban (every 15 min)
*/15 * * * * source /opt/doktori/.env && curl -s -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:3005/api/cron/noshow-detection >> /var/log/doktori/cron.log 2>&1

# Teleconsult no-show — detect doctor no-shows, trigger refund + suggest replacement (every 5 min)
*/5 * * * * source /opt/doktori/.env && curl -s -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:3005/api/cron/teleconsult-noshow >> /var/log/doktori/cron.log 2>&1

# ── Patient engagement ───────────────────────────────────────────────────────

# Review requests — email patients about yesterday's completed appointments (daily 10am)
0 10 * * * source /opt/doktori/.env && curl -s -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:3005/api/cron/review-requests >> /var/log/doktori/cron.log 2>&1

# Cancellation follow-up — email + SMS patients who cancelled yesterday, offer rebooking (daily 9am)
0 9 * * * source /opt/doktori/.env && curl -s -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:3005/api/cron/cancellation-followup >> /var/log/doktori/cron.log 2>&1

# Follow-up SMS — doctor-scheduled patient follow-ups when preferredDate arrives (daily 9am)
0 9 * * * source /opt/doktori/.env && curl -s -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:3005/api/cron/followups >> /var/log/doktori/cron.log 2>&1

# Waitlist notify — SMS patients when a cancelled slot opens up (every 10 min)
*/10 * * * * source /opt/doktori/.env && curl -s -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:3005/api/cron/waitlist-notify >> /var/log/doktori/cron.log 2>&1

# ── Reviews ──────────────────────────────────────────────────────────────────

# Auto-publish reviews — promote pending reviews older than 48h to published (every 6 hours)
0 */6 * * * source /opt/doktori/.env && curl -s -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:3005/api/cron/reviews-auto-publish >> /var/log/doktori/cron.log 2>&1

# ── SOS ──────────────────────────────────────────────────────────────────────

# SOS cleanup — expire pending/stale sessions and close phone proxies (every 6 hours)
0 */6 * * * source /opt/doktori/.env && curl -s -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:3005/api/cron/sos-cleanup >> /var/log/doktori/cron.log 2>&1

# ── Subscriptions & billing ──────────────────────────────────────────────────

# Subscriptions — mark expired active/trial subscriptions and hide doctors (daily 2am)
0 2 * * * source /opt/doktori/.env && curl -s -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:3005/api/cron/subscriptions >> /var/log/doktori/cron.log 2>&1

# Trial expiry — warn at 7d and 1d, expire same-day trials and hide doctor (daily 8am)
0 8 * * * source /opt/doktori/.env && curl -s -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:3005/api/cron/trial-expiry >> /var/log/doktori/cron.log 2>&1

# Monthly reports — SMS doctors with link to their monthly stats report (1st of month, 1am)
0 1 1 * * source /opt/doktori/.env && curl -s -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:3005/api/cron/monthly-reports >> /var/log/doktori/cron.log 2>&1

# ── Doctor engagement ────────────────────────────────────────────────────────

# Doctor re-engagement — email inactive doctors (no appt in 30d) once per month (daily 10am)
0 10 * * * source /opt/doktori/.env && curl -s -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:3005/api/cron/doctor-reengagement >> /var/log/doktori/cron.log 2>&1

# ── Search index ─────────────────────────────────────────────────────────────

# Meilisearch full re-sync — rebuild doctors + clinics index (daily 3am)
0 3 * * * source /opt/doktori/.env && curl -s -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:3005/api/search/sync >> /var/log/doktori/cron.log 2>&1

# ── Database backups ─────────────────────────────────────────────────────────

# Daily at 2am: dump doktori database to /opt/doktori/backups/ (gzipped)
0 2 * * * mkdir -p /opt/doktori/backups && docker exec supabase-db pg_dump -U doktori doktori | gzip > /opt/doktori/backups/doktori-$(date +\%Y\%m\%d).sql.gz 2>> /var/log/doktori/cron.log

# Daily at 3am: remove backups older than 30 days
0 3 * * * find /opt/doktori/backups -name "*.sql.gz" -mtime +30 -delete 2>> /var/log/doktori/cron.log

# ── END DOKTORI CRONS ───────────────────────────────────────────────────────
CRONBLOCK

# ── Merge with existing crontab (remove old Doktori block, append new) ───────
EXISTING_CRON=\$(crontab -l 2>/dev/null || true)

# Strip the previous Doktori block if present
CLEANED=\$(echo "\${EXISTING_CRON}" | awk '
  /^# ── BEGIN DOKTORI CRONS/ { skip=1 }
  /^# ── END DOKTORI CRONS/   { skip=0; next }
  !skip { print }
')

# Write back: cleaned non-Doktori entries + new block
printf "%s\n\n%s\n" "\${CLEANED}" "\${CRON_BLOCK}" | crontab -

echo "  [ok] Doktori cron jobs installed (crontab updated)"
crontab -l | grep -E "(DOKTORI|doktori|cron\.log)" | head -5 && echo "  ... (use 'crontab -l' to see full list)"

REMOTE_EOF

echo ""
echo "==> Done. Cron jobs are live on ${PROD_HOST}."
echo "    Logs: ssh ${PROD_HOST} 'tail -f /var/log/doktori/cron.log'"
