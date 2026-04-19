# Doktori — Cron Jobs

All cron endpoints live under `/api/cron/*` (except `/api/search/sync`) and require a bearer token matching `CRON_SECRET`.

The production server runs the app on port **3005** (`docker-compose.prod.yml` maps `3005:3000`).

---

## Setup

Run the setup script from your Mac to install or update all cron jobs on production:

```sh
bash scripts/setup-crons.sh
```

The script is idempotent — it replaces the Doktori block in root's crontab without touching other entries. Logs go to `/var/log/doktori/cron.log` with daily rotation (30-day retention).

`CRON_SECRET` is read at runtime from `/opt/doktori/.env` (injected by 1Password). Never inline it in the crontab.

---

## Cron Job Reference

### Appointment Reminders

| Route | Schedule | Purpose |
|-------|----------|---------|
| `/api/cron/reminders-j3` | Daily 7am | Email patients 3 days before their appointment (no SMS — too early). Sends a cancel/confirm link. |
| `/api/cron/reminders` | Daily 8am | J-1 reminders: SMS + email + WhatsApp + push notification the day before a confirmed appointment. Includes a signed cancel/confirm deep link. |
| `/api/cron/teleconsult-reminders` | Every 15 min | Sends SMS + email to patient and email to doctor for teleconsult appointments starting within the next 30 minutes. Includes the Jitsi join URL. |

### No-Show Detection

| Route | Schedule | Purpose |
|-------|----------|---------|
| `/api/cron/noshow-detection` | Every 15 min | Auto-marks confirmed appointments whose end time passed 30+ minutes ago as `no_show`. Increments the patient's no-show counter. After 3 strikes, suspends the patient account and sends notification via SMS + email. Processes up to 50 appointments per run. |
| `/api/cron/teleconsult-noshow` | Every 5 min | Detects teleconsult appointments where the doctor never joined (15 min past start, no `started_at` on the teleconsultation row). Marks the appointment `doctor_noshow`, initiates a Flouci refund, notifies the patient via SMS + email + push, and suggests up to 3 replacement doctors of the same specialty. Processes up to 20 appointments per run. |

### Patient Engagement

| Route | Schedule | Purpose |
|-------|----------|---------|
| `/api/cron/review-requests` | Daily 10am | Emails patients whose appointment was completed yesterday and who have not yet left a review. Also retries for 4-day-old completed appointments with still no review (limit 30). |
| `/api/cron/cancellation-followup` | Daily 9am | Sends a follow-up email + SMS to patients who cancelled an appointment the previous day, offering an easy rebook link. Processes up to 50 cancellations per run. |
| `/api/cron/followups` | Daily 9am | Sends a follow-up SMS to patients on the waitlist with `source='follow_up'` whose `preferredDate` has arrived. Marks each row as notified so it never fires twice. Processes up to 200 rows. |
| `/api/cron/waitlist-notify` | Every 10 min | SMS patients who are on the waitlist (`source='patient'`) when a cancelled appointment slot opens up on their preferred date. Marks notified immediately. Processes up to 50 candidates per run. |

### Reviews

| Route | Schedule | Purpose |
|-------|----------|---------|
| `/api/cron/reviews-auto-publish` | Every 6 hours | Promotes reviews in `pending` status that are older than 48 hours to `published`. Assumes unrejected pending reviews are legitimate after the 48h moderation window. |

### SOS

| Route | Schedule | Purpose |
|-------|----------|---------|
| `/api/cron/sos-cleanup` | Every 6 hours | Step 1: expires SOS sessions in `pending` status past their `expires_at`. Step 2: expires `accepted` sessions older than 24 hours (safety net). Then calls `finalizeSosSession` in parallel to close phone proxies and broadcast the state change. |

### Subscriptions & Billing

| Route | Schedule | Purpose |
|-------|----------|---------|
| `/api/cron/subscriptions` | Daily 2am | Finds all `active` or `trial` subscriptions whose `ends_at` has passed, marks them `expired`, hides the doctor from search (`is_visible = false`), and sends a subscription-expired email. |
| `/api/cron/trial-expiry` | Daily 8am | Sends trial expiry warning emails at 7 days and 1 day before the trial ends. Also expires subscriptions that are still marked `trial` but whose `ends_at` is in the past, hides the doctor, and sends an expiry email. |
| `/api/cron/monthly-reports` | 1st of month, 1am | Sends all active doctors an SMS with a link to their monthly statistics report for the previous month. |

### Doctor Engagement

| Route | Schedule | Purpose |
|-------|----------|---------|
| `/api/cron/doctor-reengagement` | Daily 10am | Emails doctors who have been active for 30 days without any appointment and who have not received a re-engagement message this month. Processes up to 20 doctors per run. |

### Search Index

| Route | Schedule | Purpose |
|-------|----------|---------|
| `/api/search/sync` | Daily 3am | Full Meilisearch re-index of all active+visible doctors and all clinics. Also updates searchable/filterable/sortable attributes, ranking rules, synonyms, stop words, and typo tolerance settings. Also triggered automatically (fire-and-forget) after every new doctor registration. |

---

## Production Schedule Summary

```cron
# ── BEGIN DOKTORI CRONS ─────────────────────────────────────────────────────
SHELL=/bin/bash
MAILTO=""

# J-3 email reminders (daily 7am)
0 7 * * * source /opt/doktori/.env && curl -s -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:3005/api/cron/reminders-j3 >> /var/log/doktori/cron.log 2>&1

# J-1 reminders: SMS + email + WhatsApp + push (daily 8am)
0 8 * * * source /opt/doktori/.env && curl -s -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:3005/api/cron/reminders >> /var/log/doktori/cron.log 2>&1

# Teleconsult reminders — 30min warning (every 15 min)
*/15 * * * * source /opt/doktori/.env && curl -s -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:3005/api/cron/teleconsult-reminders >> /var/log/doktori/cron.log 2>&1

# No-show auto-detection + 3-strike ban (every 15 min)
*/15 * * * * source /opt/doktori/.env && curl -s -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:3005/api/cron/noshow-detection >> /var/log/doktori/cron.log 2>&1

# Teleconsult doctor no-show: refund + replacement (every 5 min)
*/5 * * * * source /opt/doktori/.env && curl -s -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:3005/api/cron/teleconsult-noshow >> /var/log/doktori/cron.log 2>&1

# Review request emails (daily 10am)
0 10 * * * source /opt/doktori/.env && curl -s -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:3005/api/cron/review-requests >> /var/log/doktori/cron.log 2>&1

# Cancellation follow-up email + SMS (daily 9am)
0 9 * * * source /opt/doktori/.env && curl -s -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:3005/api/cron/cancellation-followup >> /var/log/doktori/cron.log 2>&1

# Doctor-scheduled follow-up SMS (daily 9am)
0 9 * * * source /opt/doktori/.env && curl -s -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:3005/api/cron/followups >> /var/log/doktori/cron.log 2>&1

# Waitlist notify when a slot opens (every 10 min)
*/10 * * * * source /opt/doktori/.env && curl -s -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:3005/api/cron/waitlist-notify >> /var/log/doktori/cron.log 2>&1

# Auto-publish pending reviews older than 48h (every 6 hours)
0 */6 * * * source /opt/doktori/.env && curl -s -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:3005/api/cron/reviews-auto-publish >> /var/log/doktori/cron.log 2>&1

# SOS cleanup — expire sessions, close proxies (every 6 hours)
0 */6 * * * source /opt/doktori/.env && curl -s -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:3005/api/cron/sos-cleanup >> /var/log/doktori/cron.log 2>&1

# Subscription expiry check (daily 2am)
0 2 * * * source /opt/doktori/.env && curl -s -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:3005/api/cron/subscriptions >> /var/log/doktori/cron.log 2>&1

# Trial expiry warnings + same-day expiry (daily 8am)
0 8 * * * source /opt/doktori/.env && curl -s -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:3005/api/cron/trial-expiry >> /var/log/doktori/cron.log 2>&1

# Monthly stats report SMS to doctors (1st of month, 1am)
0 1 1 * * source /opt/doktori/.env && curl -s -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:3005/api/cron/monthly-reports >> /var/log/doktori/cron.log 2>&1

# Doctor re-engagement emails (daily 10am)
0 10 * * * source /opt/doktori/.env && curl -s -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:3005/api/cron/doctor-reengagement >> /var/log/doktori/cron.log 2>&1

# Meilisearch full re-sync — doctors + clinics (daily 3am)
0 3 * * * source /opt/doktori/.env && curl -s -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:3005/api/search/sync >> /var/log/doktori/cron.log 2>&1

# ── END DOKTORI CRONS ───────────────────────────────────────────────────────
```

---

## Logs

```sh
# Stream live
ssh root@157.90.152.204 'tail -f /var/log/doktori/cron.log'

# Last 100 lines
ssh root@157.90.152.204 'tail -100 /var/log/doktori/cron.log'
```

---

## Adding a New Cron

1. Create the route under `apps/web/app/api/cron/<name>/route.ts` — export only `POST`, check `Authorization: Bearer $CRON_SECRET`.
2. Add an entry to the `CRON_BLOCK` heredoc in `scripts/setup-crons.sh`.
3. Add a row to the reference table and schedule summary in this file.
4. Run `bash scripts/setup-crons.sh` to deploy.
