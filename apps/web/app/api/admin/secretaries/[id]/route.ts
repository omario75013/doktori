import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin-auth";
import { logAudit, extractRequestMeta } from "@/lib/admin-audit";
import { db, secretaries } from "@doktori/db";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin(["super_admin"]);
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;
  const [existing] = await db.select().from(secretaries).where(eq(secretaries.id, id)).limit(1);
  if (!existing) return NextResponse.json({ error: "Secrétaire introuvable" }, { status: 404 });

  const body = (await req.json()) as Record<string, unknown>;

  if (typeof body.isActive !== "boolean") {
    return NextResponse.json({ error: "isActive (boolean) requis" }, { status: 400 });
  }

  const [updated] = await db
    .update(secretaries)
    .set({ isActive: body.isActive })
    .where(eq(secretaries.id, id))
    .returning();

  const meta = extractRequestMeta(req);
  await logAudit({
    actor: admin,
    action: body.isActive ? "secretaries.activate" : "secretaries.suspend",
    resourceType: "secretaries",
    resourceId: id,
    before: { isActive: existing.isActive },
    after: { isActive: updated.isActive },
    ip: meta.ip,
    userAgent: meta.userAgent,
  });

  return NextResponse.json({
    secretary: { ...updated, createdAt: updated.createdAt.toISOString() },
  });
}
