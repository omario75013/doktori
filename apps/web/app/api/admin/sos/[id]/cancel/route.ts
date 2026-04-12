import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { logAudit, extractRequestMeta } from "@/lib/admin-audit";
import { db } from "@doktori/db";
import { sql } from "drizzle-orm";
import { closePhoneProxy } from "@/lib/phone-proxy";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin(["super_admin", "support"]);
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;
  const body = await req.json() as { reason?: string };
  const reason = body.reason ?? "Annulé par l'administration";

  const result = await db.execute(sql`
    UPDATE sos_sessions
    SET
      status       = 'cancelled',
      cancelled_at = NOW(),
      cancelled_by = 'admin',
      cancel_reason = ${reason},
      resolution   = 'cancelled_by_admin'
    WHERE id = ${id} AND status IN ('pending', 'accepted')
    RETURNING id, status AS old_status
  `);

  const updated = (result as unknown as Array<{ id: string; old_status: string }>)[0];
  if (!updated) {
    return NextResponse.json(
      { error: "Session non annulable (déjà terminée ou introuvable)" },
      { status: 409 }
    );
  }

  // Close phone proxy if one was active (best effort)
  try {
    await closePhoneProxy(id);
  } catch (e) {
    console.error("[SOS-ADMIN-CANCEL] closePhoneProxy failed:", e);
  }

  const meta = extractRequestMeta(req);
  await logAudit({
    actor: admin,
    action: "sos.admin_cancel",
    resourceType: "sos_sessions",
    resourceId: id,
    before: { status: updated.old_status },
    after: { status: "cancelled", cancelledBy: "admin", cancelReason: reason, resolution: "cancelled_by_admin" },
    ip: meta.ip,
    userAgent: meta.userAgent,
  });

  return NextResponse.json({ ok: true });
}
