import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { logAudit, extractRequestMeta } from "@/lib/admin-audit";
import { db } from "@doktori/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/finance/refunds
 *
 * Wave 6 — reads from the `refunds` table joined with appointments + patients + doctors.
 * Backwards-compat: also includes appointments with payment_status IN ('refund_pending','refunded')
 * that don't have a matching `refunds` row yet (data migration is out of scope).
 *
 * The shape of each row mirrors the legacy contract so the existing UI keeps working:
 *   { id, payment_status, payment_amount, payment_provider, payment_ref,
 *     starts_at, updated_at, patient_id, patient_name, patient_phone,
 *     doctor_id, doctor_name, doctor_specialty }
 *
 * Where:
 *   - id is the appointment id (legacy) for back-compat with the existing PATCH handler
 *   - payment_status is derived from the refund.status when a row exists, else from
 *     appointments.payment_status
 */
export async function GET(req: Request) {
  const admin = await requireAdmin(["super_admin", "finance"]);
  if (admin instanceof NextResponse) return admin;

  const { searchParams } = new URL(req.url);
  const statusFilter = searchParams.get("status") ?? null;

  // Map UI status → DB status for the new refunds table:
  //   refund_pending → pending|processing
  //   refunded       → succeeded
  const refundStatusInClause =
    statusFilter === "refund_pending"
      ? sql`AND r.status IN ('pending','processing')`
      : statusFilter === "refunded"
        ? sql`AND r.status = 'succeeded'`
        : sql``;

  const apptStatusInClause =
    statusFilter === "refund_pending"
      ? sql`AND a.payment_status = 'refund_pending'`
      : statusFilter === "refunded"
        ? sql`AND a.payment_status = 'refunded'`
        : sql``;

  // Source 1: rows in the new refunds table (authoritative).
  // Source 2 (back-compat): legacy appointments with refund flag but NO refund row.
  const rows = await db.execute(sql`
    SELECT
      a.id                      AS id,
      CASE
        WHEN r.status = 'succeeded' THEN 'refunded'
        WHEN r.status IN ('pending','processing') THEN 'refund_pending'
        ELSE 'refund_pending'
      END                       AS payment_status,
      r.amount                  AS payment_amount,
      r.provider                AS payment_provider,
      r.original_payment_ref    AS payment_ref,
      a.starts_at               AS starts_at,
      r.updated_at              AS updated_at,
      p.id                      AS patient_id,
      p.name                    AS patient_name,
      p.phone                   AS patient_phone,
      d.id                      AS doctor_id,
      d.name                    AS doctor_name,
      d.specialty               AS doctor_specialty,
      r.id                      AS refund_id,
      r.status                  AS refund_status
    FROM refunds r
    JOIN appointments a ON a.id = r.source_id AND r.source_type = 'appointment'
    JOIN patients p ON p.id = a.patient_id
    JOIN doctors d ON d.id = a.doctor_id
    WHERE 1=1
      ${refundStatusInClause}

    UNION ALL

    SELECT
      a.id                      AS id,
      a.payment_status          AS payment_status,
      a.payment_amount          AS payment_amount,
      a.payment_provider        AS payment_provider,
      a.payment_ref             AS payment_ref,
      a.starts_at               AS starts_at,
      a.updated_at              AS updated_at,
      p.id                      AS patient_id,
      p.name                    AS patient_name,
      p.phone                   AS patient_phone,
      d.id                      AS doctor_id,
      d.name                    AS doctor_name,
      d.specialty               AS doctor_specialty,
      NULL                      AS refund_id,
      NULL                      AS refund_status
    FROM appointments a
    JOIN patients p ON p.id = a.patient_id
    JOIN doctors d ON d.id = a.doctor_id
    WHERE a.payment_status IN ('refund_pending', 'refunded')
      AND NOT EXISTS (
        SELECT 1 FROM refunds r2
        WHERE r2.source_type = 'appointment' AND r2.source_id = a.id
      )
      ${apptStatusInClause}

    ORDER BY updated_at DESC NULLS LAST
    LIMIT 200
  `);

  return NextResponse.json({ refunds: rows });
}

/**
 * PATCH /api/admin/finance/refunds
 * Mark an appointment as refunded (manual confirmation for non-Stripe flows).
 * Updates BOTH the legacy appointments.payment_status AND the refunds row.
 *
 * Body: { appointmentId: string }
 */
export async function PATCH(req: Request) {
  const admin = await requireAdmin(["super_admin", "finance"]);
  if (admin instanceof NextResponse) return admin;

  let body: { appointmentId?: string };
  try {
    body = (await req.json()) as { appointmentId?: string };
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 });
  }

  const { appointmentId } = body;
  if (!appointmentId) {
    return NextResponse.json({ error: "appointmentId requis" }, { status: 400 });
  }

  const [before] = await db.execute(sql`
    SELECT id, payment_status, payment_amount FROM appointments WHERE id = ${appointmentId} LIMIT 1
  `) as unknown as [{ id: string; payment_status: string; payment_amount: number } | undefined];

  if (!before) {
    return NextResponse.json({ error: "Rendez-vous introuvable" }, { status: 404 });
  }
  if (before.payment_status !== "refund_pending") {
    return NextResponse.json(
      { error: "Ce remboursement ne peut pas être marqué comme effectué depuis son état actuel" },
      { status: 409 }
    );
  }

  await db.execute(sql`
    UPDATE appointments
    SET payment_status = 'refunded', updated_at = NOW()
    WHERE id = ${appointmentId}
  `);

  // Wave 6 — flip the matching refunds row(s) to succeeded if any are still pending.
  await db.execute(sql`
    UPDATE refunds
    SET status = 'succeeded',
        succeeded_at = COALESCE(succeeded_at, NOW()),
        updated_at = NOW()
    WHERE source_type = 'appointment'
      AND source_id = ${appointmentId}
      AND status IN ('pending','processing')
  `);

  const meta = extractRequestMeta(req);
  await logAudit({
    actor: admin,
    action: "finance.refund_confirmed",
    resourceType: "appointments",
    resourceId: appointmentId,
    before: { payment_status: before.payment_status },
    after: { payment_status: "refunded" },
    ip: meta.ip,
    userAgent: meta.userAgent,
  });

  return NextResponse.json({ ok: true });
}
