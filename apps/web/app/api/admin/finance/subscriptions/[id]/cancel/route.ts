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
  const admin = await requireAdmin(["super_admin", "finance"]);
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;

  const beforeResult = await db.execute(sql`
    SELECT id, status FROM subscriptions WHERE id = ${id} LIMIT 1
  `);
  const before = (beforeResult as unknown as Record<string, unknown>[])[0];
  if (!before) {
    return NextResponse.json({ error: "Abonnement introuvable" }, { status: 404 });
  }
  if (before.status === "cancelled") {
    return NextResponse.json({ error: "Abonnement déjà annulé." }, { status: 409 });
  }

  const updateResult = await db.execute(sql`
    UPDATE subscriptions
    SET
      status       = 'cancelled',
      cancelled_at = NOW(),
      updated_at   = NOW()
    WHERE id = ${id}
    RETURNING id, status, cancelled_at
  `);

  const updated = (updateResult as unknown as Record<string, unknown>[])[0];

  const meta = extractRequestMeta(req);
  await logAudit({
    actor: admin,
    action: "subscription.cancel",
    resourceType: "subscriptions",
    resourceId: id,
    before: { status: before.status },
    after: { status: "cancelled", cancelledAt: updated?.cancelled_at },
    ip: meta.ip,
    userAgent: meta.userAgent,
  });

  return NextResponse.json({ ok: true, subscription: updated });
}
