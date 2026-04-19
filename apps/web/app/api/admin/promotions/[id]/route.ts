import { NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin-auth";
import { logAudit, extractRequestMeta } from "@/lib/admin-audit";
import { db, promoCodes, promoCodeUsages, doctors } from "@doktori/db";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin(["super_admin", "finance", "marketing"]);
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;

  const [promo] = await db
    .select()
    .from(promoCodes)
    .where(eq(promoCodes.id, id))
    .limit(1);

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

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin(["super_admin", "finance", "marketing"]);
    if (admin instanceof NextResponse) return admin;

    const { id } = await params;

    const [existing] = await db
      .select()
      .from(promoCodes)
      .where(eq(promoCodes.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Code promo introuvable" }, { status: 404 });
    }

    const body = (await req.json()) as Record<string, unknown>;
    const updates: Partial<typeof promoCodes.$inferInsert> = {};

    if (typeof body.isActive === "boolean") {
      updates.isActive = body.isActive;
    }

    if (body.validFrom !== undefined) {
      const d = new Date(body.validFrom as string);
      if (!isNaN(d.getTime())) updates.validFrom = d;
      else return NextResponse.json({ error: "Date de début invalide." }, { status: 422 });
    }

    if (body.validUntil !== undefined) {
      if (body.validUntil === null) {
        updates.validUntil = null;
      } else {
        const d = new Date(body.validUntil as string);
        if (!isNaN(d.getTime())) updates.validUntil = d;
        else return NextResponse.json({ error: "Date de fin invalide." }, { status: 422 });
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Aucune modification fournie." }, { status: 422 });
    }

    const [updated] = await db
      .update(promoCodes)
      .set(updates)
      .where(eq(promoCodes.id, id))
      .returning();

    const meta = extractRequestMeta(req);
    await logAudit({
      actor: admin,
      action: "promo_code.update",
      resourceType: "promo_codes",
      resourceId: id,
      before: { isActive: existing.isActive, validUntil: existing.validUntil?.toISOString() ?? null },
      after: { isActive: updated.isActive, validUntil: updated.validUntil?.toISOString() ?? null },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return NextResponse.json({
      promoCode: {
        ...updated,
        validFrom: updated.validFrom.toISOString(),
        validUntil: updated.validUntil ? updated.validUntil.toISOString() : null,
        createdAt: updated.createdAt.toISOString(),
      },
    });
  } catch (e) {
    console.error("[PATCH /api//admin/promotions/[id]]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin(["super_admin"]);
    if (admin instanceof NextResponse) return admin;

    const { id } = await params;

    const [existing] = await db
      .select({ id: promoCodes.id, code: promoCodes.code })
      .from(promoCodes)
      .where(eq(promoCodes.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Code promo introuvable" }, { status: 404 });
    }

    // Soft-delete: deactivate
    await db
      .update(promoCodes)
      .set({ isActive: false })
      .where(eq(promoCodes.id, id));

    const meta = extractRequestMeta(req);
    await logAudit({
      actor: admin,
      action: "promo_code.deactivate",
      resourceType: "promo_codes",
      resourceId: id,
      before: { code: existing.code, isActive: true },
      after: { isActive: false },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[DELETE /api//admin/promotions/[id]]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
