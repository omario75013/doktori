import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { logAudit, extractRequestMeta } from "@/lib/admin-audit";
import { db } from "@doktori/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin(["super_admin", "support"]);
    if (admin instanceof NextResponse) return admin;

    const { id } = await params;

    const result = await db.execute(sql`
      UPDATE sos_sessions
      SET
        status       = 'completed',
        completed_at = NOW(),
        resolution   = 'completed'
      WHERE id = ${id} AND status = 'accepted'
      RETURNING id
    `);

    const updated = (result as unknown as Array<{ id: string }>)[0];
    if (!updated) {
      return NextResponse.json(
        { error: "Session non acceptée ou introuvable" },
        { status: 409 }
      );
    }

    const meta = extractRequestMeta(req);
    await logAudit({
      actor: admin,
      action: "sos.admin_complete",
      resourceType: "sos_sessions",
      resourceId: id,
      before: { status: "accepted" },
      after: { status: "completed", resolution: "completed" },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[POST /api//admin/sos/[id]/complete]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
