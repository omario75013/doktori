import { NextRequest, NextResponse } from "next/server";
import { db, clinicSites } from "@doktori/db";
import { eq, and } from "drizzle-orm";
import { requireClinic } from "@/lib/clinic-auth";
import { logClinicAudit } from "@/lib/audit";

// PATCH /api/clinique/sites/[id] — update a site
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const clinic = await requireClinic();
  if (clinic instanceof NextResponse) return clinic;

  const { id } = await params;

  // Verify ownership
  const [existing] = await db
    .select({ id: clinicSites.id })
    .from(clinicSites)
    .where(and(eq(clinicSites.id, id), eq(clinicSites.clinicId, clinic.id)))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "Site introuvable" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }

  const { name, address, city, phone, isPrimary } = body as Record<string, unknown>;

  const patch: Record<string, unknown> = {};
  if (typeof name === "string" && name.trim()) patch.name = name.trim();
  if (typeof address === "string" && address.trim()) patch.address = address.trim();
  if (typeof city === "string" && city.trim()) patch.city = city.trim();
  if (phone !== undefined) patch.phone = typeof phone === "string" && phone.trim() ? phone.trim() : null;
  if (typeof isPrimary === "boolean") {
    patch.isPrimary = isPrimary;
    if (isPrimary) {
      // Clear other primaries
      await db
        .update(clinicSites)
        .set({ isPrimary: false })
        .where(and(eq(clinicSites.clinicId, clinic.id), eq(clinicSites.isPrimary, true)));
    }
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Aucune modification" }, { status: 400 });
  }

  const [updated] = await db
    .update(clinicSites)
    .set(patch as Partial<{ name: string; address: string; city: string; phone: string | null; isPrimary: boolean }>)
    .where(eq(clinicSites.id, id))
    .returning();

  void logClinicAudit({
    clinicId: clinic.id,
    actorType: "clinic",
    actorId: clinic.id,
    action: "site.update",
    targetType: "site",
    targetId: id,
  });

  return NextResponse.json(updated);
}

// DELETE /api/clinique/sites/[id] — delete site + cascade rooms
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const clinic = await requireClinic();
  if (clinic instanceof NextResponse) return clinic;

  const { id } = await params;

  const [existing] = await db
    .select({ id: clinicSites.id })
    .from(clinicSites)
    .where(and(eq(clinicSites.id, id), eq(clinicSites.clinicId, clinic.id)))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "Site introuvable" }, { status: 404 });
  }

  // Rooms cascade via FK onDelete: "cascade" in schema
  await db.delete(clinicSites).where(eq(clinicSites.id, id));

  void logClinicAudit({
    clinicId: clinic.id,
    actorType: "clinic",
    actorId: clinic.id,
    action: "site.delete",
    targetType: "site",
    targetId: id,
  });

  return NextResponse.json({ ok: true });
}
