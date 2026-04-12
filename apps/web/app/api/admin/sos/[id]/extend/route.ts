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
  const admin = await requireAdmin(["super_admin", "support"]);
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;

  const result = await db.execute(sql`
    UPDATE sos_sessions
    SET expires_at = expires_at + INTERVAL '15 minutes'
    WHERE id = ${id} AND status = 'pending'
    RETURNING id, expires_at
  `);

  const updated = (result as unknown as Array<{ id: string; expires_at: string }>)[0];
  if (!updated) {
    return NextResponse.json(
      { error: "Session non en attente ou introuvable" },
      { status: 409 }
    );
  }

  const meta = extractRequestMeta(req);
  await logAudit({
    actor: admin,
    action: "sos.extend_expiry",
    resourceType: "sos_sessions",
    resourceId: id,
    before: null,
    after: { expiresAt: updated.expires_at },
    ip: meta.ip,
    userAgent: meta.userAgent,
  });

  return NextResponse.json({ ok: true, expiresAt: updated.expires_at });
}
