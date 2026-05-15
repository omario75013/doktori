import { NextRequest, NextResponse } from "next/server";
import { db, appointments, clinicDoctors, clinicRooms, clinicSites } from "@doktori/db";
import { eq, and, inArray } from "drizzle-orm";
import { requireClinic } from "@/lib/clinic-auth";
import { logClinicAudit } from "@/lib/audit";

// PATCH /api/clinique/appointments/[id] — partial update (status, clinicRoomId)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const clinic = await requireClinic();
  if (clinic instanceof NextResponse) return clinic;

  const { id } = await params;

  // Verify the appointment belongs to a doctor of this clinic
  const clinicDoctorRows = await db
    .select({ doctorId: clinicDoctors.doctorId })
    .from(clinicDoctors)
    .where(eq(clinicDoctors.clinicId, clinic.id));

  const doctorIds = clinicDoctorRows.map((r) => r.doctorId);
  if (doctorIds.length === 0) {
    return NextResponse.json({ error: "Aucun médecin dans la clinique" }, { status: 403 });
  }

  const [appt] = await db
    .select({ id: appointments.id })
    .from(appointments)
    .where(and(eq(appointments.id, id), inArray(appointments.doctorId, doctorIds)))
    .limit(1);

  if (!appt) {
    return NextResponse.json({ error: "Rendez-vous introuvable" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }

  const { status, clinicRoomId } = body as Record<string, unknown>;

  const patch: Partial<{
    status: string;
    clinicRoomId: string | null;
    confirmedAt: Date | null;
    cancelledAt: Date | null;
  }> = {};

  if (typeof status === "string") {
    const validStatuses = ["pending", "confirmed", "completed", "cancelled", "no_show", "checked_in"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
    }
    patch.status = status;
    if (status === "confirmed") patch.confirmedAt = new Date();
    if (status === "cancelled") patch.cancelledAt = new Date();
  }

  if (clinicRoomId !== undefined) {
    if (clinicRoomId === null) {
      patch.clinicRoomId = null;
    } else if (typeof clinicRoomId === "string") {
      // Verify the room belongs to a site of this clinic
      const [roomCheck] = await db
        .select({ id: clinicRooms.id })
        .from(clinicRooms)
        .innerJoin(clinicSites, eq(clinicRooms.siteId, clinicSites.id))
        .where(and(eq(clinicRooms.id, clinicRoomId), eq(clinicSites.clinicId, clinic.id)))
        .limit(1);

      if (!roomCheck) {
        return NextResponse.json({ error: "Salle introuvable" }, { status: 404 });
      }
      patch.clinicRoomId = clinicRoomId;
    }
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Aucune modification" }, { status: 400 });
  }

  const [updated] = await db
    .update(appointments)
    .set(patch)
    .where(eq(appointments.id, id))
    .returning();

  // Determine which action best describes this update
  let auditAction = "rdv.update";
  if (patch.status) auditAction = "rdv.status_change";
  else if (patch.clinicRoomId !== undefined) auditAction = "room.assign";

  void logClinicAudit({
    clinicId: clinic.id,
    actorType: "clinic",
    actorId: clinic.id,
    action: auditAction,
    targetType: "appointment",
    targetId: id,
    metadata: patch as Record<string, unknown>,
  });

  return NextResponse.json(updated);
}
