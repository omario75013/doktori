import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { logAudit, extractRequestMeta } from "@/lib/admin-audit";
import { db, catalogCities } from "@doktori/db";
import { asc } from "drizzle-orm";

// GET /api/admin/catalog/cities — list all cities
export async function GET(req: Request) {
  const admin = await requireAdmin(["super_admin"]);
  if (admin instanceof NextResponse) return admin;

  const rows = await db
    .select()
    .from(catalogCities)
    .orderBy(asc(catalogCities.displayOrder), asc(catalogCities.label));

  return NextResponse.json({ cities: rows });
}

// POST /api/admin/catalog/cities — create a city
export async function POST(req: Request) {
  const admin = await requireAdmin(["super_admin"]);
  if (admin instanceof NextResponse) return admin;

  const body = await req.json().catch(() => ({}));
  const { id, label, labelAr, latitude, longitude, isActive = true, displayOrder = 0 } = body as {
    id?: string;
    label?: string;
    labelAr?: string;
    latitude?: string;
    longitude?: string;
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
    .insert(catalogCities)
    .values({
      id: id.trim(),
      label: label.trim(),
      labelAr: labelAr?.trim() ?? null,
      latitude: latitude?.trim() ?? null,
      longitude: longitude?.trim() ?? null,
      isActive: Boolean(isActive),
      displayOrder: Number(displayOrder) || 0,
    })
    .returning();

  const { ip, userAgent } = extractRequestMeta(req);
  await logAudit({
    actor: admin,
    action: "create",
    resourceType: "catalog_city",
    resourceId: created.id,
    after: created,
    ip,
    userAgent,
  });

  return NextResponse.json({ city: created }, { status: 201 });
}
