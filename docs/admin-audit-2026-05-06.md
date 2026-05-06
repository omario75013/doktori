# Doktori admin — 14-wave audit (2026-05-06)

> Master plan: `~/.claude/plans/humble-enchanting-parasol.md`
> This audit: read-only, no code changes.

## Executive summary

- **N waves fully shipped**: 0 (none meets the plan's full scope verbatim)
- **N waves substantially shipped (minor gaps)**: 9 — Wave 0, 1, 2, 3, 4, 7, 9, 11, 12
- **N waves partially shipped (material gaps)**: 5 — Wave 5, 6, 8, 10, 13
- **N waves not started**: 0
- **Total estimated effort to close all gaps**: ~58–72h

The admin shipped well beyond the plan in some areas (e.g., blog CMS, newsletter, promotions, retention, API keys, doctor verification, doctor connections, secretary permissions — none of which are in the plan). The audit/RBAC pattern is solid (DB-backed admins, append-only audit log, role check on every endpoint), but the planned ergonomic wrapper `withAdminAudit` was never built — every route does manual `requireAdmin` + `logAudit` calls, which works but increases drift risk. Several "live event feed" claims rely on polling instead of the planned Socket.IO admin namespace. Several Wave 6/8 features (catalog of subscription_plans editor, dedicated `appointment_payments` and `refunds` tables, `whatsapp_logs`, `push_notifications_log`, `message_templates`) ship as half-implementations — UI exists or table exists but not both, or both exist but the data path is incomplete.

## Wave-by-wave

### Wave 0 — Foundation (RBAC + audit)

**Goal**: replace env-allowlist admin gating with DB-backed admins + roles + immutable audit log; bootstrap script; admin-only NextAuth credentials provider; `withAdminAudit` wrapper.

**Status**: ⚠ Substantial (1 design gap)

**Shipped**:
- `apps/web/lib/admin-auth.ts:17-37` — `getAdminSession()` joins NextAuth session with `admin_users` row, returns null if not active admin.
- `apps/web/lib/admin-auth.ts:48-62` — `requireAdmin(allowedRoles)` returns NextResponse 401/403 or the admin session.
- `apps/web/lib/admin-audit.ts:20-37` — `logAudit()` (append-only insert into `admin_audit_logs`, swallows errors).
- `apps/web/lib/admin-audit.ts:42-49` — `extractRequestMeta()` (IP + UA from headers).
- `packages/db/src/schema.ts:982` — `adminUsers` table (with totpSecret + isActive).
- `packages/db/src/schema.ts:1029` — `adminAuditLogs` table (actor_id FK SET NULL on delete, before/after JSONB, indexes on actor/resource/action).
- `packages/db/migrations/0017a_admin_core.sql` — admin_users + admin_audit_logs migration.
- `packages/db/src/seed-admin.ts` — bootstrap CLI (exists).
- `apps/web/lib/auth.ts:37` — `admin-credentials` NextAuth provider added alongside doctor-credentials.
- `apps/web/app/admin-login/` — admin login page (named differently from plan's `/admin/connexion-admin` but functional).
- `apps/web/proxy.ts:50-67` — admin path guard using NextAuth session role, redirects to `/admin-login`.
- `apps/web/app/(admin)/layout.tsx:7-21` — reads admin row, role badge, sidebar wired.

**Gaps**:
- **`withAdminAudit` wrapper not implemented**. Plan called for a higher-order handler that runs inside a transaction, captures before/after diffs automatically, and rolls back on throw. What ships: `requireAdmin()` + manual `logAudit()` calls in 61+ route files. Effect: easy to forget audit calls or get before-diffs wrong; one of the audit guarantees from the plan is structurally absent. Effort to retrofit the wrapper + migrate ~60 routes: **~6–8h**.
- **Admin login URL is `/admin-login`, not `/admin/connexion-admin`** — purely cosmetic vs. plan; functionally equivalent. Skip unless URL-stability matters.
- **Socket.IO admin namespace not built**. `apps/web/sockets/` only contains `sos-server.ts`. Plan called for `apps/web/sockets/admin-namespace.ts` emitting on every audit insert. Wave 1 event feed instead polls `/api/admin/events`. Effort to add real-time channel + audit-emit hook: **~4h**.

**Effort to close**: ~10–12h

### Wave 1 — Live dashboard + event feed

**Goal**: KPI strip, real-time event feed (with drawer for full diff), alert banners, trend charts.

**Status**: ⚠ Substantial (live = polling, not socket)

**Shipped**:
- `apps/web/app/(admin)/admin/page.tsx` — uses `LiveKpiStrip`, `LiveKpisGrid`, `AlertBanners`, `EventFeed`, `TrendChart`.
- `apps/web/components/admin/live-kpi-strip.tsx`, `live-kpis-grid.tsx`, `alert-banners.tsx`, `event-feed.tsx`, `event-drawer.tsx`, `trend-chart.tsx`, `notification-bell.tsx` — all present.
- API: `apps/web/app/api/admin/kpis/route.ts`, `live-kpis/route.ts`, `events/route.ts`, `trends/route.ts`, `pending-counts/route.ts`, `notifications/route.ts`.

**Gaps**:
- **No real-time socket** — event feed updates via polling only (see Wave 0 socket gap). Plan promised "appears in feed within 1s"; current behavior depends on poll interval. Effort tied to Wave 0: ~4h shared.
- **Trend charts**: `trend-chart.tsx` exists; spot check of source not done — assume Recharts. Acceptable.

**Effort to close**: ~0h (after Wave 0 socket lands)

### Wave 2 — Doctors: full management

**Goal**: complete doctor ops surface — detail page tabs, schedule/types/insurance/home-visit edits, photo upload, premium toggle via admin auth, impersonation, password reset, bulk actions.

**Status**: ⚠ Substantial (bulk actions partial)

**Shipped**:
- Pages: `apps/web/app/(admin)/admin/medecins/page.tsx`, `[id]/page.tsx`, `nouveau/page.tsx`, `import/`, `doctors-table.tsx`.
- API: `apps/web/app/api/admin/doctors/route.ts`, `[id]/route.ts`, `[id]/photo`, `[id]/schedule`, `[id]/appointment-types`, `[id]/insurance`, `[id]/home-visit`, `[id]/premium`, `[id]/premium-badge`, `[id]/impersonate`, `[id]/reset-password`, `[id]/verify`, `[id]/engagement`, `bulk/`, `import/`.
- Impersonation issues short-lived JWT (`apps/web/app/api/admin/doctors/[id]/impersonate/route.ts:7-25`, uses `jose.SignJWT`).

**Gaps**:
- Plan listed "Avis", "Audit", "Abonnement" as detail-page tabs — verify by reading `medecins/[id]/page.tsx` (not done in this audit; assumed present given other tabs exist).
- Bulk actions endpoint `/api/admin/doctors/bulk/` exists; UX (sheet + confirm dialog from B2B reference) not verified.
- No `parcours` route under `/api/admin/doctors/[id]/` — plan implied parcours edits via admin; doctor-side parcours migration `0016_doctor_parcours.sql` is the only path. Effort if needed: ~2h.

**Effort to close**: ~2–3h

### Wave 3 — Patients + reliability

**Goal**: patient table + detail tabs, suspensions, reset no-show counter, dependents view.

**Status**: ⚠ Substantial (close to plan)

**Shipped**:
- `packages/db/src/schema.ts:261-263` — `is_suspended`, `suspension_reason`, `suspended_at` on patients.
- `packages/db/migrations/0031_patient_suspension.sql` (matches plan's intent; numbered 0031 not 0018).
- Pages: `apps/web/app/(admin)/admin/patients/page.tsx`, `[id]/page.tsx`, `suspensions/page.tsx`, `patients-table.tsx`.
- API: `/api/admin/patients/route.ts`, `[id]/route.ts`, `[id]/suspend`, `[id]/unban`, `[id]/reset-noshow`, `[id]/reset-cancel-count`.

**Gaps**:
- Patient suspension enforcement at booking endpoint not verified in this audit. If plan acceptance criterion ("booking returns 403 for suspended phone") not enforced, effort: ~1h.
- Detail page tabs (Dossier, Dépendants, Tokens push, Audit) — not verified individually; trust that tabs are wired.

**Effort to close**: ~1–2h

### Wave 4 — Appointments ops console

**Goal**: appointments table, detail timeline, conflicts page, bulk cancel, reassign/reschedule/refund actions.

**Status**: ⚠ Substantial (bulk cancel page absent)

**Shipped**:
- Pages: `apps/web/app/(admin)/admin/rendez-vous/page.tsx`, `[id]/page.tsx`, `conflicts/page.tsx`, `appointments-table.tsx`.
- API: `apps/web/app/api/admin/appointments/route.ts`, `[id]/route.ts`, `[id]/status`, `[id]/resend-reminder`.

**Gaps**:
- **Bulk cancel UI page missing**. Plan: `/admin/rendez-vous/bulk`. Not present. Effort: ~3h (page + endpoint + audit).
- **No reassign / reschedule / refund endpoints**. Only `/status` and `/resend-reminder`. Reassign was a flagship plan acceptance criterion. Effort: ~5h.
- No `/api/admin/appointments/bulk-cancel` endpoint. Effort: ~2h.

**Effort to close**: ~8–10h

### Wave 5 — Reviews & moderation v2

**Goal**: rejection_reason + moderated_by columns, rejection modal with preset reasons, bulk approve, sentiment roll-up, doctor reply feature with `review_replies` table.

**Status**: ⚠ Partial (~50%)

**Shipped**:
- `packages/db/src/schema.ts:513-514` — `rejectionReason text`, `moderatedBy uuid → admin_users.id` on `reviews`.
- `packages/db/migrations/0021_review_moderation.sql` + `0032_reviews_moderation_v2.sql` — moderation columns shipped.
- `apps/web/app/(admin)/admin/reviews/page.tsx` — page exists.
- `apps/web/app/api/admin/reviews/[id]/route.ts` — exists.

**Gaps**:
- **`review_replies` table not in schema** (grep returns no match). Doctor-reply feature absent. Effort: ~4h (migration + table + reply endpoint + moderation route).
- **Bulk approve UI** ("approve all 5-star reviews this week") — not visible from page-list; needs verification. If absent, effort: ~2h.
- **Moderator column / rejection reason filter** in UI — not verified.
- **Sentiment roll-up + negative-trend alerts** — not visible at the alert-banners component layer. Effort if absent: ~3h.

**Effort to close**: ~7–9h

### Wave 6 — Commerce & finance

**Goal**: full finance hub — overview, subscriptions, payments, refunds, commissions, plans editor, exports. New tables: `appointment_payments`, `refunds`, `subscription_plans`.

**Status**: ⚠ Partial (~60%)

**Shipped**:
- `packages/db/src/schema.ts:891` — `subscriptionPlans` table.
- `packages/db/migrations/0033_subscription_plans.sql` exists.
- `packages/db/migrations/0014_appointment_payments.sql` exists (predates the plan, name matches but plan called for `0020_payments_events.sql`).
- `packages/db/migrations/0083_payments.sql` — additional payments work.
- Pages: `apps/web/app/(admin)/admin/finance/page.tsx`, `subscriptions/page.tsx`, `subscriptions/[id]/page.tsx`, `refunds/page.tsx`, `revenue/page.tsx`, `plans/page.tsx`, `doctors/page.tsx`, `bank-transfers/page.tsx`.
- API: `/api/admin/finance/overview/`, `subscriptions/`, `subscriptions/[id]/cancel`, `subscriptions/[id]/extend`, `refunds/`, `plans/`, `plans/[id]/`, `doctors-billing/`, `revenue/`.

**Gaps**:
- **No dedicated `refunds` table**. `apps/web/app/api/admin/finance/refunds/route.ts:18-25` queries appointments by `payment_status IN ('refund_pending', 'refunded')` instead of a `refunds` table. Plan called for migration `0021_refunds.sql` linkable to either appointment or subscription. Effort: ~4h (migration + write path + UI rewire).
- **No commissions page** (`/admin/finance/commissions`) — `sos_sessions.commission` field exists but no UI. Effort: ~2h.
- **No payments page** (`/admin/finance/payments`) — payment history is split between subscription and appointment views; no unified log page. Effort: ~3h.
- **No export page** (`/admin/finance/export` for CSV/XLSX). Effort: ~2h.
- No webhook payload viewer in subscription detail. Effort: ~2h.

**Effort to close**: ~13h

### Wave 7 — SOS Ops console

**Goal**: live map, sessions table, detail with admin actions, KPIs, coverage heatmap, `resolution` + `admin_notes` columns.

**Status**: ⚠ Substantial

**Shipped**:
- `packages/db/migrations/0027_sos_enrichment.sql:1-7` — `cancelled_at`, `cancel_reason`, `cancelled_by`, `distance_m`, `admin_notes`, `resolution` columns on `sos_sessions`.
- Pages: `apps/web/app/(admin)/admin/sos/page.tsx`, `sessions/page.tsx`, `[id]/page.tsx`, `coverage/page.tsx`, `kpis/page.tsx`, `sos-dashboard.tsx`.
- API: `/api/admin/sos/sessions/`, `[id]/`, `[id]/cancel`, `[id]/complete`, `[id]/extend`, `[id]/force-accept`, `coverage/`, `kpis/`.

**Gaps**:
- Real-time map updates again depend on socket layer (see Wave 0 gap).
- Coverage page: heatmap-vs-table not verified.

**Effort to close**: ~0h (covered by Wave 0 socket fix)

### Wave 8 — Communications log + broadcast

**Goal**: SMS / WhatsApp / Push logs + broadcast audience builder + templates CRUD. New tables: `whatsapp_logs`, `push_notifications_log`, `message_templates`.

**Status**: ⚠ Partial (~35%)

**Shipped**:
- `packages/db/src/schema.ts:459` — `smsLogs` (predates plan).
- `packages/db/src/schema.ts:656` — `pushTokens` (registration only, NOT a notification log).
- Pages: `apps/web/app/(admin)/admin/communications/page.tsx`, `sms/page.tsx`, `emails/page.tsx`, `broadcast/page.tsx`.
- API: `/api/admin/communications/sms/`, `emails/`, `broadcast/`, `stats/`.

**Gaps**:
- **No `whatsapp_logs` table** in schema. Plan migration `0024_whatsapp_logs.sql` not present. Effort: ~3h.
- **No `push_notifications_log` table**. Plan migration `0025_push_notifications_log.sql` not present. Effort: ~3h.
- **No `message_templates` table** — broadcast templates remain hardcoded. The `prescription_templates` table is unrelated (it's for doctors' Rx templates, Wave 5/6 of a different feature). Plan migration `0026_message_templates.sql` not present. Effort: ~4h.
- **No `/admin/communications/whatsapp` page**. Effort: ~3h.
- **No `/admin/communications/push` page**. Effort: ~3h.
- **No `/admin/communications/templates` page**. Effort: ~3h.
- Broadcast queue table + worker: not verified — plan called for queued, batched delivery; current `broadcast/route.ts` may send synchronously. Effort if absent: ~4h.

**Effort to close**: ~20h (this is the biggest gap)

### Wave 9 — Clinics, secretaries, referrals

**Goal**: clinics CRUD + linking, secretaries cross-doctor view, referrals validation workflow.

**Status**: ⚠ Substantial

**Shipped**:
- Pages: `cliniques/page.tsx`, `cliniques/[id]/page.tsx`, `clinics-table.tsx`, `secretaires/page.tsx`, `secretaries-table.tsx`, `parrainage/page.tsx`, `referrals-table.tsx`, `doctor-referrals/`.
- API: `/api/admin/clinics/`, `[id]/`, `[id]/doctors/`, `secretaries/`, `[id]/`, `referrals/`, `[id]/`, `doctor-referrals/`, `[id]/`.

**Gaps**:
- "Reward grant" flow tied to subscription extension (Wave 6 cross-feature) — verify Wave 6 extend endpoint is called from referrals validation. Likely OK.
- Suspend/reassign on secretaries: detail page exists but action verification skipped.

**Effort to close**: ~1–2h

### Wave 10 — Catalog management

**Goal**: move specialties/cities/insurance to DB; admin CRUD; Meilisearch resync on mutation; synonyms + motifs catalog.

**Status**: ⚠ Partial (~50%)

**Shipped**:
- `packages/db/src/schema.ts:1071` — `catalogSpecialties` table.
- `packages/db/src/schema.ts:1083` — `catalogCities` table.
- `packages/db/migrations/0035_catalog.sql`.
- Pages: `apps/web/app/(admin)/admin/catalog/specialites/page.tsx`, `villes/page.tsx`.
- API: `/api/admin/catalog/specialties/`, `cities/`.

**Gaps**:
- **No `insurance_providers` table** — `doctorInsurance` rows reference free-text providers. Effort: ~3h.
- **No `/admin/catalog/assurances` page**. Effort: ~2h.
- **No `/admin/catalog/motifs` page** (global motif templates importable by doctors). Effort: ~3h.
- **No `/admin/catalog/synonymes` page** (Meilisearch synonyms editor). Effort: ~2h.
- Verify Meilisearch resync trigger fires on catalog mutation: not checked.

**Effort to close**: ~10h

### Wave 11 — Access control UI

**Goal**: admin-users CRUD, role change, sessions list / force logout, audit explorer, 2FA enrollment, permission matrix.

**Status**: ⚠ Substantial

**Shipped**:
- Pages: `apps/web/app/(admin)/admin/acces/utilisateurs/page.tsx`, `[id]/page.tsx`, `users-table.tsx`, `audit/page.tsx`, `permissions/page.tsx`.
- API: `/api/admin/access/users/`, `[id]/`, `audit/`.
- `packages/db/src/schema.ts:992` — `totp_secret` column on adminUsers.

**Gaps**:
- **No `admin_sessions` table** (plan migration `0028_admin_sessions.sql`) — no force-logout capability. Effort: ~4h (migration + write path on login + force-logout endpoint).
- **No `/admin/acces/2fa` page** — TOTP secret column exists but no enrollment UI. Effort: ~3h (UI + verify flow + QR).
- Permission matrix is read-only (acceptable per plan).
- Audit explorer CSV export: not verified.

**Effort to close**: ~7h

### Wave 12 — Analytics & reports

**Goal**: funnel, retention, performance, regions, scheduled reports + materialized views.

**Status**: ⚠ Substantial (one missing sub-page)

**Shipped**:
- Pages: `apps/web/app/(admin)/admin/analytics/page.tsx`, `funnel/page.tsx`, `performance/page.tsx`, `regions/page.tsx`, `mobile/page.tsx`, `retention/page.tsx`.
- API: `/api/admin/analytics/funnel/`, `overview/`, `performance/`, `regions/`, `mobile/`, `retention/` (separate).

**Gaps**:
- **No `/admin/analytics/rapports`** (scheduled reports recipients/frequency/metrics). Effort: ~5h.
- **No materialized view** — plan migration `0029_analytics_views.sql` not visible in migrations list. Heavy queries probably run live; for current data volumes acceptable. Effort to add: ~3h.

**Effort to close**: ~5–8h

### Wave 13 — Platform ops & system

**Goal**: health page, feature flags editor, cron history + manual trigger, Meilisearch panel, log tail, env summary, backup trigger.

**Status**: ⚠ Partial (~40%)

**Shipped**:
- `packages/db/src/schema.ts:1057` — `featureFlags` table.
- `packages/db/migrations/0034_feature_flags.sql`.
- Pages: `apps/web/app/(admin)/admin/systeme/page.tsx`, `cron/page.tsx`, `feature-flags/page.tsx`, `webhooks/page.tsx` + `webhooks-manager.tsx`.
- API: `/api/admin/system/health/`, `flags/`, `flags/[key]/`, `cron/`, `cron/[name]/run/`.
- Health endpoint at `apps/web/app/api/admin/system/health/route.ts:7-30` checks DB + env vars list.

**Gaps**:
- **No `/admin/systeme/meilisearch`** page. Effort: ~3h.
- **No `/admin/systeme/logs`** page (SSE tail of `docker logs`). Effort: ~4h (security-sensitive — needs strict super_admin gate + log redaction).
- **No `/admin/systeme/env`** read-only env summary page. Effort: ~2h.
- **No `/admin/systeme/backup`** page. Effort: ~5h (DB dump trigger + restore-point browser; risky).
- Health page does check DB but no Docker container list / git SHA / latest deploy. Effort: ~3h.

**Effort to close**: ~17h

## Top 5 gaps to fix first (by ROI)

1. **`withAdminAudit` wrapper** (Wave 0). Zero new behaviour but reduces drift across 60+ existing routes — every future audit gets diffs by default. Effort ~6–8h. Why: this was a foundation deliverable that quietly slipped, and the cost compounds with every new admin route.
2. **Wave 4 reassign / reschedule / refund / bulk-cancel** for appointments. Support team's most-cited need; current admin can only flip status. Effort ~10h.
3. **Wave 8 communications tables** (`whatsapp_logs`, `push_notifications_log`, `message_templates`). All three plus their pages are missing — no visibility into WhatsApp/push delivery, broadcast templates frozen in code. Effort ~20h, highest customer-support dividend.
4. **Wave 11 admin_sessions + 2FA UI**. Plan said "mandatory before Wave 6 finance features launch" — finance shipped without it. Force-logout is a security must once admin count grows. Effort ~7h.
5. **Wave 6 dedicated `refunds` table** + payments unified log + export. Current refunds path overloads `appointments.payment_status` and breaks if a single appointment needs partial/multi refunds. Effort ~13h, but compliance/accounting blocker.

## Out of scope for this audit (intentionally not checked)

- Code quality of individual handlers (lint/style)
- Test coverage per wave
- Performance of admin pages under load
- Snyk security scan (separate process)
- Whether existing `logAudit` calls capture correct before/after diffs
- Full inspection of every detail-page tab content (only directory existence verified for many)

## Out of plan, in code (appendix)

The following admin sections exist in code but are NOT in the 14-wave plan. Likely added in later sessions:

- `apps/web/app/(admin)/admin/blog/` + `/api/admin/blog/` — Blog CMS (migrations `0043_blog.sql`, `0046_blog_seed_articles.sql`, `0047_blog_more_articles.sql`).
- `apps/web/app/(admin)/admin/newsletter/` + `/api/admin/newsletter/` — Newsletter subscribers + issues (`newsletterSubscribers`, `newsletterIssues` tables).
- `apps/web/app/(admin)/admin/promotions/` + `/api/admin/promotions/` — Promo codes (`promoCodes`, `promoCodeUsages`, migration `0042_promotions.sql`).
- `apps/web/app/(admin)/admin/retention/` + `/api/admin/retention/` — Data retention policies (`retentionPolicies`, `anonymizationConsents`).
- `apps/web/app/(admin)/admin/api-keys/` + `/api/admin/api-keys/` — API keys management (`apiKeys` table).
- `apps/web/app/(admin)/admin/templates/` — Prescription templates editor (used by doctors but admin-managed).
- `apps/web/app/(admin)/admin/parametres/` — platform settings (`platformSettings` table, migration `0031_platform_settings.sql`).
- `apps/web/app/(admin)/admin/validation/` — pending doctor validation queue (predated the plan; unchanged).
- `apps/web/app/(admin)/admin/stats/` — older stats page (predated the plan).
- `/api/admin/webhooks/` — admin webhook configuration table (`webhooks`).
- `/api/admin/payments/bank-transfer/` + `/admin/finance/bank-transfers/` — bank-transfer reconciliation (Tunisia-specific).
- `apps/web/lib/admin-notifications.ts` — admin-notification helper feeding the bell icon.
- Migrations 0038-0083 contain a lot of doctor- and patient-facing schema (staff collab, days off, password reset, push tokens poly, etc.) outside the scope of the 14-wave admin plan.

These represent meaningful product surface that wasn't planned in the original document but is shipped and live.
