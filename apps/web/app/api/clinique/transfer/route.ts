import { NextRequest, NextResponse } from "next/server";
import {
  db,
  clinicDoctors,
  doctors,
  appointments,
  patients,
} from "@doktori/db";
import { eq, and, inArray } from "drizzle-orm";
import { requireClinic } from "@/lib/clinic-auth";
import { sendSMS } from "@/lib/sms";

type TransferBody = {
  appointmentId?: string;
  fromDoctorId?: string;
  toDoctorId?: string;
  newStartsAt?: string;
};

export async function POST(req: NextRequest) {
  const clinic = await requireClinic();
  if (clinic instanceof NextResponse) return clinic;

  let body: TransferBody;
  try {
    body = (await req.json()) as TransferBody;
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const { appointmentId, fromDoctorId, toDoctorId, newStartsAt } = body;

  if (!appointmentId || !fromDoctorId || !toDoctorId || !newStartsAt) {
    return NextResponse.json(
      {
        error:
          "Champs requis: appointmentId, fromDoctorId, toDoctorId, newStartsAt",
      },
      { status: 400 }
    );
  }

  if (fromDoctorId === toDoctorId) {
    return NextResponse.json(
      { error: "Les médecins source et destination doivent être différents" },
      { status: 400 }
    );
  }

  const newStart = new Date(newStartsAt);
  if (isNaN(newStart.getTime())) {
    return NextResponse.json(
      { error: "newStartsAt n'est pas une date valide" },
      { status: 400 }
    );
  }

  // Verify both doctors belong to this clinic
  const clinicDoctorRows = await db
    .select({ doctorId: clinicDoctors.doctorId })
    .from(clinicDoctors)
    .where(eq(clinicDoctors.clinicId, clinic.id));

  const clinicDoctorIds = new Set(clinicDoctorRows.map((r) => r.doctorId));

  if (!clinicDoctorIds.has(fromDoctorId)) {
    return NextResponse.json(
      { error: "Le médecin source n'appartient pas à cette clinique" },
      { status: 403 }
    );
  }
  if (!clinicDoctorIds.has(toDoctorId)) {
    return NextResponse.json(
      { error: "Le médecin destination n'appartient pas à cette clinique" },
      { status: 403 }
    );
  }

  // Load the appointment
  const [appt] = await db
    .select({
      id: appointments.id,
      doctorId: appointments.doctorId,
      patientId: appointments.patientId,
      startsAt: appointments.startsAt,
      endsAt: appointments.endsAt,
      status: appointments.status,
    })
    .from(appointments)
    .where(eq(appointments.id, appointmentId))
    .limit(1);

  if (!appt) {
    return NextResponse.json(
      { error: "Rendez-vous introuvable" },
      { status: 404 }
    );
  }

  if (appt.doctorId !== fromDoctorId) {
    return NextResponse.json(
      { error: "Ce rendez-vous n'appartient pas au médecin source" },
      { status: 400 }
    );
  }

  if (appt.status === "cancelled" || appt.status === "completed") {
    return NextResponse.json(
      { error: "Impossible de transférer un rendez-vous annulé ou terminé" },
      { status: 400 }
    );
  }

  // Compute new end time (preserve duration)
  const originalDuration =
    new Date(appt.endsAt).getTime() - new Date(appt.startsAt).getTime();
  const newEnd = new Date(newStart.getTime() + originalDuration);

  // Fetch target doctor name for SMS
  const [toDoctor] = await db
    .select({ name: doctors.name })
    .from(doctors)
    .where(eq(doctors.id, toDoctorId))
    .limit(1);

  // Fetch patient phone for SMS
  const [patient] = await db
    .select({ phone: patients.phone, name: patients.name })
    .from(patients)
    .where(eq(patients.id, appt.patientId))
    .limit(1);

  // Update appointment
  await db
    .update(appointments)
    .set({
      doctorId: toDoctorId,
      startsAt: newStart,
      endsAt: newEnd,
      updatedAt: new Date(),
    })
    .where(eq(appointments.id, appointmentId));

  // Send SMS to patient — non-blocking
  if (patient && toDoctor) {
    const dateStr = newStart.toLocaleDateString("fr-TN", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    const timeStr = newStart.toLocaleTimeString("fr-TN", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const smsMsg = `Votre RDV a ete transfere au Dr. ${toDoctor.name} le ${dateStr} a ${timeStr}. - Doktori`;
    void sendSMS(patient.phone, smsMsg, appointmentId).catch((err) => {
      console.error("[transfer-sms]", err);
    });
  }

  return NextResponse.json({
    success: true,
    appointmentId,
    toDoctorId,
    newStartsAt: newStart.toISOString(),
    newEndsAt: newEnd.toISOString(),
  });
}
