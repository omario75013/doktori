import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { logAudit, extractRequestMeta } from "@/lib/admin-audit";
import { db, webhooks } from "@doktori/db";
import { eq } from "drizzle-orm";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin(["super_admin"]);
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;
  const body = (await req.json()) as { isActive?: boolean; url?: string; events?: string[] };

  const [existing] = await db.select().from(webhooks).where(eq(webhooks.id, id)).limit(1);
  if (!existing) {
    return NextResponse.json({ error: "Webhook introuvable" }, { status: 404 });
  }

  const updates: Partial<typeof webhooks.$inferInsert> = {};
  if (typeof body.isActive === "boolean") updates.isActive = body.isActive;
  if (body.url) {
    try {
      new URL(body.url);
      updates.url = body.url;
    } catch {
      return NextResponse.json({ error: "URL invalide" }, { status: 400 });
    }
  }
  if (Array.isArray(body.events)) updates.events = body.events;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Aucune modification" }, { status: 400 });
  }

  const [updated] = await db
    .update(webhooks)
    .set(updates)
    .where(eq(webhooks.id, id))
    .returning();

  const meta = extractRequestMeta(req);
  await logAudit({
    actor: admin,
    action: "webhooks.update",
    resourceType: "webhooks",
    resourceId: id,
    before: { isActive: existing.isActive, url: existing.url, events: existing.events },
    after: updates,
    ip: meta.ip,
    userAgent: meta.userAgent,
  });

  return NextResponse.json({ webhook: updated });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin(["super_admin"]);
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;
  const [existing] = await db.select().from(webhooks).where(eq(webhooks.id, id)).limit(1);
  if (!existing) {
    return NextResponse.json({ error: "Webhook introuvable" }, { status: 404 });
  }

  await db.delete(webhooks).where(eq(webhooks.id, id));

  const meta = extractRequestMeta(req);
  await logAudit({
    actor: admin,
    action: "webhooks.delete",
    resourceType: "webhooks",
    resourceId: id,
    before: { url: existing.url, events: existing.events },
    after: null,
    ip: meta.ip,
    userAgent: meta.userAgent,
  });

  return NextResponse.json({ ok: true });
}
