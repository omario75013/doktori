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

# SOS cleanup — expire pending/stale sessions, close phone proxies
*/5 * * * * curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:3005/api/cron/sos-cleanup

# J-3 email reminders — 3 days ahead (email only, not SMS)
0 9 * * * curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:3005/api/cron/reminders-j3

# Review requests — email patients to review yesterday's completed appointments
0 10 * * * curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:3005/api/cron/review-requests

# No-show auto-detection — mark stale confirmed appointments + progressive ban (3 strikes)
*/15 * * * * curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:3005/api/cron/noshow-detection

# Teleconsult reminders — SMS + email 30min before video appointment
*/15 * * * * curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:3005/api/cron/teleconsult-reminders

# Teleconsult no-show detection — refund + replacement suggestion
*/5 * * * * curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:3005/api/cron/teleconsult-noshow

# Waitlist auto-notify (every 10 min) — SMS patients when a slot frees up
*/10 * * * * curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:3005/api/cron/waitlist-notify

# Trial expiry warnings (daily 8am) — warn at 7d, 1d, expire same-day
0 8 * * * curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:3005/api/cron/trial-expiry
```

Load `CRON_SECRET` into the shell environment via:

```sh
set -a; . /opt/doktori/.env; set +a
```

Or wrap each line in `op run --env-file=/opt/doktori/.env.tpl --` if 1Password service account is configured.
