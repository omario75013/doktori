# Doktori — Operational Runbook

All commands that target production are run from Omar's Mac via SSH unless noted otherwise.

**Production server:** `root@157.90.152.204`
**App container:** `doktori-web` (port 3005 → internal 3000)
**App directory:** `/opt/doktori/`
**Logs:** `/var/log/doktori/`

---

## Deploy

### Standard deploy (Jenkins)

Deploys are triggered automatically by Jenkins on push to `main`. The pipeline requires manual approval for QA → PROD promotion.

1. Push your branch and open a PR against `main`.
2. Jenkins runs the DEV stage automatically (`ci.dartank.com`).
3. In Jenkins, click **Approve** to promote to QA, then to PROD.
4. Monitor the deploy at `monitor.dartank.com` (Jenkins webhooks post results there).

### Manual deploy (emergency)

Only use this if Jenkins is unavailable.

```bash
ssh root@157.90.152.204

cd /opt/doktori

# Pull latest code
git pull origin main

# Inject secrets from 1Password
source /etc/profile.d/op-service-account.sh
op inject -i .env.tpl -o .env

# Rebuild and restart
docker compose -f docker-compose.prod.yml build doktori-web
docker compose -f docker-compose.prod.yml up -d doktori-web

# Verify health
curl -s http://localhost:3005/api/health | python3 -m json.tool
```

---

## Database Migrations

Migrations are managed with Drizzle ORM. They must be run **before** deploying a new app version that requires schema changes.

```bash
ssh root@157.90.152.204

cd /opt/doktori

# Source secrets
source /etc/profile.d/op-service-account.sh
op inject -i .env.tpl -o .env
export $(grep -v '^#' .env | xargs)

# Run pending migrations
npx drizzle-kit migrate
```

Alternatively, run migrations from your Mac against the production DB by temporarily exporting `DATABASE_URL`:

```bash
# Read DB URL from 1Password (do not hardcode)
export DATABASE_URL=$(op read "op://Dartank-Infra/Doktori Prod - Database/password")
cd packages/db
npx drizzle-kit migrate
```

---

## Checking Logs

### Application logs

```bash
# Last 100 lines
docker logs doktori-web --tail 100

# Follow in real time
docker logs doktori-web -f

# Last 100 lines with timestamps
docker logs doktori-web --tail 100 --timestamps
```

### Cron job logs

```bash
# Last 50 cron entries
tail -50 /var/log/doktori/cron.log

# Follow cron log
tail -f /var/log/doktori/cron.log

# Filter by a specific job
grep "reminders" /var/log/doktori/cron.log | tail -20
```

---

## Restart

```bash
# Graceful restart (waits for in-flight requests)
docker compose -f /opt/doktori/docker-compose.prod.yml restart doktori-web

# Force stop and start
docker compose -f /opt/doktori/docker-compose.prod.yml stop doktori-web
docker compose -f /opt/doktori/docker-compose.prod.yml start doktori-web

# Check status
docker ps --filter "name=doktori-web"
```

---

## Database Backup

Backups run automatically via cron daily at 2am (see `scripts/setup-crons.sh`). Backup files are stored at `/opt/doktori/backups/` and retained for 30 days.

### Verify automatic backups are running

```bash
ls -lh /opt/doktori/backups/
# Should show files like: doktori-20260418.sql.gz
```

### Manual backup

```bash
ssh root@157.90.152.204

mkdir -p /opt/doktori/backups

# Identify the postgres container name
docker ps --filter "name=postgres" --format "{{.Names}}"

# Dump (replace CONTAINER_NAME with the actual name, e.g. supabase-db)
docker exec CONTAINER_NAME pg_dump -U doktori doktori \
  | gzip > /opt/doktori/backups/doktori-manual-$(date +%Y%m%d-%H%M).sql.gz

echo "Backup saved:"
ls -lh /opt/doktori/backups/ | tail -3
```

### Restore from backup

```bash
# Decompress and restore (will overwrite current data — use with caution)
gunzip -c /opt/doktori/backups/doktori-YYYYMMDD.sql.gz \
  | docker exec -i CONTAINER_NAME psql -U doktori doktori
```

---

## Meilisearch Re-sync

The search index (doctors + clinics) is rebuilt daily at 3am via cron. To trigger a manual re-sync:

```bash
# Read CRON_SECRET from 1Password
CRON_SECRET=$(op read "op://Dartank-Infra/Doktori Prod - Cron/password")

# Trigger the sync endpoint
curl -s -X POST \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  http://localhost:3005/api/search/sync | python3 -m json.tool
```

Or from your Mac (via the public URL, if the endpoint is exposed):

```bash
CRON_SECRET=$(op read "op://Dartank-Infra/Doktori Prod - Cron/password")
curl -s -X POST \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  https://doktori.tn/api/search/sync
```

---

## Add a New Admin User

Admin accounts are seeded via the `packages/db/src/seed-admin.ts` script. To add a new admin:

```bash
# On your Mac
cd /Users/omario/doktori

export DATABASE_URL=$(op read "op://Dartank-Infra/Doktori Prod - Database/password")

# Edit seed-admin.ts to add the new admin email/password, then run:
npx tsx packages/db/src/seed-admin.ts
```

Alternatively, insert directly via psql:

```bash
ssh root@157.90.152.204

docker exec -it CONTAINER_NAME psql -U doktori doktori

-- Inside psql:
INSERT INTO admins (email, password_hash, name, role)
VALUES ('admin@doktori.tn', '<bcrypt_hash>', 'Admin Name', 'super_admin');
\q
```

Generate a bcrypt hash with:

```bash
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('your-password', 12).then(console.log)"
```

---

## Common Issues and Fixes

### App container not starting

```bash
# Check exit reason
docker logs doktori-web --tail 50

# Most likely causes:
# 1. Missing env var — check .env exists and is complete
# 2. Database unreachable — verify supabase-db is running
# 3. Port conflict — verify nothing else is on 3005
docker ps -a --filter "name=doktori-web"
```

### Cron jobs not firing

```bash
# Verify crontab is installed
crontab -l | grep DOKTORI

# If missing, reinstall from your Mac:
bash scripts/setup-crons.sh

# Check the cron daemon is running
systemctl status cron
```

### Emails not being sent

Emails fall back to console logging when `RESEND_API_KEY` is missing. To verify:

```bash
docker logs doktori-web 2>&1 | grep "EMAIL-DEV"
# If you see [EMAIL-DEV] lines, the key is missing.
```

Fix: add `Doktori Prod - Resend` to the 1Password vault, re-inject `.env`, and restart the container.
See `docs/ops/1password-missing-items.md` for full instructions.

### SMS not being sent

SMS falls back to console logging when Twilio credentials are missing.

```bash
docker logs doktori-web 2>&1 | grep "SMS-DEV"
# If you see [SMS-DEV] lines, Twilio credentials are missing.
```

Fix: add `Doktori Prod - Twilio` to the 1Password vault, re-inject `.env`, and restart.

### Meilisearch index out of date

Symptom: doctor search returns stale or missing results.

```bash
# Trigger a manual re-sync (see "Meilisearch Re-sync" section above)
# Then verify the index count:
MEILISEARCH_KEY=$(op read "op://Dartank-Infra/Doktori Prod - Meilisearch/password")
curl -s -H "Authorization: Bearer ${MEILISEARCH_KEY}" \
  http://localhost:7700/indexes/doctors/stats | python3 -m json.tool
```

### Database connection errors

```bash
# Check supabase-db container is running
docker ps --filter "name=supabase-db"

# Test connection from inside the doktori-web container
docker exec doktori-web sh -c 'nc -z $PGHOST $PGPORT && echo OK'
```

### Health check failing

```bash
curl -s http://localhost:3005/api/health | python3 -m json.tool
# Should return: {"status":"ok",...}

# If 502, check nginx config:
nginx -t && systemctl status nginx
```

---

## Install / Update Cron Jobs

After any change to `scripts/setup-crons.sh`:

```bash
# From your Mac
bash scripts/setup-crons.sh
```

The script is idempotent. It replaces the Doktori block in the root crontab without touching other entries. See `docs/ops/cron.md` for the full list of cron jobs.
