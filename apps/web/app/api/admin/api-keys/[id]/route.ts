import { NextResponse } from "next/server";
import { db, apiKeys } from "@doktori/db";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin-auth";
import { logAudit, extractRequestMeta } from "@/lib/admin-audit";
import type { AdminSession } from "@/lib/admin-auth";

/**
 * DELETE /api/admin/api-keys/[id]
 *
 * Revoke an API key (set active=false, revokedAt=now). Soft revoke — we keep
 * the row for audit/log lineage.
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin(["super_admin"]);
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "ID invalide" }, { status: 400 });
  }

  const [existing] = await db.select().from(apiKeys).where(eq(apiKeys.id, id)).limit(1);
  if (!existing) {
    return NextResponse.json({ error: "Clé introuvable" }, { status: 404 });
  }

  if (!existing.active && existing.revokedAt) {
    return NextResponse.json({ error: "Clé déjà révoquée" }, { status: 409 });
  }

  await db
    .update(apiKeys)
    .set({ active: false, revokedAt: new Date() })
    .where(eq(apiKeys.id, id));

  const meta = extractRequestMeta(req);
  await logAudit({
    actor: admin as AdminSession,
    action: "api_keys.revoke",
    resourceType: "api_key",
    resourceId: id,
    before: { active: existing.active, name: existing.name, prefix: existing.prefix },
    after: { active: false, revokedAt: new Date().toISOString() },
    ip: meta.ip,
    userAgent: meta.userAgent,
  });

  return NextResponse.json({ ok: true });
}
