import { NextResponse } from "next/server";
import { db, doctorReferrals } from "@doktori/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { logAudit, extractRequestMeta } from "@/lib/admin-audit";

const patchSchema = z
  .object({
    action: z.enum(["validate", "reject", "set_rewards"]),
    reason: z.string().trim().max(500).optional(),
    rewardsEarnedTnd: z.number().min(0).optional(),
  })
  .strict();

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin(["super_admin"]);
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;
  const [existing] = await db
    .select()
    .from(doctorReferrals)
    .where(eq(doctorReferrals.id, id))
    .limit(1);
  if (!existing) {
    return NextResponse.json({ error: "Parrainage introuvable" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
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
        { error: "Seuls les parrainages validés peuvent voir leurs récompenses ajustées" },
        { status: 409 }
      );
    }
    updates.rewardsEarnedTnd = String(parsed.data.rewardsEarnedTnd ?? 0);
  }

  const [updated] = await db
    .update(doctorReferrals)
    .set(updates)
    .where(eq(doctorReferrals.id, id))
    .returning();

  const meta = extractRequestMeta(req);
  await logAudit({
    actor: admin,
    action: `doctor_referrals.${parsed.data.action}`,
    resourceType: "doctor_referrals",
    resourceId: id,
    before: { status: existing.status },
    after: { status: updated.status },
    ip: meta.ip,
    userAgent: meta.userAgent,
  });

  return NextResponse.json({
    referral: {
      ...updated,
      validatedAt: updated.validatedAt ? updated.validatedAt.toISOString() : null,
      createdAt: updated.createdAt.toISOString(),
    },
  });
}
