import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { logAudit, extractRequestMeta } from "@/lib/admin-audit";
import { db, catalogSpecialties } from "@doktori/db";
import { asc } from "drizzle-orm";

// GET /api/admin/catalog/specialties — list all specialties
export async function GET(req: Request) {
  const admin = await requireAdmin(["super_admin"]);
  if (admin instanceof NextResponse) return admin;

  const rows = await db
    .select()
    .from(catalogSpecialties)
    .orderBy(asc(catalogSpecialties.displayOrder), asc(catalogSpecialties.label));

  return NextResponse.json({ specialties: rows });
}

// POST /api/admin/catalog/specialties — create a specialty
export async function POST(req: Request) {
  const admin = await requireAdmin(["super_admin"]);
  if (admin instanceof NextResponse) return admin;

  const body = await req.json().catch(() => ({}));
  const { id, label, labelAr, icon, isActive = true, displayOrder = 0 } = body as {
    id?: string;
    label?: string;
    labelAr?: string;
    icon?: string;
    isActive?: boolean;
    displayOrder?: number;
  };

  if (!id || typeof id !== "string" || !/^[a-z0-9-]{1,50}$/.test(id)) {
    return NextResponse.json(
      { error: "L'id doit être en minuscules, chiffres et tirets (max 50 car.)" },
      { status: 400 }
    );
  }
  if (!label || typeof label !== "string" || label.trim().length === 0) {
    return NextResponse.json({ error: "Le libellé est requis" }, { status: 400 });
  }

  const [created] = await db
    .insert(catalogSpecialties)
    .values({
      id: id.trim(),
      label: label.trim(),
      labelAr: labelAr?.trim() ?? null,
      icon: icon?.trim() ?? null,
      isActive: Boolean(isActive),
      displayOrder: Number(displayOrder) || 0,
    })
    .returning();

  const { ip, userAgent } = extractRequestMeta(req);
  await logAudit({
    actor: admin,
    action: "create",
    resourceType: "catalog_specialty",
    resourceId: created.id,
    after: created,
    ip,
    userAgent,
  });

  return NextResponse.json({ specialty: created }, { status: 201 });
}
