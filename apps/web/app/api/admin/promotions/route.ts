import { NextResponse } from "next/server";
import { eq, desc, sql } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin-auth";
import { logAudit, extractRequestMeta } from "@/lib/admin-audit";
import { db, promoCodes, promoCodeUsages, adminUsers } from "@doktori/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const admin = await requireAdmin(["super_admin", "finance", "marketing"]);
  if (admin instanceof NextResponse) return admin;

  const rows = await db
    .select({
      id: promoCodes.id,
      code: promoCodes.code,
      type: promoCodes.type,
      value: promoCodes.value,
      target: promoCodes.target,
      maxUses: promoCodes.maxUses,
      currentUses: promoCodes.currentUses,
      validFrom: promoCodes.validFrom,
      validUntil: promoCodes.validUntil,
      isActive: promoCodes.isActive,
      createdBy: promoCodes.createdBy,
      createdAt: promoCodes.createdAt,
    })
    .from(promoCodes)
    .orderBy(desc(promoCodes.createdAt));

  return NextResponse.json({
    promoCodes: rows.map((r: typeof rows[number]) => ({
      ...r,
      validFrom: r.validFrom.toISOString(),
      validUntil: r.validUntil ? r.validUntil.toISOString() : null,
      createdAt: r.createdAt.toISOString(),
    })),
  });
}

export async function POST(req: Request) {
  const admin = await requireAdmin(["super_admin", "finance", "marketing"]);
  if (admin instanceof NextResponse) return admin;

  const body = (await req.json()) as Record<string, unknown>;
  const { code, type, value, target, maxUses, validFrom, validUntil } = body;

  if (
    typeof code !== "string" ||
    !code.trim() ||
    code.length > 30
  ) {
    return NextResponse.json({ error: "Le code doit être une chaîne de 1 à 30 caractères." }, { status: 422 });
  }

  if (!["percentage", "fixed_amount", "free_months"].includes(type as string)) {
    return NextResponse.json(
      { error: "Le type doit être 'percentage', 'fixed_amount' ou 'free_months'." },
      { status: 422 }
    );
  }

  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    return NextResponse.json({ error: "La valeur doit être un entier positif." }, { status: 422 });
  }

  if (type === "percentage" && (value < 0 || value > 100)) {
    return NextResponse.json({ error: "Le pourcentage doit être entre 0 et 100." }, { status: 422 });
  }

  if (target !== undefined && !["subscription", "teleconsult"].includes(target as string)) {
    return NextResponse.json({ error: "La cible doit être 'subscription' ou 'teleconsult'." }, { status: 422 });
  }

  const validFromDate = validFrom ? new Date(validFrom as string) : new Date();
  const validUntilDate = validUntil ? new Date(validUntil as string) : null;

  if (isNaN(validFromDate.getTime())) {
    return NextResponse.json({ error: "Date de début invalide." }, { status: 422 });
  }
  if (validUntilDate && isNaN(validUntilDate.getTime())) {
    return NextResponse.json({ error: "Date de fin invalide." }, { status: 422 });
  }

  const maxUsesVal =
    typeof maxUses === "number" && Number.isInteger(maxUses) && maxUses > 0
      ? maxUses
      : null;

  const [inserted] = await db
    .insert(promoCodes)
    .values({
      code: (code as string).trim().toUpperCase(),
      type: type as string,
      value: value as number,
      target: (target as string | undefined) ?? "subscription",
      maxUses: maxUsesVal,
      validFrom: validFromDate,
      validUntil: validUntilDate,
      createdBy: admin.id,
    })
    .returning();

  const meta = extractRequestMeta(req);
  await logAudit({
    actor: admin,
    action: "promo_code.create",
    resourceType: "promo_codes",
    resourceId: inserted.id,
    after: { code: inserted.code, type: inserted.type, value: inserted.value },
    ip: meta.ip,
    userAgent: meta.userAgent,
  });

  return NextResponse.json(
    {
      promoCode: {
        ...inserted,
        validFrom: inserted.validFrom.toISOString(),
        validUntil: inserted.validUntil ? inserted.validUntil.toISOString() : null,
        createdAt: inserted.createdAt.toISOString(),
      },
    },
    { status: 201 }
  );
}
