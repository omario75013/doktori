import { NextRequest, NextResponse } from "next/server";
import {
  db,
  clinicRdvRequests,
  clinicDoctors,
  appointments,
  doctorPractices,
} from "@doktori/db";
import { eq, and } from "drizzle-orm";
import { requireClinic } from "@/lib/clinic-auth";
import { resolveOrCreatePatient } from "@/lib/patient-identity";
import { getAvailableSlots } from "@/lib/queries/appointments";

// PATCH /api/clinique/rdv-requests/[id]
// Body: { action: 'assign' | 'fulfill' | 'cancel', doctorId?, appointmentId?, reason? }
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireClinic();
  if (ctx instanceof NextResponse) return ctx;
  const { id } = await params;

  const body = await req.json().catch(() => null);
  if (!body || typeof body.action !== "string") {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }

  const [existing] = await db
    .select()
    .from(clinicRdvRequests)
    .where(
      and(eq(clinicRdvRequests.id, id), eq(clinicRdvRequests.clinicId, ctx.id)),
    )
    .limit(1);
  if (!existing) {
    return NextResponse.json({ error: "Demande introuvable" }, { status: 404 });
  }

  const now = new Date();

  if (body.action === "assign") {
    const doctorId = typeof body.doctorId === "string" ? body.doctorId : "";
    const date = typeof body.date === "string" ? body.date : null;
    const startTime = typeof body.startTime === "string" ? body.startTime : null;
    const endTime = typeof body.endTime === "string" ? body.endTime : null;

    if (!doctorId) {
      return NextResponse.json({ error: "doctorId requis" }, { status: 400 });
    }
    // Ensure doctor belongs to this clinic
    const [membership] = await db
      .select({ id: clinicDoctors.id })
      .from(clinicDoctors)
      .where(
        and(
          eq(clinicDoctors.clinicId, ctx.id),
          eq(clinicDoctors.doctorId, doctorId),
        ),
      )
      .limit(1);
    if (!membership) {
      return NextResponse.json(
        { error: "Médecin non rattaché à la clinique" },
        { status: 400 },
      );
    }

    // If a slot was picked, create the appointment + mark request fulfilled.
    if (date && startTime && endTime) {
      // Resolve/create patient identity (CIN → phone → email cascade)
      const { patientId } = await resolveOrCreatePatient({
        cin: existing.patientCin,
        phone: existing.patientPhone,
        email: existing.patientEmail,
        name: existing.patientName,
        createdByClinicId: ctx.id,
      });

      // Find a clinic-owned practice for this doctor (so the RDV is anchored
      // to the clinic cabinet); fall back to the doctor's primary practice.
      const [practice] = await db
        .select({ id: doctorPractices.id })
        .from(doctorPractices)
        .where(
          and(
            eq(doctorPractices.doctorId, doctorId),
            eq(doctorPractices.clinicId, ctx.id),
            eq(doctorPractices.isActive, true),
          ),
        )
        .limit(1);

      const startsAt = new Date(`${date}T${startTime}:00`);
      const endsAt = new Date(`${date}T${endTime}:00`);
      if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
        return NextResponse.json({ error: "Date/heure invalides" }, { status: 400 });
      }

      // Re-validate against the doctor's agenda right before insert (the slot
      // could have been taken between display and click). Honours doctor
      // schedules, days off, and existing bookings.
      const slots = await getAvailableSlots(doctorId, date);
      const stillFree = slots.some(
        (s) => s.available && s.startTime === startTime && s.endTime === endTime,
      );
      if (!stillFree) {
        return NextResponse.json(
          { error: "Ce créneau n'est plus disponible. Veuillez en choisir un autre." },
          { status: 409 },
        );
      }

      const [appt] = await db
        .insert(appointments)
        .values({
          doctorId,
          patientId,
          startsAt,
          endsAt,
          // Awaiting doctor confirmation — respects the doctor's agenda rules.
          status: "pending",
          type: "cabinet",
          practiceId: practice?.id ?? undefined,
          reason: existing.motif ?? `Demande clinique — ${existing.patientName}`,
        })
        .returning({ id: appointments.id });

      await db
        .update(clinicRdvRequests)
        .set({
          status: "fulfilled",
          assignedDoctorId: doctorId,
          assignedAppointmentId: appt.id,
          assignedAt: now,
          assignedByUserId: ctx.id,
          updatedAt: now,
        })
        .where(eq(clinicRdvRequests.id, id));

      return NextResponse.json({ ok: true, appointmentId: appt.id });
    }

    // Doctor-only assignment (no slot yet)
    await db
      .update(clinicRdvRequests)
      .set({
        status: "assigned",
        assignedDoctorId: doctorId,
        assignedAt: now,
        assignedByUserId: ctx.id,
        updatedAt: now,
      })
      .where(eq(clinicRdvRequests.id, id));
    return NextResponse.json({ ok: true });
  }

  if (body.action === "fulfill") {
    const appointmentId = typeof body.appointmentId === "string" ? body.appointmentId : null;
    await db
      .update(clinicRdvRequests)
      .set({
        status: "fulfilled",
        assignedAppointmentId: appointmentId ?? undefined,
        updatedAt: now,
      })
      .where(eq(clinicRdvRequests.id, id));
    return NextResponse.json({ ok: true });
  }

  if (body.action === "cancel") {
    const reason = typeof body.reason === "string" ? body.reason : null;
    await db
      .update(clinicRdvRequests)
      .set({
        status: "cancelled",
        cancelledReason: reason ?? undefined,
        updatedAt: now,
      })
      .where(eq(clinicRdvRequests.id, id));
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
}
