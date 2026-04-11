import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { logAudit, extractRequestMeta } from "@/lib/admin-audit";
import { db, reviews } from "@doktori/db";
import { eq } from "drizzle-orm";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin(["super_admin", "moderator"]);
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;
  const { status, reason } = await req.json().catch(() => ({}));

  if (!["published", "rejected"].includes(status)) {
    return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
  }

  const [before] = await db.select().from(reviews).where(eq(reviews.id, id)).limit(1);
  if (!before) {
    return NextResponse.json({ error: "Avis introuvable" }, { status: 404 });
  }

  const [updated] = await db
    .update(reviews)
    .set({ status })
    .where(eq(reviews.id, id))
    .returning();

  const meta = extractRequestMeta(req);
  await logAudit({
    actor: admin,
    action: status === "published" ? "reviews.approve" : "reviews.reject",
    resourceType: "reviews",
    resourceId: id,
    before: { status: before.status },
    after: { status: updated.status },
    reason: typeof reason === "string" ? reason : null,
    ip: meta.ip,
    userAgent: meta.userAgent,
  });

  return NextResponse.json(updated);
}
