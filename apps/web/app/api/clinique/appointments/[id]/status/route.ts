import { NextRequest, NextResponse } from "next/server";
import { db, appointments, clinicDoctors } from "@doktori/db";
import { eq, and, inArray } from "drizzle-orm";
import { requireClinic } from "@/lib/clinic-auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const clinic = await requireClinic();
  if (clinic instanceof NextResponse) return clinic;

  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const { status } = body as { status?: string };

  if (!status || !["confirmed", "cancelled", "completed", "no_show"].includes(status)) {
    return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
  }

  // Get all doctors belonging to this clinic
  const clinicDoctorRows = await db
    .select({ doctorId: clinicDoctors.doctorId })
    .from(clinicDoctors)
    .where(eq(clinicDoctors.clinicId, clinic.id));

  const allDoctorIds = clinicDoctorRows.map((r) => r.doctorId);

  if (allDoctorIds.length === 0) {
    return NextResponse.json({ error: "RDV introuvable" }, { status: 404 });
  }

  // Verify the appointment belongs to one of the clinic's doctors
  const [current] = await db
    .select({ id: appointments.id, status: appointments.status })
    .from(appointments)
    .where(
      and(
        eq(appointments.id, id),
        inArray(appointments.doctorId, allDoctorIds)
      )
    )
    .limit(1);

  if (!current) {
    return NextResponse.json({ error: "RDV introuvable" }, { status: 404 });
  }

  const [updated] = await db
    .update(appointments)
    .set({ status, updatedAt: new Date() })
    .where(eq(appointments.id, id))
    .returning({
      id: appointments.id,
      status: appointments.status,
    });

  return NextResponse.json(updated);
}
