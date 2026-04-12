# SOS Screen & Workflow Enrichment — Design Spec

**Date:** 2026-04-12
**Status:** Approved
**Approach:** Layered shipping (4 slices, each independently deployable)

## Context

The SOS feature has a working happy path: patient requests → system matches nearby doctors via PostGIS → doctor accepts → patient gets SMS with contact info. But the workflow stops there. Sessions never complete, fees never capture, phone proxies never close, expiry has no cron, and admin has zero operational control.

This spec enriches SOS across all four surfaces (backend, patient, doctor, admin) to make it production-grade.

### Current State

| Feature | Status |
|---------|--------|
| Patient request + geolocation | Working |
| Doctor feed with ST_DWithin matching | Working |
| Doctor accept + SMS + phone proxy | Working |
| Socket.IO + HTTP fallback real-time | Working |
| Session completion | Missing — no endpoint |
| Fee/commission capture | Missing — columns exist, never set |
| Expiry cleanup | Missing — no cron |
| Phone proxy cleanup | Missing — closePhoneProxy() never called |
| Race condition broadcast | Missing — no "request-taken" event |
| Patient cancel/retry | Missing |
| Doctor decline tracking | Missing |
| Doctor location freshness | Stale — set once on toggle |
| Admin SOS console | Missing — only KPI count |

### Key Files

| Path | Lines | Purpose |
|------|-------|---------|
| `packages/db/src/schema.ts` | sos_sessions + phone_proxies + doctor SOS fields | Schema |
| `apps/web/app/api/sos/request/route.ts` | 50 | Patient creates session |
| `apps/web/app/api/sos/accept/route.ts` | 69 | Doctor accepts |
| `apps/web/app/api/sos/session/[id]/route.ts` | 29 | Patient polls status |
| `apps/web/app/api/sos/doctor/feed/route.ts` | 29 | Doctor gets nearby requests |
| `apps/web/app/api/sos/doctor/settings/route.ts` | 54 | Doctor SOS config |
| `apps/web/app/sos/page.tsx` | 260 | Patient SOS UI |
| `apps/web/app/sos-medecin/page.tsx` | 239 | Doctor SOS UI |
| `apps/web/lib/sos-broadcast.ts` | 25 | Socket.IO broadcast helper |
| `apps/web/lib/phone-proxy.ts` | 167 | Twilio phone masking |
| `apps/web/sockets/sos-server.ts` | 62 | Socket.IO SOS server |

---

## Slice 1: Backend Plumbing

**Goal:** Make the data model honest. No UI changes. Every subsequent slice depends on this.

### 1.1 Migration: `0027_sos_enrichment.sql`

```sql
-- Session lifecycle
ALTER TABLE sos_sessions ADD COLUMN cancelled_at timestamptz;
ALTER TABLE sos_sessions ADD COLUMN cancel_reason text;
ALTER TABLE sos_sessions ADD COLUMN cancelled_by varchar(10); -- 'patient' | 'doctor' | 'admin'

-- Distance captured at accept time (for KPI median)
ALTER TABLE sos_sessions ADD COLUMN distance_m integer;

-- Admin fields
ALTER TABLE sos_sessions ADD COLUMN admin_notes text;
ALTER TABLE sos_sessions ADD COLUMN resolution varchar(20);
-- values: completed | expired | cancelled_by_patient | cancelled_by_doctor | cancelled_by_admin | refunded

-- Reviews link to SOS
ALTER TABLE reviews ADD COLUMN sos_session_id uuid REFERENCES sos_sessions(id) ON DELETE SET NULL;
CREATE INDEX reviews_sos_session_idx ON reviews(sos_session_id) WHERE sos_session_id IS NOT NULL;

-- Prevent duplicate active requests per patient
CREATE UNIQUE INDEX sos_sessions_active_patient_uidx
  ON sos_sessions(patient_id)
  WHERE status IN ('pending', 'accepted');

-- Doctor availability time windows
ALTER TABLE doctors ADD COLUMN sos_available_from time;
ALTER TABLE doctors ADD COLUMN sos_available_to time;

-- SOS decline tracking
CREATE TABLE sos_declines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES sos_sessions(id) ON DELETE CASCADE,
  doctor_id uuid NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  reason varchar(30),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX sos_declines_unique_idx ON sos_declines(session_id, doctor_id);
CREATE INDEX sos_declines_session_idx ON sos_declines(session_id);
```

### 1.2 Schema.ts additions

Add to `packages/db/src/schema.ts`:
- `cancelledAt`, `cancelReason`, `cancelledBy`, `distanceM`, `adminNotes`, `resolution` columns on `sosSessions`
- `sosSessionId` nullable FK on `reviews`
- `sosAvailableFrom`, `sosAvailableTo` time columns on `doctors`
- New `sosDeclines` table definition

### 1.3 New API routes

**`POST /api/sos/complete`** — Doctor marks visit done.
- Auth: doctor session required
- Body: `{ sessionId, fee? }`
- Guards: session must be `accepted`, `doctorId` must match caller
- Sets: `status='completed'`, `completedAt=now()`, `resolution='completed'`, `fee` (from body or `doctor.sos_fee`), `commission` (10% of fee)
- Calls: `closePhoneProxy(sessionId)`
- Broadcasts: `session-update` with `{ status: 'completed', doctorName }` to patient room
- Sends SMS to patient with review link: `{baseUrl}/avis-sos/{sessionId}`

**`POST /api/sos/cancel`** — Either party cancels.
- Auth: doctor session OR patient phone+sessionId match
- Body: `{ sessionId, reason?, cancelledBy: 'patient' | 'doctor' }`
- Guards: session must be `pending` or `accepted`
- Sets: `status='cancelled'`, `cancelledAt=now()`, `cancelReason`, `cancelledBy`, `resolution='cancelled_by_{actor}'`
- Calls: `closePhoneProxy(sessionId)` if status was `accepted`
- Broadcasts: `session-update` with `{ status: 'cancelled' }`

**`POST /api/sos/decline`** — Doctor explicitly declines a request.
- Auth: doctor session required
- Body: `{ sessionId, reason? }`
- Inserts into `sos_declines` (idempotent via unique index)
- Does NOT change session status
- Returns `{ success: true }`

**`POST /api/sos/rate`** — Patient rates after completion.
- Auth: unauthenticated (accessed via SMS link with sessionId)
- Body: `{ sessionId, rating: 1-5, comment? }`
- Guards: session must be `completed`, no existing review for this session
- Creates `reviews` row with `sosSessionId` set, `status='published'` (SOS reviews auto-publish), `verified=true`
- Returns `{ success: true }`

### 1.4 Race condition fix

In `POST /api/sos/accept`, after successful atomic UPDATE:
- Broadcast `request-taken` event to `doctors-all` room with `{ sessionId }` so other doctors' feeds remove it immediately
- Capture `ST_Distance` between patient and doctor locations, store as `distance_m` on the session

### 1.5 Expiry cleanup cron

**`POST /api/cron/sos-cleanup`** — Runs every 5 minutes.
- Auth: Bearer `CRON_SECRET`
- Step 1: `UPDATE sos_sessions SET status='expired', resolution='expired' WHERE status='pending' AND expires_at < now()` — broadcast `session-update` with `status='expired'` per session
- Step 2: `UPDATE sos_sessions SET status='expired', resolution='expired' WHERE status='accepted' AND accepted_at < now() - interval '2 hours'` — stale accepted sessions
- Step 3: Close active phone proxies for all sessions marked expired in this run
- Returns: `{ expired, staleCompleted, proxiesClosed }`

### 1.6 SMS retry on accept

In `POST /api/sos/accept`, after sending SMS to patient:
- If `sendSMS` returns `success: false`, wait 5s and retry once
- If retry also fails, log to `sms_logs` with `status='failed'` — patient will still see doctor info via Socket.IO/polling (already in the response payload)

---

## Slice 2: Patient UX

**Goal:** Transform the patient SOS screen from a 5-step demo into a real emergency flow.

### 2.1 Countdown timer (waiting step)

Replace the static "Recherche d'un médecin..." with a live countdown ring:
- `setInterval(1000)` computing `Math.max(0, expiresAt - Date.now())`
- Display: circular SVG progress ring (teal → red gradient as time runs out) with `MM:SS` centered
- When countdown hits 0, auto-transition to expired state (don't wait for next poll)
- Below the ring: "Nous cherchons un médecin dans votre zone..."

### 2.2 Retry after expiry

Replace dead-end expired screen with:
- Message: "Aucun médecin disponible dans votre zone"
- **"Réessayer"** button — pre-fills form with same data, re-requests geolocation (location may have changed), submits new SOS request
- Works because the unique index on active sessions won't conflict (old session is `expired`)

### 2.3 Cancel button

On both "waiting" and "accepted" steps:
- Secondary button: "Annuler ma demande"
- If status is `accepted`, show confirmation dialog: "Le Dr. {name} a accepté votre demande. Annuler quand même ?"
- Calls `POST /api/sos/cancel` with `cancelledBy: 'patient'`

### 2.4 Live map after acceptance

When status transitions to `accepted`:
- Show Leaflet map (reuse existing Leaflet setup from `/sos`) with:
  - Blue pin: patient location
  - Teal pin: doctor base location (from session response `doctorLatitude`, `doctorLongitude`)
  - Distance label between pins
- Doctor's address text below the map
- Static map — no live tracking (that requires Slice 3 continuous location)

### 2.5 In-app call button

Below the map:
- Prominent teal button: "Appeler le Dr. {name}"
- `<a href="tel:{maskedOrRealPhone}">` — native phone dialog on mobile, app picker on desktop
- Uses proxy number if available, real phone otherwise

### 2.6 Post-visit review page

New page: `apps/web/app/avis-sos/[sessionId]/page.tsx`
- Reached via SMS link sent on completion
- Star rating (1-5) + optional comment textarea
- Calls `POST /api/sos/rate`
- Same styling as existing `/avis/[appointmentId]` page
- Success state: "Merci pour votre avis !"

---

## Slice 3: Doctor UX

**Goal:** Give doctors control, history, and earnings visibility.

### 3.1 Decline button

Each request card in the feed gets a "Décliner" button alongside "Accepter":
- Dropdown with preset reasons: "Trop loin", "Pas disponible", "Hors compétence", "Autre"
- Calls `POST /api/sos/decline`
- Card disappears from feed (client-side filter + server-side exclusion on next fetch)

### 3.2 Continuous location updates

When SOS mode is active on `/sos-medecin`:
- Call `navigator.geolocation.watchPosition()` with `{ enableHighAccuracy: true }`
- Throttle to max one update per 30 seconds
- `PUT /api/sos/doctor/settings` with new lat/lng (reuses existing endpoint which updates GEOGRAPHY column)
- `beforeunload` event stops the watch
- Solves stale location problem for active doctors

### 3.3 Complete / cancel active session

After accepting a request, the card transforms into an "active session" view:
- Patient name, symptom, distance, time since accepted
- **"Consultation terminée"** button → opens a small form: fee pre-filled from `sos_fee`, editable. Submits `POST /api/sos/complete`
- **"Annuler"** button → `POST /api/sos/cancel` with `cancelledBy: 'doctor'`

### 3.4 SOS history table

New section below the live feed on `/sos-medecin`: **"Historique"**
- New endpoint: `GET /api/sos/doctor/history` — sessions where `doctorId = currentDoctor`, ordered by `requestedAt DESC`, limit 50
- Columns: date, patient name, symptom, status badge, fee (DT), rating (stars if reviewed)

### 3.5 Earnings summary strip

Above the history table, 4 KPI cards:
- **Ce mois:** sum of `fee` from completed sessions this month
- **Commission:** sum of `commission` this month
- **Net:** fee - commission
- **Sessions:** completed count this month

Query: `SELECT SUM(fee), SUM(commission), COUNT(*) FROM sos_sessions WHERE doctor_id = $id AND status = 'completed' AND completed_at >= $startOfMonth`

### 3.6 Availability time windows

Extend the SOS settings form:
- Two time pickers: "Disponible de" / "à" (e.g., 08:00 – 22:00)
- Null = 24/7 (checkbox: "Disponible 24h/24")
- `PUT /api/sos/doctor/settings` accepts `{ availableFrom?: string, availableTo?: string }`
- Doctor feed query adds: `AND (d.sos_available_from IS NULL OR LOCALTIME BETWEEN d.sos_available_from AND d.sos_available_to)`

---

## Slice 4: Admin Ops Console

**Goal:** Full operational control for the support team. All routes: `requireAdmin(["super_admin", "support"])` + `logAudit()`.

### 4.1 Page structure

```
/admin/sos              — live dashboard (map + active sessions)
/admin/sos/sessions     — full session history table
/admin/sos/[id]         — session detail + admin actions
/admin/sos/kpis         — metrics & acceptance rates
/admin/sos/coverage     — coverage gap report
```

### 4.2 Live dashboard (`/admin/sos`)

Split layout:
- **Left 60%:** Leaflet map — red pins for pending, orange for accepted, green dots for available doctors. Click pin → sidebar summary. SWR refresh every 10s.
- **Right 40%:** Active sessions list (pending + accepted) sorted by recency. Each card: patient name, symptom, elapsed time, assigned doctor. Inline quick-action buttons.

### 4.3 Session history (`/admin/sos/sessions`)

Admin table (same pattern as `doctors-table.tsx`):
- Columns: ID, patient, doctor, symptom, status badge, fee, commission, requested at, duration, rating
- Filters: status, date range, symptom category, doctor, has-review
- CSV export button

### 4.4 Session detail (`/admin/sos/[id]`)

Vertical timeline:
- requested → (declined by Dr. X, reason) → (declined by Dr. Y) → accepted by Dr. Z → completed/cancelled/expired
- Each node: timestamp + actor + details
- Map: patient + doctor pins
- Phone proxy status card (active/closed, Twilio SIDs)
- SMS log entries for this session
- Review card if exists
- Admin notes textarea (saves to `sos_sessions.admin_notes`)

**Admin actions:**
- **Force-accept** — assign a doctor to a pending session. Dropdown of SOS-available doctors sorted by distance. Runs same logic as `/api/sos/accept` with `actorType: 'admin'`. `logAudit action: 'sos.force_accept'`.
- **Mark completed** — for sessions stuck in `accepted`. `logAudit action: 'sos.admin_complete'`.
- **Cancel** — cancel any non-completed session with reason. `logAudit action: 'sos.admin_cancel'`.
- **Extend expiry** — push `expiresAt` forward by 15 minutes. `logAudit action: 'sos.extend_expiry'`.
- **Refund** — stub returning 501 with TODO (Flouci not wired). Sets `resolution='refunded'`. `logAudit action: 'sos.refund'`.

### 4.5 KPIs (`/admin/sos/kpis`)

New endpoint: `GET /api/admin/sos/kpis`

Metrics (last 30 days default, date range filter):
- **Acceptance rate:** completed / (completed + expired)
- **Median response time:** median of `acceptedAt - requestedAt`
- **Median doctor distance:** median of `distance_m`
- **Completion rate:** completed / accepted
- **Top decline reasons:** aggregated from `sos_declines`
- **By symptom:** volume + acceptance rate per category
- **By hour of day:** request volume heatmap (Recharts)

### 4.6 Coverage gaps (`/admin/sos/coverage`)

`GET /api/admin/sos/coverage` endpoint:
- Cities with SOS requests but 0 available doctors → red severity
- Cities with expired > 50% of total requests → amber severity
- Doctor count per city with `sos_available = true`

Simple table with color-coded rows. No PostGIS heatmap (defer to Wave 12 analytics materialized views).

---

## Migration summary

Single migration `0027_sos_enrichment.sql` covering all 4 slices:
- 6 new columns on `sos_sessions` (cancelled_at, cancel_reason, cancelled_by, distance_m, admin_notes, resolution)
- 1 new column on `reviews` (sos_session_id)
- 2 new columns on `doctors` (sos_available_from, sos_available_to)
- 1 new table `sos_declines`
- 2 new indexes (reviews_sos_session_idx, sos_sessions_active_patient_uidx)

## New files summary

### Slice 1 (backend)
- `packages/db/migrations/0027_sos_enrichment.sql`
- `packages/db/src/schema.ts` — additions
- `apps/web/app/api/sos/complete/route.ts`
- `apps/web/app/api/sos/cancel/route.ts`
- `apps/web/app/api/sos/decline/route.ts`
- `apps/web/app/api/sos/rate/route.ts`
- `apps/web/app/api/cron/sos-cleanup/route.ts`

### Slice 2 (patient UX)
- `apps/web/app/sos/page.tsx` — rewrite
- `apps/web/app/avis-sos/[sessionId]/page.tsx`

### Slice 3 (doctor UX)
- `apps/web/app/sos-medecin/page.tsx` — rewrite
- `apps/web/app/api/sos/doctor/history/route.ts`

### Slice 4 (admin ops)
- `apps/web/app/(admin)/admin/sos/page.tsx`
- `apps/web/app/(admin)/admin/sos/sessions/page.tsx`
- `apps/web/app/(admin)/admin/sos/[id]/page.tsx`
- `apps/web/app/(admin)/admin/sos/[id]/detail-view.tsx`
- `apps/web/app/(admin)/admin/sos/kpis/page.tsx`
- `apps/web/app/(admin)/admin/sos/coverage/page.tsx`
- `apps/web/app/api/admin/sos/sessions/route.ts`
- `apps/web/app/api/admin/sos/[id]/route.ts`
- `apps/web/app/api/admin/sos/[id]/force-accept/route.ts`
- `apps/web/app/api/admin/sos/[id]/complete/route.ts`
- `apps/web/app/api/admin/sos/[id]/cancel/route.ts`
- `apps/web/app/api/admin/sos/[id]/extend/route.ts`
- `apps/web/app/api/admin/sos/kpis/route.ts`
- `apps/web/app/api/admin/sos/coverage/route.ts`

### Sidebar link
- `apps/web/app/(admin)/layout.tsx` — add SOS section under "Operations" group

## Cron entry (prod)

```cron
*/5 * * * * curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:3005/api/cron/sos-cleanup
```

Add to `docs/ops/cron.md`.
