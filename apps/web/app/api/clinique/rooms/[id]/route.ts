import { NextRequest, NextResponse } from "next/server";
import { db, clinicRooms, clinicSites, appointments } from "@doktori/db";
import { eq, and } from "drizzle-orm";
import { requireClinic } from "@/lib/clinic-auth";
import { logClinicAudit } from "@/lib/audit";

// PATCH /api/clinique/rooms/[id] — update a room (name, color, isActive)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const clinic = await requireClinic();
  if (clinic instanceof NextResponse) return clinic;

  const { id } = await params;

  // Verify the room belongs to a site of this clinic
  const [room] = await db
    .select({ id: clinicRooms.id })
    .from(clinicRooms)
    .innerJoin(clinicSites, eq(clinicRooms.siteId, clinicSites.id))
    .where(and(eq(clinicRooms.id, id), eq(clinicSites.clinicId, clinic.id)))
    .limit(1);

  if (!room) {
    return NextResponse.json({ error: "Salle introuvable" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const { name, color, isActive } = b;

  const patch: Partial<{
    name: string;
    color: string;
    isActive: boolean;
    capacity: number;
    floor: string | null;
    equipmentNotes: string | null;
    status: string;
    lastCleanedAt: Date | null;
  }> = {};
  if (typeof name === "string" && name.trim()) patch.name = name.trim();
  if (typeof color === "string" && color.trim()) patch.color = color.trim();
  if (typeof isActive === "boolean") patch.isActive = isActive;
  if (typeof b.capacity === "number" && b.capacity > 0) patch.capacity = Math.round(b.capacity);
  if (Object.prototype.hasOwnProperty.call(b, "floor")) {
    patch.floor = typeof b.floor === "string" && b.floor.trim() ? b.floor.trim() : null;
  }
  if (Object.prototype.hasOwnProperty.call(b, "equipmentNotes")) {
    patch.equipmentNotes = typeof b.equipmentNotes === "string" && b.equipmentNotes.trim() ? b.equipmentNotes.trim() : null;
  }
  if (typeof b.status === "string" && ["active","maintenance","closed"].includes(b.status)) {
    patch.status = b.status;
  }
  if (Object.prototype.hasOwnProperty.call(b, "lastCleanedAt")) {
    patch.lastCleanedAt = typeof b.lastCleanedAt === "string" && b.lastCleanedAt ? new Date(b.lastCleanedAt) : null;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Aucune modification" }, { status: 400 });
  }

  const [updated] = await db
    .update(clinicRooms)
    .set(patch)
    .where(eq(clinicRooms.id, id))
    .returning();

  void logClinicAudit({
    clinicId: clinic.id,
    actorType: "clinic",
    actorId: clinic.id,
    action: "room.update",
    targetType: "room",
    targetId: id,
  });

  return NextResponse.json(updated);
}

// DELETE /api/clinique/rooms/[id] — delete if no appointments reference it; else deactivate
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const clinic = await requireClinic();
  if (clinic instanceof NextResponse) return clinic;

  const { id } = await params;

  const [room] = await db
    .select({ id: clinicRooms.id })
    .from(clinicRooms)
    .innerJoin(clinicSites, eq(clinicRooms.siteId, clinicSites.id))
    .where(and(eq(clinicRooms.id, id), eq(clinicSites.clinicId, clinic.id)))
    .limit(1);

  if (!room) {
    return NextResponse.json({ error: "Salle introuvable" }, { status: 404 });
  }

  // Check if any appointments reference this room
  const [appt] = await db
    .select({ id: appointments.id })
    .from(appointments)
    .where(eq(appointments.clinicRoomId, id))
    .limit(1);

  if (appt) {
    // Deactivate instead of delete
    const [deactivated] = await db
      .update(clinicRooms)
      .set({ isActive: false })
      .where(eq(clinicRooms.id, id))
      .returning();
    void logClinicAudit({
      clinicId: clinic.id,
      actorType: "clinic",
      actorId: clinic.id,
      action: "room.update",
      targetType: "room",
      targetId: id,
      metadata: { deactivated: true },
    });

    return NextResponse.json({ ok: true, deactivated: true, room: deactivated });
  }

  await db.delete(clinicRooms).where(eq(clinicRooms.id, id));

  void logClinicAudit({
    clinicId: clinic.id,
    actorType: "clinic",
    actorId: clinic.id,
    action: "room.delete",
    targetType: "room",
    targetId: id,
  });

  return NextResponse.json({ ok: true, deactivated: false });
}
