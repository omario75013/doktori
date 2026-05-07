import { NextResponse } from "next/server";
import { withAdminAudit } from "@/lib/admin-audit-wrapper";
import { reviews } from "@doktori/db";
import { eq } from "drizzle-orm";

type RouteContext = { params: Promise<{ id: string }> };

export const PATCH = withAdminAudit<typeof reviews.$inferSelect, RouteContext>({
  action: ({ body }) => {
    const b = body as { action?: unknown } | null;
    return b?.action === "publish" ? "reviews.approve" : "reviews.reject";
  },
  resourceType: "reviews",
  allowedRoles: ["super_admin", "moderator"],
  getResourceId: async (_req, ctx) => (await ctx.params).id,
  getReason: ({ body }) => {
    const b = body as { action?: unknown; rejectionReason?: unknown } | null;
    return b?.action === "reject" && typeof b.rejectionReason === "string"
      ? b.rejectionReason
      : null;
  },
  getBefore: async ({ tx, resourceId }) => {
    const [row] = await tx.select().from(reviews).where(eq(reviews.id, resourceId)).limit(1);
    if (!row) return null;
    return { status: row.status, rejectionReason: row.rejectionReason };
  },
  handler: async ({ tx, admin, resourceId, body }) => {
    const b = (body ?? {}) as { action?: string; rejectionReason?: string };
    const { action, rejectionReason } = b;

    if (!action || !["publish", "reject"].includes(action)) {
      return NextResponse.json({ error: "Action invalide" }, { status: 400 });
    }

    if (action === "reject" && (!rejectionReason || typeof rejectionReason !== "string")) {
      return NextResponse.json({ error: "Motif de rejet requis" }, { status: 400 });
    }

    const [before] = await tx.select().from(reviews).where(eq(reviews.id, resourceId)).limit(1);
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

    const [updated] = await tx
      .update(reviews)
      .set(updateValues)
      .where(eq(reviews.id, resourceId))
      .returning();

    return updated;
  },
});
