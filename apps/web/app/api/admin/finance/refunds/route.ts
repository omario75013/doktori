import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { logAudit, extractRequestMeta } from "@/lib/admin-audit";
import { db } from "@doktori/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/finance/refunds
 * Returns appointments with payment_status IN ('refund_pending', 'refunded').
 * Joined with patients and doctors.
 */
export async function GET(req: Request) {
  const admin = await requireAdmin(["super_admin", "finance"]);
  if (admin instanceof NextResponse) return admin;

  const { searchParams } = new URL(req.url);
  const statusFilter = searchParams.get("status") ?? null;

  const rows = await db.execute(sql`
    SELECT
      a.id,
      a.payment_status,
      a.payment_amount,
      a.payment_provider,
      a.payment_ref,
      a.starts_at,
      a.updated_at,
      p.id AS patient_id,
      p.name AS patient_name,
      p.phone AS patient_phone,
      d.id AS doctor_id,
      d.name AS doctor_name,
      d.specialty AS doctor_specialty
    FROM appointments a
    JOIN patients p ON p.id = a.patient_id
    JOIN doctors d ON d.id = a.doctor_id
    WHERE a.payment_status IN ('refund_pending', 'refunded')
      ${statusFilter ? sql`AND a.payment_status = ${statusFilter}` : sql``}
    ORDER BY a.updated_at DESC
    LIMIT 100
  `);

  return NextResponse.json({ refunds: rows });
}

/**
 * PATCH /api/admin/finance/refunds
 * Mark an appointment as refunded.
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
