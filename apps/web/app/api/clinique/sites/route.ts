import { NextRequest, NextResponse } from "next/server";
import { db, clinicSites } from "@doktori/db";
import { eq, asc, desc, and } from "drizzle-orm";
import { requireClinic } from "@/lib/clinic-auth";
import { logClinicAudit } from "@/lib/audit";

// GET /api/clinique/sites — list all sites for the clinic
export async function GET() {
  const clinic = await requireClinic();
  if (clinic instanceof NextResponse) return clinic;

  const sites = await db
    .select()
    .from(clinicSites)
    .where(eq(clinicSites.clinicId, clinic.id))
    .orderBy(desc(clinicSites.isPrimary), asc(clinicSites.name));

  return NextResponse.json({ sites });
}

// POST /api/clinique/sites — create a new site
export async function POST(req: NextRequest) {
  const clinic = await requireClinic();
  if (clinic instanceof NextResponse) return clinic;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }

  const { name, address, city, phone, isPrimary } = body as Record<string, unknown>;

  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Le nom est obligatoire" }, { status: 400 });
  }
  if (typeof address !== "string" || !address.trim()) {
    return NextResponse.json({ error: "L'adresse est obligatoire" }, { status: 400 });
  }
  if (typeof city !== "string" || !city.trim()) {
    return NextResponse.json({ error: "La ville est obligatoire" }, { status: 400 });
  }

  // If setting as primary, clear other primaries first
  if (isPrimary === true) {
    await db
      .update(clinicSites)
      .set({ isPrimary: false })
      .where(and(eq(clinicSites.clinicId, clinic.id), eq(clinicSites.isPrimary, true)));
  }

  const [created] = await db
    .insert(clinicSites)
    .values({
      clinicId: clinic.id,
      name: name.trim(),
      address: address.trim(),
      city: city.trim(),
      phone: typeof phone === "string" && phone.trim() ? phone.trim() : null,
      isPrimary: isPrimary === true,
    })
    .returning();

  void logClinicAudit({
    clinicId: clinic.id,
    actorType: "clinic",
    actorId: clinic.id,
    action: "site.create",
    targetType: "site",
    targetId: created?.id ?? null,
    metadata: { name: created?.name },
  });

  return NextResponse.json(created, { status: 201 });
}
