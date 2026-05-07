import { NextResponse } from "next/server";
import { doctorReferrals } from "@doktori/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { withAdminAudit } from "@/lib/admin-audit-wrapper";

const patchSchema = z
  .object({
    action: z.enum(["validate", "reject", "set_rewards"]),
    reason: z.string().trim().max(500).optional(),
    rewardsEarnedTnd: z.number().min(0).optional(),
  })
  .strict();

type RouteContext = { params: Promise<{ id: string }> };

export const PATCH = withAdminAudit<
  {
    referral: Omit<typeof doctorReferrals.$inferSelect, "validatedAt" | "createdAt"> & {
      validatedAt: string | null;
      createdAt: string;
    };
  },
  RouteContext
>({
  action: ({ body }) => {
    const b = body as { action?: unknown } | null;
    return `doctor_referrals.${b?.action ?? "unknown"}`;
  },
  resourceType: "doctor_referrals",
  allowedRoles: ["super_admin"],
  getResourceId: async (_req, ctx) => (await ctx.params).id,
  getReason: ({ body }) => {
    const b = body as { reason?: unknown } | null;
    return typeof b?.reason === "string" ? b.reason : null;
  },
  getBefore: async ({ tx, resourceId }) => {
    const [row] = await tx
      .select()
      .from(doctorReferrals)
      .where(eq(doctorReferrals.id, resourceId))
      .limit(1);
    if (!row) return null;
    return { status: row.status };
  },
  handler: async ({ tx, admin, resourceId, body }) => {
    const [existing] = await tx
      .select()
      .from(doctorReferrals)
      .where(eq(doctorReferrals.id, resourceId))
      .limit(1);
    if (!existing) {
      return NextResponse.json({ error: "Parrainage introuvable" }, { status: 404 });
    }

    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation échouée" }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};

    if (parsed.data.action === "validate") {
      if (existing.status !== "pending") {
        return NextResponse.json(
          { error: "Seuls les parrainages en attente peuvent être validés" },
          { status: 409 }
        );
      }
      updates.status = "validated";
      updates.validatedAt = new Date();
      updates.validatedByAdmin = admin.id;
      updates.commissionPct = "5.00"; // commission rate fixed at 5%
    } else if (parsed.data.action === "reject") {
      if (existing.status !== "pending") {
        return NextResponse.json(
          { error: "Seuls les parrainages en attente peuvent être rejetés" },
          { status: 409 }
        );
      }
      updates.status = "rejected";
      updates.rejectionReason = parsed.data.reason ?? null;
    } else if (parsed.data.action === "set_rewards") {
      if (existing.status !== "validated") {
        return NextResponse.json(
          {
            error:
              "Seuls les parrainages validés peuvent voir leurs récompenses ajustées",
          },
          { status: 409 }
        );
      }
      updates.rewardsEarnedTnd = String(parsed.data.rewardsEarnedTnd ?? 0);
    }

    const [updated] = await tx
      .update(doctorReferrals)
      .set(updates)
      .where(eq(doctorReferrals.id, resourceId))
      .returning();

    return {
      referral: {
        ...updated,
        validatedAt: updated.validatedAt ? updated.validatedAt.toISOString() : null,
        createdAt: updated.createdAt.toISOString(),
      },
    };
  },
});
