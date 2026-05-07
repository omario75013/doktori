import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { withAdminAudit } from "@/lib/admin-audit-wrapper";
import { db } from "@doktori/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/finance/refunds
 *
 * Wave 6 — reads from the `refunds` table joined with appointments + patients + doctors.
 * Backwards-compat: also includes appointments with payment_status IN ('refund_pending','refunded')
 * that don't have a matching `refunds` row yet (data migration is out of scope).
 */
export async function GET(req: Request) {
  const admin = await requireAdmin(["super_admin", "finance"]);
  if (admin instanceof NextResponse) return admin;

  const { searchParams } = new URL(req.url);
  const statusFilter = searchParams.get("status") ?? null;

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
 * Body: { appointmentId: string }
 */
export const PATCH = withAdminAudit<{ ok: true }, unknown>({
  action: "finance.refund_confirmed",
  resourceType: "appointments",
  allowedRoles: ["super_admin", "finance"],
  getResourceId: async (req, _ctx) => {
    try {
      const b = (await req.clone().json()) as { appointmentId?: string };
      return typeof b.appointmentId === "string" ? b.appointmentId : "";
    } catch {
      return "";
    }
  },
  handler: async ({ tx, body }) => {
    const b = (body ?? {}) as { appointmentId?: string };
    const { appointmentId } = b;
    if (!appointmentId) {
      return NextResponse.json({ error: "appointmentId requis" }, { status: 400 });
    }

    const beforeRows = (await tx.execute(sql`
      SELECT id, payment_status, payment_amount FROM appointments WHERE id = ${appointmentId} LIMIT 1
    `)) as unknown as Array<{ id: string; payment_status: string; payment_amount: number }>;
    const before = beforeRows[0];

    if (!before) {
      return NextResponse.json({ error: "Rendez-vous introuvable" }, { status: 404 });
    }
    if (before.payment_status !== "refund_pending") {
      return NextResponse.json(
        {
          error:
            "Ce remboursement ne peut pas être marqué comme effectué depuis son état actuel",
        },
        { status: 409 }
      );
    }

    await tx.execute(sql`
      UPDATE appointments
      SET payment_status = 'refunded', updated_at = NOW()
      WHERE id = ${appointmentId}
    `);

    await tx.execute(sql`
      UPDATE refunds
      SET status = 'succeeded',
          succeeded_at = COALESCE(succeeded_at, NOW()),
          updated_at = NOW()
      WHERE source_type = 'appointment'
        AND source_id = ${appointmentId}
        AND status IN ('pending','processing')
    `);

    return { ok: true } as const;
  },
});
