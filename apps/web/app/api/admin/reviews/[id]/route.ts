import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { logAudit, extractRequestMeta } from "@/lib/admin-audit";
import { db, reviews } from "@doktori/db";
import { eq } from "drizzle-orm";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin(["super_admin", "moderator"]);
    if (admin instanceof NextResponse) return admin;

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { action, rejectionReason } = body as {
      action?: string;
      rejectionReason?: string;
    };

    if (!action || !["publish", "reject"].includes(action)) {
      return NextResponse.json({ error: "Action invalide" }, { status: 400 });
    }

    if (action === "reject" && (!rejectionReason || typeof rejectionReason !== "string")) {
      return NextResponse.json({ error: "Motif de rejet requis" }, { status: 400 });
    }

    const [before] = await db.select().from(reviews).where(eq(reviews.id, id)).limit(1);
    if (!before) {
      return NextResponse.json({ error: "Avis introuvable" }, { status: 404 });
    }

    const now = new Date();
    const updateValues =
      action === "publish"
        ? {
            status: "published" as const,
            moderatedBy: admin.id,
            moderatedAt: now,
            rejectionReason: null,
          }
        : {
            status: "rejected" as const,
            moderatedBy: admin.id,
            moderatedAt: now,
            rejectionReason: rejectionReason!,
          };

    const [updated] = await db
      .update(reviews)
      .set(updateValues)
      .where(eq(reviews.id, id))
      .returning();

    const meta = extractRequestMeta(req);
    await logAudit({
      actor: admin,
      action: action === "publish" ? "reviews.approve" : "reviews.reject",
      resourceType: "reviews",
      resourceId: id,
      before: { status: before.status, rejectionReason: before.rejectionReason },
      after: { status: updated.status, rejectionReason: updated.rejectionReason },
      reason: action === "reject" ? rejectionReason : null,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return NextResponse.json(updated);
  } catch (e) {
    console.error("[PATCH /api//admin/reviews/[id]]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
