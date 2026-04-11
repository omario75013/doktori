# Doktori — Cron jobs

All cron endpoints live under `/api/cron/*` and require a bearer token matching `CRON_SECRET`.

## Schedule (prod)

Host crontab on `157.90.152.204` (user `root`). Adjust `CRON_SECRET` via 1Password — never inline.

```cron
# Daily follow-up SMS (doctor-scheduled reminders)
0 9 * * * curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:3005/api/cron/followups

# Subscription renewals / dunning
0 2 * * * curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:3005/api/cron/subscriptions

# Monthly CNAM bordereaux
0 1 1 * * curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:3005/api/cron/monthly-reports

# G12 — auto-publish pending reviews older than 48h
0 */6 * * * curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:3005/api/cron/reviews-auto-publish
```

Load `CRON_SECRET` into the shell environment via:

```sh
set -a; . /opt/doktori/.env; set +a
```

Or wrap each line in `op run --env-file=/opt/doktori/.env.tpl --` if 1Password service account is configured.
