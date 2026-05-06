import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { reviewReplies } from "@doktori/db";
import { withAdminAudit } from "@/lib/admin-audit-wrapper";

const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve") }),
  z.object({ action: z.literal("reject"), rejectionReason: z.string().min(3).max(500) }),
]);

type Ctx = { params: Promise<{ id: string }> };

/**
 * PATCH /api/admin/review-replies/[id]
 *
 * Admin (super_admin or moderator) approves or rejects a doctor's reply.
 * Audited via withAdminAudit.
 */
export const PATCH = withAdminAudit({
  action: "review_replies.moderate",
  resourceType: "review_replies",
  allowedRoles: ["super_admin", "moderator"],
  getResourceId: async (_req, ctx: Ctx) => (await ctx.params).id,
  getBefore: async ({ tx, resourceId }) => {
    const [row] = await tx
      .select()
      .from(reviewReplies)
      .where(eq(reviewReplies.id, resourceId))
      .limit(1);
    return row;
  },
  getReason: ({ body }) => {
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) return null;
    return parsed.data.action === "reject" ? parsed.data.rejectionReason : null;
  },
  handler: async ({ tx, admin, resourceId, body }) => {
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const updates =
      parsed.data.action === "approve"
        ? {
            status: "approved" as const,
            moderatedBy: admin.id,
            moderatedAt: new Date(),
            rejectionReason: null,
          }
        : {
            status: "rejected" as const,
            moderatedBy: admin.id,
            moderatedAt: new Date(),
            rejectionReason: parsed.data.rejectionReason,
          };

    const [updated] = await tx
      .update(reviewReplies)
      .set(updates)
      .where(eq(reviewReplies.id, resourceId))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Réponse introuvable" }, { status: 404 });
    }
    return updated;
  },
});
