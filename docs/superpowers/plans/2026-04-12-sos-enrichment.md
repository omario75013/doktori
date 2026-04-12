# SOS Enrichment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enrich the SOS emergency doctor feature from a working happy-path demo into a production-grade system with session lifecycle, patient/doctor UX, and admin ops.

**Architecture:** 4 slices shipped in order — backend plumbing first (migration + API routes), then patient UX (rewrite SOS page), doctor UX (rewrite sos-medecin page + history), admin console (new pages under /admin/sos). Each slice is independently deployable.

**Tech Stack:** Next.js 16 App Router, Drizzle ORM, PostGIS (ST_DWithin, ST_Distance), Socket.IO, Twilio (phone proxy + SMS), Leaflet (maps), Recharts (charts), jose (HMAC signing).

**Spec:** `docs/superpowers/specs/2026-04-12-sos-enrichment-design.md`

---

## File Map

### Slice 1 — Backend plumbing (new files only, no UI)
| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `packages/db/migrations/0027_sos_enrichment.sql` | Schema changes |
| Modify | `packages/db/src/schema.ts` | Drizzle definitions for new + missing columns |
| Create | `apps/web/lib/sos-hmac.ts` | HMAC sign/verify for patient tokens |
| Create | `apps/web/app/api/sos/complete/route.ts` | Doctor marks visit done |
| Create | `apps/web/app/api/sos/cancel/route.ts` | Either party cancels |
| Create | `apps/web/app/api/sos/decline/route.ts` | Doctor declines a request |
| Create | `apps/web/app/api/sos/rate/route.ts` | Patient rates after visit |
| Create | `apps/web/app/api/cron/sos-cleanup/route.ts` | Expiry + proxy cleanup cron |
| Modify | `apps/web/app/api/sos/accept/route.ts` | Add request-taken broadcast + distance capture |
| Modify | `apps/web/app/api/sos/request/route.ts` | Return HMAC token for patient cancel auth |
| Modify | `docs/ops/cron.md` | Add sos-cleanup entry |

### Slice 2 — Patient UX (UI changes)
| Action | Path | Responsibility |
|--------|------|----------------|
| Rewrite | `apps/web/app/sos/page.tsx` | Countdown, cancel, retry, map, call button |
| Create | `apps/web/app/avis-sos/[sessionId]/page.tsx` | Post-visit SOS review form |

### Slice 3 — Doctor UX
| Action | Path | Responsibility |
|--------|------|----------------|
| Rewrite | `apps/web/app/sos-medecin/page.tsx` | Decline, complete, history, earnings, location watch |
| Create | `apps/web/app/api/sos/doctor/history/route.ts` | GET doctor's SOS history + earnings |
| Modify | `apps/web/app/api/sos/doctor/settings/route.ts` | Accept availableFrom/availableTo |
| Modify | `apps/web/app/api/sos/doctor/feed/route.ts` | Exclude declined, time-window filter |

### Slice 4 — Admin ops console
| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `apps/web/app/(admin)/admin/sos/page.tsx` | Live map + active sessions |
| Create | `apps/web/app/(admin)/admin/sos/sessions/page.tsx` | Full history table |
| Create | `apps/web/app/(admin)/admin/sos/[id]/page.tsx` | Session detail server component |
| Create | `apps/web/app/(admin)/admin/sos/[id]/detail-view.tsx` | Client component: timeline + actions |
| Create | `apps/web/app/(admin)/admin/sos/kpis/page.tsx` | KPI charts |
| Create | `apps/web/app/(admin)/admin/sos/coverage/page.tsx` | Coverage gap table |
| Create | `apps/web/app/api/admin/sos/sessions/route.ts` | GET paginated session list |
| Create | `apps/web/app/api/admin/sos/[id]/route.ts` | GET detail + PATCH notes |
| Create | `apps/web/app/api/admin/sos/[id]/force-accept/route.ts` | POST force-assign doctor |
| Create | `apps/web/app/api/admin/sos/[id]/complete/route.ts` | POST admin mark complete |
| Create | `apps/web/app/api/admin/sos/[id]/cancel/route.ts` | POST admin cancel |
| Create | `apps/web/app/api/admin/sos/[id]/extend/route.ts` | POST extend expiry |
| Create | `apps/web/app/api/admin/sos/kpis/route.ts` | GET SOS metrics |
| Create | `apps/web/app/api/admin/sos/coverage/route.ts` | GET coverage gaps |
| Modify | `apps/web/app/(admin)/layout.tsx` | Add SOS sidebar link |

---

## Task 1: Migration + Schema (Slice 1a)

**Files:**
- Create: `packages/db/migrations/0027_sos_enrichment.sql`
- Modify: `packages/db/src/schema.ts`

- [ ] **Step 1: Write migration file**

Create `packages/db/migrations/0027_sos_enrichment.sql`:

```sql
-- 0027_sos_enrichment.sql
-- SOS session lifecycle, decline tracking, availability windows, review link

-- Session lifecycle columns
ALTER TABLE sos_sessions ADD COLUMN cancelled_at timestamptz;
ALTER TABLE sos_sessions ADD COLUMN cancel_reason text;
ALTER TABLE sos_sessions ADD COLUMN cancelled_by varchar(10);
ALTER TABLE sos_sessions ADD COLUMN distance_m integer;
ALTER TABLE sos_sessions ADD COLUMN admin_notes text;
ALTER TABLE sos_sessions ADD COLUMN resolution varchar(20);

-- Doctor feed performance
CREATE INDEX IF NOT EXISTS sos_sessions_doctor_idx ON sos_sessions(doctor_id);

-- Reviews: relax appointment_id NOT NULL so SOS reviews can insert
ALTER TABLE reviews ALTER COLUMN appointment_id DROP NOT NULL;
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

-- Backfill resolution for existing sessions
UPDATE sos_sessions SET resolution = status WHERE status IN ('completed', 'expired');
```

- [ ] **Step 2: Update schema.ts — add missing SOS columns to doctors**

In `packages/db/src/schema.ts`, inside the `doctors` table definition (after `isActive` line ~55), add:

```typescript
    sosAvailable: boolean("sos_available").notNull().default(false),
    sosRadiusKm: integer("sos_radius_km").notNull().default(10),
    sosFee: integer("sos_fee"),
    sosAvailableFrom: time("sos_available_from"),
    sosAvailableTo: time("sos_available_to"),
```

- [ ] **Step 3: Update schema.ts — add new sos_sessions columns**

Find `sosSessions` table definition. Add after `completedAt`:

```typescript
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancelReason: text("cancel_reason"),
    cancelledBy: varchar("cancelled_by", { length: 10 }),
    distanceM: integer("distance_m"),
    adminNotes: text("admin_notes"),
    resolution: varchar("resolution", { length: 20 }),
```

- [ ] **Step 4: Update schema.ts — reviews.appointmentId nullable + sosSessionId**

Change `reviews` table `appointmentId` from `.notNull()` to optional:

```typescript
    appointmentId: uuid("appointment_id").references(() => appointments.id, { onDelete: "cascade" }).unique(),
```

Add new column:

```typescript
    sosSessionId: uuid("sos_session_id").references(() => sosSessions.id, { onDelete: "set null" }),
```

- [ ] **Step 5: Add sosDeclines table to schema.ts**

After the `sosSessions` table definition, add:

```typescript
// ── SOS Declines ─────────────────────────────────────────
export const sosDeclines = pgTable("sos_declines", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id").notNull().references(() => sosSessions.id, { onDelete: "cascade" }),
  doctorId: uuid("doctor_id").notNull().references(() => doctors.id, { onDelete: "cascade" }),
  reason: varchar("reason", { length: 30 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("sos_declines_unique_idx").on(table.sessionId, table.doctorId),
  index("sos_declines_session_idx").on(table.sessionId),
]);
```

- [ ] **Step 6: Verify build**

Run: `cd apps/web && pnpm exec next build 2>&1 | tail -5`
Expected: Build succeeds (schema changes are additive, no TS errors)

- [ ] **Step 7: Commit**

```bash
git add packages/db/migrations/0027_sos_enrichment.sql packages/db/src/schema.ts
git commit -m "feat(db): SOS enrichment migration — lifecycle, declines, availability windows"
```

---

## Task 2: HMAC helper + Complete/Cancel/Decline/Rate routes (Slice 1b)

**Files:**
- Create: `apps/web/lib/sos-hmac.ts`
- Create: `apps/web/app/api/sos/complete/route.ts`
- Create: `apps/web/app/api/sos/cancel/route.ts`
- Create: `apps/web/app/api/sos/decline/route.ts`
- Create: `apps/web/app/api/sos/rate/route.ts`

- [ ] **Step 1: Create HMAC helper**

Create `apps/web/lib/sos-hmac.ts`:

```typescript
import { createHmac } from "node:crypto";

const SECRET = process.env.NEXTAUTH_SECRET || "dev-secret";

export function signSosToken(sessionId: string): string {
  return createHmac("sha256", SECRET).update(sessionId).digest("hex");
}

export function verifySosToken(sessionId: string, sig: string): boolean {
  const expected = signSosToken(sessionId);
  return expected === sig;
}
```

- [ ] **Step 2: Create complete route**

Create `apps/web/app/api/sos/complete/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, reviews } from "@doktori/db";
import { sql, eq, and } from "drizzle-orm";
import { closePhoneProxy } from "@/lib/phone-proxy";
import { broadcastSos } from "@/lib/sos-broadcast";
import { sendSMS } from "@/lib/sms";
import { signSosToken } from "@/lib/sos-hmac";

const COMMISSION_RATE = parseFloat(process.env.SOS_COMMISSION_RATE || "0.10");

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { sessionId, fee: bodyFee } = await req.json();
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId requis" }, { status: 400 });
  }

  // Fetch session + doctor fee fallback
  const rows = await db.execute(sql`
    SELECT s.id, s.status, s.doctor_id, s.patient_id,
           d.sos_fee AS doctor_fee, d.name AS doctor_name,
           p.phone AS patient_phone
    FROM sos_sessions s
    JOIN doctors d ON d.id = s.doctor_id
    JOIN patients p ON p.id = s.patient_id
    WHERE s.id = ${sessionId}
    LIMIT 1
  `);
  const row = (rows as unknown as any[])[0];

  if (!row) {
    return NextResponse.json({ error: "Session introuvable" }, { status: 404 });
  }
  if (row.status !== "accepted") {
    return NextResponse.json({ error: "Session non acceptée" }, { status: 400 });
  }
  if (row.doctor_id !== session.user.id) {
    return NextResponse.json({ error: "Pas votre session" }, { status: 403 });
  }

  const fee = typeof bodyFee === "number" ? bodyFee : (row.doctor_fee ?? 0);
  const commission = Math.round(fee * COMMISSION_RATE);

  await db.execute(sql`
    UPDATE sos_sessions
    SET status = 'completed', completed_at = NOW(), resolution = 'completed',
        fee = ${fee}, commission = ${commission}
    WHERE id = ${sessionId}
  `);

  // Cleanup phone proxy
  try { await closePhoneProxy(sessionId); } catch (e) {
    console.error("[SOS] proxy close failed:", e);
  }

  // Broadcast completion to patient
  await broadcastSos(`session:${sessionId}`, "session-update", {
    status: "completed",
    doctorName: row.doctor_name,
  });

  // SMS with review link
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const sig = signSosToken(sessionId);
  const reviewUrl = `${baseUrl}/avis-sos/${sessionId}?sig=${sig}`;
  const smsResult = await sendSMS(
    row.patient_phone,
    `Doktori: Consultation SOS terminée avec Dr. ${row.doctor_name}. Donnez votre avis: ${reviewUrl}`,
  );

  // Fire-and-forget retry if SMS failed
  if (!smsResult.success) {
    setTimeout(() => {
      sendSMS(
        row.patient_phone,
        `Doktori: Consultation SOS terminée avec Dr. ${row.doctor_name}. Donnez votre avis: ${reviewUrl}`,
      ).catch(() => {});
    }, 5000);
  }

  return NextResponse.json({ success: true, fee, commission });
}
```

- [ ] **Step 3: Create cancel route**

Create `apps/web/app/api/sos/cancel/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@doktori/db";
import { sql } from "drizzle-orm";
import { closePhoneProxy } from "@/lib/phone-proxy";
import { broadcastSos } from "@/lib/sos-broadcast";
import { verifySosToken } from "@/lib/sos-hmac";

export async function POST(req: Request) {
  const body = await req.json();
  const { sessionId, reason, cancelledBy, token } = body;

  if (!sessionId || !cancelledBy) {
    return NextResponse.json({ error: "sessionId et cancelledBy requis" }, { status: 400 });
  }

  // Auth: doctor uses session, patient uses HMAC token
  if (cancelledBy === "doctor") {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
  } else if (cancelledBy === "patient") {
    if (!token || !verifySosToken(sessionId, token)) {
      return NextResponse.json({ error: "Token invalide" }, { status: 401 });
    }
  } else {
    return NextResponse.json({ error: "cancelledBy invalide" }, { status: 400 });
  }

  const result = await db.execute(sql`
    UPDATE sos_sessions
    SET status = 'cancelled', cancelled_at = NOW(),
        cancel_reason = ${reason || null},
        cancelled_by = ${cancelledBy},
        resolution = ${"cancelled_by_" + cancelledBy}
    WHERE id = ${sessionId} AND status IN ('pending', 'accepted')
    RETURNING id, status
  `);

  const updated = (result as unknown as any[])[0];
  if (!updated) {
    return NextResponse.json({ error: "Session non annulable" }, { status: 409 });
  }

  try { await closePhoneProxy(sessionId); } catch {}

  await broadcastSos(`session:${sessionId}`, "session-update", {
    status: "cancelled",
  });

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 4: Create decline route**

Create `apps/web/app/api/sos/decline/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, sosDeclines } from "@doktori/db";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { sessionId, reason } = await req.json();
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId requis" }, { status: 400 });
  }

  // Idempotent insert (unique index catches duplicates)
  try {
    await db.insert(sosDeclines).values({
      sessionId,
      doctorId: session.user.id,
      reason: reason || null,
    });
  } catch (e: any) {
    if (e?.code === "23505") {
      // Already declined — idempotent
      return NextResponse.json({ success: true });
    }
    throw e;
  }

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 5: Create rate route**

Create `apps/web/app/api/sos/rate/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { db, reviews } from "@doktori/db";
import { sql, eq, and } from "drizzle-orm";
import { verifySosToken } from "@/lib/sos-hmac";

export async function POST(req: Request) {
  const body = await req.json();
  const { sessionId, sig, rating, comment } = body;

  if (!sessionId || !sig || !rating) {
    return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
  }

  if (!verifySosToken(sessionId, sig)) {
    return NextResponse.json({ error: "Lien invalide" }, { status: 401 });
  }

  if (typeof rating !== "number" || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Note entre 1 et 5" }, { status: 400 });
  }

  const trimmedComment = typeof comment === "string"
    ? comment.trim().slice(0, 1000)
    : null;

  // Fetch session
  const rows = await db.execute(sql`
    SELECT id, status, doctor_id, patient_id FROM sos_sessions
    WHERE id = ${sessionId} LIMIT 1
  `);
  const session = (rows as unknown as any[])[0];

  if (!session || session.status !== "completed") {
    return NextResponse.json({ error: "Session non terminée" }, { status: 400 });
  }

  // Check no existing review
  const existing = await db.execute(sql`
    SELECT id FROM reviews WHERE sos_session_id = ${sessionId} LIMIT 1
  `);
  if ((existing as unknown as any[]).length > 0) {
    return NextResponse.json({ error: "Avis déjà soumis" }, { status: 409 });
  }

  await db.insert(reviews).values({
    doctorId: session.doctor_id,
    patientId: session.patient_id,
    sosSessionId: sessionId,
    rating,
    comment: trimmedComment,
    status: "published",
    verified: true,
  });

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 6: Verify build**

Run: `cd apps/web && pnpm exec next build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 7: Commit**

```bash
git add apps/web/lib/sos-hmac.ts apps/web/app/api/sos/complete/ apps/web/app/api/sos/cancel/ apps/web/app/api/sos/decline/ apps/web/app/api/sos/rate/
git commit -m "feat(sos): complete, cancel, decline, rate endpoints with HMAC auth"
```

---

## Task 3: Cron + Accept fix + Request token (Slice 1c)

**Files:**
- Create: `apps/web/app/api/cron/sos-cleanup/route.ts`
- Modify: `apps/web/app/api/sos/accept/route.ts`
- Modify: `apps/web/app/api/sos/request/route.ts`
- Modify: `docs/ops/cron.md`

- [ ] **Step 1: Create sos-cleanup cron route**

Create `apps/web/app/api/cron/sos-cleanup/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { db } from "@doktori/db";
import { sql } from "drizzle-orm";
import { closePhoneProxy } from "@/lib/phone-proxy";
import { broadcastSos } from "@/lib/sos-broadcast";

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  // Step 1: Expire pending sessions past their deadline
  const expired = await db.execute(sql`
    UPDATE sos_sessions SET status = 'expired', resolution = 'expired'
    WHERE status = 'pending' AND expires_at < NOW()
    RETURNING id
  `);
  const expiredIds = (expired as unknown as Array<{ id: string }>);

  for (const row of expiredIds) {
    await broadcastSos(`session:${row.id}`, "session-update", { status: "expired" });
  }

  // Step 2: Expire stale accepted sessions (24h safety net)
  const stale = await db.execute(sql`
    UPDATE sos_sessions SET status = 'expired', resolution = 'expired'
    WHERE status = 'accepted' AND accepted_at < NOW() - interval '24 hours'
    RETURNING id
  `);
  const staleIds = (stale as unknown as Array<{ id: string }>);

  // Step 3: Close orphaned phone proxies
  const allExpired = [...expiredIds, ...staleIds];
  let proxiesClosed = 0;
  for (const row of allExpired) {
    try {
      await closePhoneProxy(row.id);
      proxiesClosed++;
    } catch {}
  }

  return NextResponse.json({
    expired: expiredIds.length,
    staleCompleted: staleIds.length,
    proxiesClosed,
  });
}
```

- [ ] **Step 2: Modify accept route — broadcast request-taken + capture distance**

In `apps/web/app/api/sos/accept/route.ts`, after the successful atomic UPDATE (line ~22), add:

1. Change the UPDATE to also capture distance:
```sql
UPDATE sos_sessions
SET status = 'accepted', doctor_id = ${session.user.id}, accepted_at = NOW(),
    distance_m = (
      SELECT ST_Distance(s.patient_location, d.location)::integer
      FROM sos_sessions s, doctors d
      WHERE s.id = ${sessionId} AND d.id = ${session.user.id}
    )
WHERE id = ${sessionId} AND status = 'pending' AND expires_at > NOW()
RETURNING id, patient_id
```

2. After the existing `broadcastSos` to the patient, add a broadcast to remove from other doctors' feeds:
```typescript
await broadcastSos("doctors-all", "request-taken", { sessionId });
```

3. Wrap SMS in fire-and-forget retry:
```typescript
const smsResult = await sendSMS(info.patient_phone, `...`);
if (!smsResult.success) {
  setTimeout(() => sendSMS(info.patient_phone, `...`).catch(() => {}), 5000);
}
```

- [ ] **Step 3: Modify request route — return HMAC token**

In `apps/web/app/api/sos/request/route.ts`, add import at top:
```typescript
import { signSosToken } from "@/lib/sos-hmac";
```

Change the return at the bottom (line ~49) from:
```typescript
return NextResponse.json({ sessionId }, { status: 201 });
```
to:
```typescript
const token = signSosToken(sessionId);
return NextResponse.json({ sessionId, token }, { status: 201 });
```

- [ ] **Step 4: Update cron.md**

Append to `docs/ops/cron.md`:
```markdown
# SOS cleanup — expire pending/stale sessions, close phone proxies
*/5 * * * * curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:3005/api/cron/sos-cleanup
```

- [ ] **Step 5: Verify build**

Run: `cd apps/web && pnpm exec next build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/api/cron/sos-cleanup/ apps/web/app/api/sos/accept/route.ts apps/web/app/api/sos/request/route.ts docs/ops/cron.md
git commit -m "feat(sos): cleanup cron, request-taken broadcast, HMAC token on request"
```

---

## Task 4: Patient SOS page rewrite (Slice 2)

**Files:**
- Rewrite: `apps/web/app/sos/page.tsx`
- Create: `apps/web/app/avis-sos/[sessionId]/page.tsx`

- [ ] **Step 1: Rewrite patient SOS page**

Rewrite `apps/web/app/sos/page.tsx`. Keep the same `"use client"` structure, same Socket.IO + polling pattern, same imports. Changes:

1. **State additions:** `cancelToken` (string from request response), `expiresAt` (Date), `countdown` (number in seconds), `doctorLat`/`doctorLng` (from session-update)

2. **"waiting" step enhancements:**
   - Start `setInterval(1000)` computing countdown from `expiresAt`
   - SVG circular progress ring: `strokeDasharray` based on remaining fraction of 30min
   - Color interpolation: teal at 30min → red at 0
   - Display `MM:SS` centered in the ring
   - Auto-transition to `expired` when countdown hits 0
   - "Annuler ma demande" secondary button → POST `/api/sos/cancel` with `{ sessionId, cancelledBy: 'patient', token: cancelToken }`

3. **"accepted" step enhancements:**
   - Leaflet map (dynamic import `next/dynamic` with `ssr: false`):
     - Blue marker at patient location
     - Teal marker at doctor location (`doctorLat`/`doctorLng` from session data or session-update payload — extend the session GET to include `d.latitude, d.longitude`)
     - Popup with distance
   - `<a href="tel:{doctorPhone}">` call button, teal, full-width
   - "Annuler" secondary button with confirmation dialog (show "Le Dr. {name} a déjà accepté" warning)

4. **"expired" step enhancements:**
   - "Réessayer" button — calls `setStep("form")`, pre-fills name/phone/symptom/description from state, re-requests geolocation
   - Remove dead-end feel

5. **Request submission:** Store `response.token` as `cancelToken` in state, store `expiresAt` computed from `Date.now() + 30*60*1000`

6. **Session poll response:** Extend to read `doctor_latitude`, `doctor_longitude` from the GET response (modify `/api/sos/session/[id]/route.ts` to include `d.latitude AS doctor_latitude, d.longitude AS doctor_longitude` in the query)

- [ ] **Step 2: Modify session poll endpoint**

In `apps/web/app/api/sos/session/[id]/route.ts`, add `d.latitude AS doctor_latitude, d.longitude AS doctor_longitude` to the SELECT query so the patient page can place the doctor pin on the map.

- [ ] **Step 3: Create SOS review page**

Create `apps/web/app/avis-sos/[sessionId]/page.tsx`:

```typescript
"use client";

import { useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Star } from "lucide-react";

export default function SOSReviewPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const sig = useSearchParams().get("sig") || "";
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (rating === 0) { setError("Veuillez choisir une note"); return; }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/sos/rate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, sig, rating, comment: comment || undefined }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Erreur");
      }
      setSubmitted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#F0FDFA] flex items-center justify-center p-4">
        <div className="bg-white rounded-xl border p-8 text-center max-w-md">
          <div className="text-4xl mb-4">&#10003;</div>
          <h1 className="text-xl font-bold text-[#134E4A] mb-2">Merci pour votre avis !</h1>
          <p className="text-sm text-gray-500">Votre retour aide les autres patients.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F0FDFA] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl border p-6 max-w-md w-full space-y-5">
        <h1 className="text-xl font-bold text-[#134E4A]">Évaluez votre consultation SOS</h1>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} onClick={() => setRating(n)} type="button">
              <Star
                className={`w-8 h-8 ${n <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
              />
            </button>
          ))}
        </div>
        <textarea
          className="w-full rounded border px-3 py-2 text-sm"
          rows={4}
          placeholder="Commentaire (optionnel)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={1000}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full bg-[#0891B2] hover:bg-[#0E7490] text-white py-2.5 rounded-lg font-medium disabled:opacity-50"
        >
          {submitting ? "Envoi..." : "Envoyer mon avis"}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify build**

Run: `cd apps/web && pnpm exec next build 2>&1 | tail -5`

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/sos/page.tsx apps/web/app/avis-sos/ apps/web/app/api/sos/session/
git commit -m "feat(sos): patient UX — countdown, cancel, map, call, retry, review page"
```

---

## Task 5: Doctor SOS page rewrite (Slice 3)

**Files:**
- Rewrite: `apps/web/app/sos-medecin/page.tsx`
- Create: `apps/web/app/api/sos/doctor/history/route.ts`
- Modify: `apps/web/app/api/sos/doctor/settings/route.ts`
- Modify: `apps/web/app/api/sos/doctor/feed/route.ts`

- [ ] **Step 1: Create doctor history endpoint**

Create `apps/web/app/api/sos/doctor/history/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@doktori/db";
import { sql } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const doctorId = session.user.id;

  // History
  const history = await db.execute(sql`
    SELECT s.id, s.status, s.resolution, s.fee, s.commission,
           s.symptom_category, s.requested_at, s.accepted_at, s.completed_at,
           p.name AS patient_name,
           r.rating
    FROM sos_sessions s
    JOIN patients p ON p.id = s.patient_id
    LEFT JOIN reviews r ON r.sos_session_id = s.id
    WHERE s.doctor_id = ${doctorId}
    ORDER BY s.requested_at DESC
    LIMIT 50
  `);

  // Monthly earnings
  const earnings = await db.execute(sql`
    SELECT COALESCE(SUM(fee), 0) AS total_fee,
           COALESCE(SUM(commission), 0) AS total_commission,
           COUNT(*) AS session_count
    FROM sos_sessions
    WHERE doctor_id = ${doctorId}
      AND status = 'completed'
      AND completed_at >= date_trunc('month', CURRENT_DATE)
  `);

  return NextResponse.json({
    history: history as unknown as any[],
    earnings: (earnings as unknown as any[])[0],
  });
}
```

- [ ] **Step 2: Modify feed route — exclude declined + time-window filter**

In `apps/web/app/api/sos/doctor/feed/route.ts`, modify the SQL query to add:

```sql
AND s.id NOT IN (
  SELECT session_id FROM sos_declines WHERE doctor_id = ${doctorId}
)
AND (d.sos_available_from IS NULL OR (
  CASE WHEN d.sos_available_from <= d.sos_available_to
    THEN LOCALTIME AT TIME ZONE 'Africa/Tunis'
         BETWEEN d.sos_available_from AND d.sos_available_to
    ELSE LOCALTIME AT TIME ZONE 'Africa/Tunis' >= d.sos_available_from
         OR LOCALTIME AT TIME ZONE 'Africa/Tunis' <= d.sos_available_to
  END
))
```

- [ ] **Step 3: Modify settings route — accept availableFrom/availableTo**

In `apps/web/app/api/sos/doctor/settings/route.ts`, extend the PUT handler to accept and store `availableFrom` and `availableTo` time strings. Add to the UPDATE SQL:

```sql
sos_available_from = ${availableFrom || null},
sos_available_to = ${availableTo || null}
```

And in the GET handler, return them in the response.

- [ ] **Step 4: Rewrite doctor SOS page**

Rewrite `apps/web/app/sos-medecin/page.tsx`. Keep the same client component structure. Changes:

1. **Settings section:** Add two time inputs for `availableFrom` / `availableTo` with a "24h/24" checkbox that nulls both.

2. **Feed cards:** Each request card gets:
   - "Accepter" button (existing)
   - "Décliner" dropdown button with reasons: "Trop loin", "Pas disponible", "Hors compétence", "Autre" → POST `/api/sos/decline`
   - Card disappears on decline (client-side filter)

3. **Active session card:** When a request is accepted, transform it:
   - Patient info, symptom, elapsed time
   - "Consultation terminée" button → opens inline fee input (pre-filled from `sosFee`), submit calls POST `/api/sos/complete`
   - "Annuler" button → POST `/api/sos/cancel` with `cancelledBy: 'doctor'`

4. **Socket.IO:** Also listen for `request-taken` event — remove that session from feed

5. **Continuous location:** When SOS mode is active, call `navigator.geolocation.watchPosition()` with `enableHighAccuracy: true`. Throttle updates to 1 per 30s. PUT to `/api/sos/doctor/settings` with new lat/lng. Stop on `beforeunload`.

6. **History section:** Below the feed, fetch `GET /api/sos/doctor/history`. Show:
   - Earnings KPI strip: Ce mois / Commission / Net / Sessions
   - History table: date, patient, symptom, status badge, fee (DT), rating stars

- [ ] **Step 5: Verify build**

Run: `cd apps/web && pnpm exec next build 2>&1 | tail -5`

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/sos-medecin/page.tsx apps/web/app/api/sos/doctor/
git commit -m "feat(sos): doctor UX — decline, complete, history, earnings, location watch, time windows"
```

---

## Task 6: Admin SOS API routes (Slice 4a)

**Files:**
- Create: `apps/web/app/api/admin/sos/sessions/route.ts`
- Create: `apps/web/app/api/admin/sos/[id]/route.ts`
- Create: `apps/web/app/api/admin/sos/[id]/force-accept/route.ts`
- Create: `apps/web/app/api/admin/sos/[id]/complete/route.ts`
- Create: `apps/web/app/api/admin/sos/[id]/cancel/route.ts`
- Create: `apps/web/app/api/admin/sos/[id]/extend/route.ts`
- Create: `apps/web/app/api/admin/sos/kpis/route.ts`
- Create: `apps/web/app/api/admin/sos/coverage/route.ts`

- [ ] **Step 1: Create sessions list route**

`GET /api/admin/sos/sessions` — paginated list with filters (status, dateFrom, dateTo, symptomCategory, doctorId). `requireAdmin(["super_admin", "support"])`. Returns sessions joined with patient name, doctor name, review rating. Supports `?page=1&limit=50&status=completed&from=2026-01-01&to=2026-04-12`.

- [ ] **Step 2: Create session detail + notes route**

`GET /api/admin/sos/[id]` — full session detail with timeline events (declines from `sos_declines`, SMS logs from `sms_logs` where message LIKE '%SOS%', phone proxy status, review). `PATCH` to update `admin_notes`. Both require `requireAdmin(["super_admin", "support"])` + `logAudit`.

- [ ] **Step 3: Create force-accept route**

`POST /api/admin/sos/[id]/force-accept` — body `{ doctorId }`. Runs same atomic UPDATE as the doctor accept route but with admin auth. Also captures `distance_m`. Broadcasts `request-taken` + `session-update`. `logAudit({ action: "sos.force_accept" })`.

- [ ] **Step 4: Create admin complete route**

`POST /api/admin/sos/[id]/complete` — marks session completed with admin auth. `logAudit({ action: "sos.admin_complete" })`.

- [ ] **Step 5: Create admin cancel route**

`POST /api/admin/sos/[id]/cancel` — body `{ reason }`. Sets `cancelled_by='admin'`, `resolution='cancelled_by_admin'`. `logAudit({ action: "sos.admin_cancel" })`.

- [ ] **Step 6: Create extend route**

`POST /api/admin/sos/[id]/extend` — extends `expires_at` by 15 minutes. Only for pending sessions. `logAudit({ action: "sos.extend_expiry" })`.

- [ ] **Step 7: Create KPIs route**

`GET /api/admin/sos/kpis` — date range filter (`?from=&to=`, default last 30 days). Returns:
- acceptanceRate, medianResponseTimeMs, medianDistanceM, completionRate
- declineReasons (top 5 aggregated from sos_declines)
- bySymptom (array of { category, count, acceptedCount })
- byHour (array of 24 entries { hour, count })

Uses `percentile_cont(0.5)` for median calculations.

- [ ] **Step 8: Create coverage route**

`GET /api/admin/sos/coverage` — joins doctor cities (where `sos_available=true`) against SOS request cities (derived from `doctor.city` on accepted sessions, or 'Inconnu' for pending). Returns arrays: `noDoctorCities`, `lowAcceptanceCities`, `doctorCounts`.

- [ ] **Step 9: Verify build**

Run: `cd apps/web && pnpm exec next build 2>&1 | tail -5`

- [ ] **Step 10: Commit**

```bash
git add apps/web/app/api/admin/sos/
git commit -m "feat(admin/sos): API routes — sessions, detail, force-accept, complete, cancel, extend, KPIs, coverage"
```

---

## Task 7: Admin SOS pages (Slice 4b)

**Files:**
- Create: `apps/web/app/(admin)/admin/sos/page.tsx`
- Create: `apps/web/app/(admin)/admin/sos/sessions/page.tsx`
- Create: `apps/web/app/(admin)/admin/sos/[id]/page.tsx`
- Create: `apps/web/app/(admin)/admin/sos/[id]/detail-view.tsx`
- Create: `apps/web/app/(admin)/admin/sos/kpis/page.tsx`
- Create: `apps/web/app/(admin)/admin/sos/coverage/page.tsx`
- Modify: `apps/web/app/(admin)/layout.tsx`

- [ ] **Step 1: Create live dashboard page**

`/admin/sos/page.tsx` — server component that renders a client component with:
- **Left panel (60%):** Leaflet map (dynamic import, ssr:false). Fetch active sessions via SWR from `/api/admin/sos/sessions?status=pending,accepted&limit=100`. Red pins for pending, orange for accepted. Fetch available doctors via a query (or reuse KPIs data). Green dots for available doctors. Click pin → sidebar panel.
- **Right panel (40%):** Active sessions list. Each card: patient name, symptom badge, elapsed time since request, doctor name (if accepted). Quick-action buttons: Force-accept, Cancel, Extend.

- [ ] **Step 2: Create session history page**

`/admin/sos/sessions/page.tsx` — server component. Reuse the admin table pattern from `doctors-table.tsx`:
- Client component with filters (status multi-select, date range, symptom category, doctor search)
- Fetch from `/api/admin/sos/sessions` with query params
- Columns: ID (truncated, link to detail), patient, doctor, symptom badge, status badge, fee (DT), commission (DT), requested at, duration (accepted→completed), rating stars
- CSV export button (client-side, serialize visible rows)

- [ ] **Step 3: Create session detail page**

`/admin/sos/[id]/page.tsx` — server component. Fetches session detail from `/api/admin/sos/[id]` server-side.
Renders `<DetailView>` client component.

`detail-view.tsx` — client component with:
- Vertical timeline: each event (request, declines, accept, complete/cancel/expire) as a node with timestamp, actor, details
- Map: patient blue pin + doctor teal pin (if accepted)
- Phone proxy card: status, Twilio SIDs (if present)
- SMS log entries
- Review card (rating, comment)
- Admin notes textarea (auto-saves on blur via PATCH)
- Action buttons: Force-accept (if pending), Mark completed (if accepted), Cancel (if not completed), Extend (if pending), Refund (stub → 501 toast)

- [ ] **Step 4: Create KPIs page**

`/admin/sos/kpis/page.tsx` — server component loading data, passing to a client Recharts component.
- Top KPI cards: acceptance rate %, median response time, median distance, completion rate %
- Bar chart: requests by symptom category (Recharts `<BarChart>`)
- Line chart: requests by hour of day (Recharts `<LineChart>`)
- Table: top decline reasons with count

- [ ] **Step 5: Create coverage page**

`/admin/sos/coverage/page.tsx` — server component.
- Table with 3 sections:
  - Red rows: cities with requests but 0 SOS doctors
  - Amber rows: cities with >50% expired rate
  - Green rows: cities with adequate coverage
- Columns: city, total requests, expired count, expired %, available doctors

- [ ] **Step 6: Add SOS to admin sidebar**

In `apps/web/app/(admin)/layout.tsx`, add a sidebar link group under "Opérations":

```tsx
{ label: "SOS", href: "/admin/sos", icon: Radio },
{ label: "Sessions SOS", href: "/admin/sos/sessions", icon: Activity },
{ label: "KPIs SOS", href: "/admin/sos/kpis", icon: BarChart3 },
{ label: "Couverture", href: "/admin/sos/coverage", icon: Map },
```

- [ ] **Step 7: Verify build**

Run: `cd apps/web && pnpm exec next build 2>&1 | tail -5`

- [ ] **Step 8: Commit**

```bash
git add apps/web/app/\(admin\)/admin/sos/ apps/web/app/\(admin\)/layout.tsx
git commit -m "feat(admin/sos): live dashboard, sessions, detail, KPIs, coverage pages"
```

---

## Task 8: Apply migration + deploy (post-implementation)

- [ ] **Step 1: Push to main**

```bash
git push origin main
```

- [ ] **Step 2: Deploy to prod**

Follow the standard deploy pattern:
```bash
cd /tmp && rm -rf doktori-deploy && git clone --depth 1 https://github.com/omario75013/doktori.git doktori-deploy
cd doktori-deploy && git archive HEAD -o /tmp/doktori-deploy.tgz
scp /tmp/doktori-deploy.tgz root@157.90.152.204:/tmp/
ssh root@157.90.152.204 "cp /opt/doktori/.env /tmp/doktori-env.bak && cd /opt/doktori && tar xzf /tmp/doktori-deploy.tgz && cp /tmp/doktori-env.bak .env"
```

- [ ] **Step 3: Apply migration**

```bash
ssh root@157.90.152.204 "docker exec -i postgres-doktori psql -U doktori -d doktori < /opt/doktori/packages/db/migrations/0027_sos_enrichment.sql"
```

Verify: `docker exec postgres-doktori psql -U doktori -d doktori -c "\d sos_declines"` should show the new table.

- [ ] **Step 4: Build and restart**

```bash
ssh root@157.90.152.204 "cd /opt/doktori && docker compose -f docker-compose.yml -f docker-compose.prod.yml build doktori-web && docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d doktori-web"
```

- [ ] **Step 5: Healthcheck**

```bash
ssh root@157.90.152.204 "docker logs doktori-web --tail 5 && curl -sS -o /dev/null -w '%{http_code}' http://localhost:3005/"
```
Expected: `✓ Ready` + HTTP 200

- [ ] **Step 6: Add cron entry**

```bash
ssh root@157.90.152.204 "(crontab -l; echo '*/5 * * * * source /etc/profile.d/op-service-account.sh && . /opt/doktori/.env && curl -fsS -X POST -H \"Authorization: Bearer \$CRON_SECRET\" http://localhost:3005/api/cron/sos-cleanup >> /var/log/doktori/sos-cleanup.log 2>&1') | crontab -"
```

- [ ] **Step 7: Smoke test**

```bash
ssh root@157.90.152.204 "curl -sS -o /dev/null -w '%{http_code}' http://localhost:3005/sos && echo '' && curl -sS -o /dev/null -w '%{http_code}' http://localhost:3005/sos-medecin && echo '' && curl -sS -o /dev/null -w '%{http_code}' http://localhost:3005/admin/sos"
```
Expected: 200, 307 (auth redirect), 307 (auth redirect)

---

## Parallelization Guide

Tasks 1–3 are **sequential** (schema → routes → cron+fixes depend on each other).

Tasks 4 and 5 can run **in parallel** (patient and doctor UX touch different files, both depend on Task 2/3 being done).

Task 6 and 7 are **sequential** (admin pages depend on admin API routes).

Tasks 4+5 and 6+7 can run **in parallel** (patient/doctor UX vs admin — completely different file trees).

**Optimal agent dispatch:**
1. Run Task 1 first (serial)
2. Run Tasks 2+3 (serial, depends on 1)
3. Dispatch 3 parallel agents: Task 4, Task 5, Tasks 6+7
4. Integrate, build, Task 8 deploy
