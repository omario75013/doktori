import { NextRequest, NextResponse } from "next/server";
import { db, clinicRooms, clinicSites } from "@doktori/db";
import { eq, asc, and } from "drizzle-orm";
import { requireClinic } from "@/lib/clinic-auth";
import { logClinicAudit } from "@/lib/audit";

// GET /api/clinique/rooms?siteId=<uuid> — list rooms for a site (or all rooms grouped by site)
export async function GET(req: NextRequest) {
  const clinic = await requireClinic();
  if (clinic instanceof NextResponse) return clinic;

  const { searchParams } = new URL(req.url);
  const siteId = searchParams.get("siteId");

  if (siteId) {
    // Verify the site belongs to this clinic
    const [site] = await db
      .select({ id: clinicSites.id })
      .from(clinicSites)
      .where(and(eq(clinicSites.id, siteId), eq(clinicSites.clinicId, clinic.id)))
      .limit(1);

    if (!site) {
      return NextResponse.json({ error: "Site introuvable" }, { status: 404 });
    }

    const rooms = await db
      .select()
      .from(clinicRooms)
      .where(eq(clinicRooms.siteId, siteId))
      .orderBy(asc(clinicRooms.name));

    return NextResponse.json({ rooms });
  }

  // No siteId — return all rooms for all sites of this clinic, grouped
  const sites = await db
    .select({ id: clinicSites.id, name: clinicSites.name, isPrimary: clinicSites.isPrimary })
    .from(clinicSites)
    .where(eq(clinicSites.clinicId, clinic.id))
    .orderBy(asc(clinicSites.name));

  const allRooms = await db
    .select({
      id: clinicRooms.id,
      siteId: clinicRooms.siteId,
      name: clinicRooms.name,
      color: clinicRooms.color,
      isActive: clinicRooms.isActive,
      capacity: clinicRooms.capacity,
      floor: clinicRooms.floor,
      equipmentNotes: clinicRooms.equipmentNotes,
      status: clinicRooms.status,
      lastCleanedAt: clinicRooms.lastCleanedAt,
      createdAt: clinicRooms.createdAt,
    })
    .from(clinicRooms)
    .innerJoin(clinicSites, eq(clinicRooms.siteId, clinicSites.id))
    .where(eq(clinicSites.clinicId, clinic.id))
    .orderBy(asc(clinicRooms.name));

  const grouped = sites.map((s) => ({
    ...s,
    rooms: allRooms.filter((r) => r.siteId === s.id),
  }));

  return NextResponse.json({ grouped, rooms: allRooms });
}

// POST /api/clinique/rooms — create a room
export async function POST(req: NextRequest) {
  const clinic = await requireClinic();
  if (clinic instanceof NextResponse) return clinic;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const { siteId, name, color } = b;

  if (typeof siteId !== "string" || !siteId.trim()) {
    return NextResponse.json({ error: "siteId est obligatoire" }, { status: 400 });
  }
  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Le nom est obligatoire" }, { status: 400 });
  }

  // Verify the site belongs to this clinic
  const [site] = await db
    .select({ id: clinicSites.id })
    .from(clinicSites)
    .where(and(eq(clinicSites.id, siteId), eq(clinicSites.clinicId, clinic.id)))
    .limit(1);

  if (!site) {
    return NextResponse.json({ error: "Site introuvable" }, { status: 404 });
  }

  const capacityVal = typeof b.capacity === "number" && b.capacity > 0 ? Math.round(b.capacity) : 1;

  const [created] = await db
    .insert(clinicRooms)
    .values({
      siteId,
      name: (name as string).trim(),
      color: typeof color === "string" && color.trim() ? color.trim() : "#2563eb",
      capacity: capacityVal,
      floor: typeof b.floor === "string" && b.floor.trim() ? b.floor.trim() : null,
      equipmentNotes: typeof b.equipmentNotes === "string" && b.equipmentNotes.trim() ? b.equipmentNotes.trim() : null,
      status: typeof b.status === "string" && ["active","maintenance","closed"].includes(b.status) ? b.status : "active",
      lastCleanedAt: typeof b.lastCleanedAt === "string" && b.lastCleanedAt ? new Date(b.lastCleanedAt) : null,
    })
    .returning();

  void logClinicAudit({
    clinicId: clinic.id,
    actorType: "clinic",
    actorId: clinic.id,
    action: "room.create",
    targetType: "room",
    targetId: created?.id ?? null,
    metadata: { name: created?.name, siteId },
  });

  return NextResponse.json(created, { status: 201 });
}
