import { NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin-auth";
import { withAdminAudit } from "@/lib/admin-audit-wrapper";
import { db, promoCodes, promoCodeUsages, doctors } from "@doktori/db";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteContext) {
  const admin = await requireAdmin(["super_admin", "finance", "marketing"]);
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;

  const [promo] = await db.select().from(promoCodes).where(eq(promoCodes.id, id)).limit(1);

  if (!promo) {
    return NextResponse.json({ error: "Code promo introuvable" }, { status: 404 });
  }

  const usages = await db
    .select({
      id: promoCodeUsages.id,
      doctorId: promoCodeUsages.doctorId,
      doctorName: doctors.name,
      appliedTo: promoCodeUsages.appliedTo,
      discountAmount: promoCodeUsages.discountAmount,
      createdAt: promoCodeUsages.createdAt,
    })
    .from(promoCodeUsages)
    .innerJoin(doctors, eq(promoCodeUsages.doctorId, doctors.id))
    .where(eq(promoCodeUsages.promoCodeId, id))
    .orderBy(desc(promoCodeUsages.createdAt));

  return NextResponse.json({
    promoCode: {
      ...promo,
      validFrom: promo.validFrom.toISOString(),
      validUntil: promo.validUntil ? promo.validUntil.toISOString() : null,
      createdAt: promo.createdAt.toISOString(),
    },
    usages: usages.map((u: typeof usages[number]) => ({
      ...u,
      createdAt: u.createdAt.toISOString(),
    })),
  });
}

export const PATCH = withAdminAudit<
  {
    promoCode: Omit<
      typeof promoCodes.$inferSelect,
      "validFrom" | "validUntil" | "createdAt"
    > & {
      validFrom: string;
      validUntil: string | null;
      createdAt: string;
    };
  },
  RouteContext
>({
  action: "promo_code.update",
  resourceType: "promo_codes",
  allowedRoles: ["super_admin", "finance", "marketing"],
  getResourceId: async (_req, ctx) => (await ctx.params).id,
  getBefore: async ({ tx, resourceId }) => {
    const [row] = await tx
      .select()
      .from(promoCodes)
      .where(eq(promoCodes.id, resourceId))
      .limit(1);
    if (!row) return null;
    return { isActive: row.isActive, validUntil: row.validUntil?.toISOString() ?? null };
  },
  handler: async ({ tx, resourceId, body }) => {
    const [existing] = await tx
      .select()
      .from(promoCodes)
      .where(eq(promoCodes.id, resourceId))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Code promo introuvable" }, { status: 404 });
    }

    const b = (body ?? {}) as Record<string, unknown>;
    const updates: Partial<typeof promoCodes.$inferInsert> = {};

    if (typeof b.isActive === "boolean") {
      updates.isActive = b.isActive;
    }

    if (b.validFrom !== undefined) {
      const d = new Date(b.validFrom as string);
      if (!isNaN(d.getTime())) updates.validFrom = d;
      else return NextResponse.json({ error: "Date de début invalide." }, { status: 422 });
    }

    if (b.validUntil !== undefined) {
      if (b.validUntil === null) {
        updates.validUntil = null;
      } else {
        const d = new Date(b.validUntil as string);
        if (!isNaN(d.getTime())) updates.validUntil = d;
        else return NextResponse.json({ error: "Date de fin invalide." }, { status: 422 });
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Aucune modification fournie." }, { status: 422 });
    }

    const [updated] = await tx
      .update(promoCodes)
      .set(updates)
      .where(eq(promoCodes.id, resourceId))
      .returning();

    return {
      promoCode: {
        ...updated,
        validFrom: updated.validFrom.toISOString(),
        validUntil: updated.validUntil ? updated.validUntil.toISOString() : null,
        createdAt: updated.createdAt.toISOString(),
      },
    };
  },
});

export const DELETE = withAdminAudit<{ ok: true }, RouteContext>({
  action: "promo_code.deactivate",
  resourceType: "promo_codes",
  allowedRoles: ["super_admin"],
  getResourceId: async (_req, ctx) => (await ctx.params).id,
  getBefore: async ({ tx, resourceId }) => {
    const [row] = await tx
      .select({ code: promoCodes.code, isActive: promoCodes.isActive })
      .from(promoCodes)
      .where(eq(promoCodes.id, resourceId))
      .limit(1);
    return row ?? null;
  },
  handler: async ({ tx, resourceId }) => {
    const [existing] = await tx
      .select({ id: promoCodes.id, code: promoCodes.code })
      .from(promoCodes)
      .where(eq(promoCodes.id, resourceId))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Code promo introuvable" }, { status: 404 });
    }

    // Soft-delete: deactivate
    await tx
      .update(promoCodes)
      .set({ isActive: false })
      .where(eq(promoCodes.id, resourceId));

    return { ok: true } as const;
  },
});
