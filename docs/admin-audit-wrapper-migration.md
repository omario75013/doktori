# Admin audit wrapper — migration guide

> Closes Gap 1 from `docs/admin-audit-2026-05-06.md`.
> The wrapper itself: `apps/web/lib/admin-audit-wrapper.ts`.

## Why this exists

Every admin mutation route used to look like this:

```ts
export async function PATCH(req: Request, ctx: RouteContext) {
  try {
    const admin = await requireAdmin(["super_admin"]);
    if (admin instanceof NextResponse) return admin;

    const { id } = await ctx.params;
    const body = await req.json();
    // …validate body…

    const [before] = await db.select()...;
    const [after] = await db.update()...;

    const meta = extractRequestMeta(req);
    await logAudit({ actor: admin, action: "...", resourceType: "...", resourceId: id, before, after, ip: meta.ip, userAgent: meta.userAgent });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("...", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
```

Three problems compounded across 60+ routes:

1. **Easy to forget audit calls.** Several routes shipped with no `logAudit()` at all (e.g. `bank-transfer/[id]` — see this PR's migration). The audit guarantee from Wave 0 was effectively opt-in.
2. **Diffs drift.** The "before" snapshot is hand-built per route; the shape varies; some routes capture only a couple of fields, others capture the full row. Comparing audit history across resources is painful.
3. **No transactional guarantee.** A throw between the `update` and the `logAudit` produces a successful mutation with no audit row. A throw inside the audit call (suppressed by `logAudit`) produces a successful mutation with a missing audit row.

The plan called for `withAdminAudit`, a higher-order route handler that:

- runs `requireAdmin` (401/403 short-circuit),
- runs the mutation inside a `db.transaction`, capturing `before`/`after`,
- writes the audit row only when the handler succeeds,
- rolls the transaction back on throw or `NextResponse` early-return (e.g. validation 400).

It's now built. This doc explains how to migrate the remaining ~55 routes one by one.

## Before / after pattern

### Before — hand-rolled

```ts
// apps/web/app/api/admin/foo/[id]/route.ts
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(["super_admin"]);
    if (admin instanceof NextResponse) return admin;

    const { id } = await ctx.params;
    const body = await req.json();

    const [before] = await db.select().from(foos).where(eq(foos.id, id)).limit(1);
    if (!before) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

    const [after] = await db.update(foos).set(body).where(eq(foos.id, id)).returning();

    const meta = extractRequestMeta(req);
    await logAudit({
      actor: admin, action: "foo.update", resourceType: "foos",
      resourceId: id, before, after, ip: meta.ip, userAgent: meta.userAgent,
    });
    return NextResponse.json({ foo: after });
  } catch (e) {
    console.error("[PATCH /api/admin/foo/[id]]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
```

### After — withAdminAudit

```ts
// apps/web/app/api/admin/foo/[id]/route.ts
export const PATCH = withAdminAudit<{ foo: typeof foos.$inferSelect }, RouteContext>({
  action: "foo.update",
  resourceType: "foos",
  allowedRoles: ["super_admin"],
  getResourceId: async (_req, ctx) => (await ctx.params).id,
  getBefore: async ({ tx, resourceId }) => {
    const [row] = await tx.select().from(foos).where(eq(foos.id, resourceId)).limit(1);
    return row ?? null;
  },
  handler: async ({ tx, resourceId, body }) => {
    const before = await tx.select().from(foos).where(eq(foos.id, resourceId)).limit(1);
    if (!before[0]) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
    const [after] = await tx.update(foos).set(body as object).where(eq(foos.id, resourceId)).returning();
    return { foo: after };
  },
});
```

Key shape changes:

- `requireAdmin` + `logAudit` + `try/catch` are gone — the wrapper owns them.
- The handler is given `tx` (a Drizzle transaction) — use it for **all** reads and writes; throwing rolls back automatically.
- The handler can `return NextResponse.json(..., { status: 4xx })` for validation/404 responses; the wrapper rolls back the tx and skips the audit row.
- The handler's plain return value (anything that isn't a NextResponse) is wrapped in `NextResponse.json(...)` and one audit row is written with `before`/`after` populated.

### Choosing `action`

`action` can be a string or `({ req, body }) => string`. Use the function form when the same route handles multiple verbs:

```ts
action: ({ body }) => (body as { mode: string }).mode === "soft"
  ? "doctors.deactivate.soft"
  : "doctors.deactivate.hard",
```

### Capturing reasons

If the body contains a `reason` (e.g. SOS cancel, doctor reject, refund), pass `getReason`:

```ts
getReason: ({ body }) => (body as { reason?: string } | null)?.reason ?? null,
```

This populates `admin_audit_logs.reason` directly — no need to thread it through the handler.

### Routes that already use a transaction

If your route delegates to a lib helper that opens its own transaction (e.g. `confirmBankTransfer`), refactor the helper to accept an optional `tx`. Pattern from `lib/bank-transfer.ts`:

```ts
export async function confirmBankTransfer(args: { ... ; tx?: DbTx }): Promise<void> {
  const run = async (tx: DbTx | typeof db) => { /* ... */ };
  if (args.tx) await run(args.tx);
  else await db.transaction(run);
}
```

The route then passes `tx` through:

```ts
handler: async ({ tx, resourceId, admin }) => {
  await confirmBankTransfer({ intentId: resourceId, adminId: admin.id, tx });
  return { ok: true };
}
```

### Double-audit (template_audit_logs etc.)

For routes that write to a second audit table (e.g. `template_audit_logs`), call the second writer **inside the handler**, before returning. It will be in the same transaction and roll back together with the mutation. Example: `apps/web/app/api/admin/templates/[id]/route.ts`.

## Migrated routes (5 / 61)

Done in this PR:

- [x] `apps/web/app/api/admin/doctors/[id]/route.ts` — `PATCH` + `DELETE`
- [x] `apps/web/app/api/admin/doctors/[id]/verify/route.ts` — `POST`
- [x] `apps/web/app/api/admin/templates/[id]/route.ts` — `PATCH` + `DELETE`
- [x] `apps/web/app/api/admin/payments/bank-transfer/[id]/route.ts` — `PATCH` (also added missing audit calls — was untracked before)

## Routes still to migrate (56)

Each route below currently calls `logAudit()` directly. Migration is mechanical (~1–2 min per route once you've done a couple). The list is generated from `grep -l "logAudit" apps/web/app/api/admin/**/*.ts`:

- `app/api/admin/access/users/route.ts`
- `app/api/admin/access/users/[id]/route.ts`
- `app/api/admin/api-keys/route.ts`
- `app/api/admin/api-keys/[id]/route.ts`
- `app/api/admin/appointments/[id]/resend-reminder/route.ts`
- `app/api/admin/appointments/[id]/status/route.ts`
- `app/api/admin/catalog/cities/route.ts`
- `app/api/admin/catalog/cities/[id]/route.ts`
- `app/api/admin/catalog/specialties/route.ts`
- `app/api/admin/catalog/specialties/[id]/route.ts`
- `app/api/admin/clinics/[id]/route.ts`
- `app/api/admin/clinics/[id]/doctors/route.ts`
- `app/api/admin/clinics/[id]/doctors/[doctorId]/route.ts`
- `app/api/admin/communications/broadcast/route.ts`
- `app/api/admin/doctor-referrals/[id]/route.ts`
- `app/api/admin/doctors/route.ts`
- `app/api/admin/doctors/bulk/route.ts`
- `app/api/admin/doctors/import/route.ts`
- `app/api/admin/doctors/[id]/appointment-types/route.ts`
- `app/api/admin/doctors/[id]/appointment-types/[typeId]/route.ts`
- `app/api/admin/doctors/[id]/home-visit/route.ts`
- `app/api/admin/doctors/[id]/impersonate/route.ts`
- `app/api/admin/doctors/[id]/insurance/route.ts`
- `app/api/admin/doctors/[id]/photo/route.ts`
- `app/api/admin/doctors/[id]/premium/route.ts`
- `app/api/admin/doctors/[id]/premium-badge/route.ts`
- `app/api/admin/doctors/[id]/reset-password/route.ts`
- `app/api/admin/doctors/[id]/schedule/route.ts`
- `app/api/admin/finance/plans/[id]/route.ts`
- `app/api/admin/finance/refunds/route.ts`
- `app/api/admin/finance/subscriptions/[id]/cancel/route.ts`
- `app/api/admin/finance/subscriptions/[id]/extend/route.ts`
- `app/api/admin/patients/[id]/route.ts`
- `app/api/admin/patients/[id]/reset-cancel-count/route.ts`
- `app/api/admin/patients/[id]/reset-noshow/route.ts`
- `app/api/admin/patients/[id]/suspend/route.ts`
- `app/api/admin/patients/[id]/unban/route.ts`
- `app/api/admin/promotions/route.ts`
- `app/api/admin/promotions/[id]/route.ts`
- `app/api/admin/referrals/[id]/route.ts`
- `app/api/admin/retention/[resourceType]/route.ts`
- `app/api/admin/reviews/[id]/route.ts`
- `app/api/admin/reviews/bulk-approve/route.ts`
- `app/api/admin/secretaries/[id]/route.ts`
- `app/api/admin/settings/route.ts`
- `app/api/admin/settings/payments/route.ts`
- `app/api/admin/sos/[id]/route.ts`
- `app/api/admin/sos/[id]/cancel/route.ts`
- `app/api/admin/sos/[id]/complete/route.ts`
- `app/api/admin/sos/[id]/extend/route.ts`
- `app/api/admin/sos/[id]/force-accept/route.ts`
- `app/api/admin/sos/sessions/[id]/route.ts`
- `app/api/admin/system/cron/[name]/run/route.ts`
- `app/api/admin/system/flags/route.ts`
- `app/api/admin/system/flags/[key]/route.ts`
- `app/api/admin/templates/route.ts`
- `app/api/admin/webhooks/route.ts`
- `app/api/admin/webhooks/[id]/route.ts`

## Effort estimate

- ~1–2 min per route for a mechanical rewrite (PATCH/DELETE most common).
- Trickier cases (multi-verb routes, lib helpers with their own transaction): 5–10 min each.
- Total raw effort for all 56: **~2–3h**.

Recommendation: **don't do it in one PR**. Migrate routes opportunistically — every time a route is touched for any other reason, convert it then. The wrapper coexists with the old pattern; both produce the same `admin_audit_logs` rows.

## Verification per migration

For each migrated route:

1. `pnpm --filter web exec tsc --noEmit` — must be clean.
2. If the route has a test (`apps/web/__tests__/api/admin/<resource>/...`), run it.
3. Smoke-test in dev — confirm the response body shape is unchanged (the wrapper wraps the handler's plain return value in `NextResponse.json(...)`; if the old route returned `{ ok: true, foo: x }` and the new handler returns `{ foo: x }`, the response body changed).
