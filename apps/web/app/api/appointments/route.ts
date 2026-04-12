import { NextResponse } from "next/server";
import { db, patients, doctors, doctorSchedules, doctorPractices, appointmentTypes, patientDependents, appointmentAnswers } from "@doktori/db";
import { createAppointment, getAvailableSlots } from "@/lib/queries/appointments";
import { bookAppointmentSchema } from "@doktori/validation";
import { formatPhone, SPECIALTIES } from "@doktori/shared";
import { eq, and, sql } from "drizzle-orm";
import { sendSMS } from "@/lib/sms";
import { sendEmail } from "@/lib/email";
import { bookingConfirmation, welcomePatient, newBookingDoctor } from "@/emails/templates";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const doctorId = searchParams.get("doctorId");
  const date = searchParams.get("date");
  const typeId = searchParams.get("typeId");
  const practiceId = searchParams.get("practiceId") ?? undefined;

  if (!doctorId || !date) {
    return NextResponse.json(
      { error: "doctorId et date requis" },
      { status: 400 }
    );
  }

  let duration: number | undefined;
  if (typeId) {
    const [type] = await db
      .select({ durationMinutes: appointmentTypes.durationMinutes })
      .from(appointmentTypes)
      .where(and(eq(appointmentTypes.id, typeId), eq(appointmentTypes.doctorId, doctorId)))
      .limit(1);
    if (type) duration = type.durationMinutes;
  }

  const slots = await getAvailableSlots(doctorId, date, duration, practiceId);
  return NextResponse.json(slots);
}

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = bookAppointmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const phone = formatPhone(parsed.data.patientPhone);

  let [patient] = await db
    .select()
    .from(patients)
    .where(eq(patients.phone, phone))
    .limit(1);

  if (!patient) {
    [patient] = await db
      .insert(patients)
      .values({
        name: parsed.data.patientName,
        phone,
      })
      .returning();
  }

  // Guard: block suspended patients from booking
  if (patient.isSuspended) {
    return NextResponse.json({ error: "Compte patient suspendu" }, { status: 403 });
  }

  const [doctor] = await db
    .select()
    .from(doctors)
    .where(eq(doctors.id, parsed.data.doctorId))
    .limit(1);

  if (!doctor) {
    return NextResponse.json({ error: "Médecin introuvable" }, { status: 404 });
  }

  let slotDuration: number | undefined;
  if (parsed.data.appointmentTypeId) {
    const [type] = await db
      .select()
      .from(appointmentTypes)
      .where(
        and(
          eq(appointmentTypes.id, parsed.data.appointmentTypeId),
          eq(appointmentTypes.doctorId, doctor.id),
          eq(appointmentTypes.isActive, true),
        ),
      )
      .limit(1);
    if (!type) {
      return NextResponse.json({ error: "Motif introuvable" }, { status: 400 });
    }
    slotDuration = type.durationMinutes;
  }

  if (!slotDuration) {
    const [schedule] = await db
      .select()
      .from(doctorSchedules)
      .where(eq(doctorSchedules.doctorId, doctor.id))
      .limit(1);
    slotDuration = schedule?.slotDuration ?? 20;
  }

  // Beneficiary (dependent): find-or-create when booking for someone else
  let dependentId: string | undefined;
  if (
    parsed.data.beneficiaryName &&
    (!parsed.data.beneficiaryRelation || parsed.data.beneficiaryRelation !== "self")
  ) {
    const beneficiaryName = parsed.data.beneficiaryName.trim();
    const [existing] = await db
      .select()
      .from(patientDependents)
      .where(
        and(
          eq(patientDependents.patientId, patient.id),
          sql`lower(${patientDependents.name}) = lower(${beneficiaryName})`,
        ),
      )
      .limit(1);
    if (existing) {
      dependentId = existing.id;
    } else {
      const [created] = await db
        .insert(patientDependents)
        .values({
          patientId: patient.id,
          name: beneficiaryName,
          dateOfBirth: parsed.data.beneficiaryDateOfBirth,
          relation: parsed.data.beneficiaryRelation,
        })
        .returning();
      dependentId = created.id;
    }
  }

  const startsAt = new Date(`${parsed.data.date}T${parsed.data.startTime}:00`);
  const endsAt = new Date(startsAt.getTime() + slotDuration * 60 * 1000);

  // Validate practiceId when provided: must belong to the doctor
  let resolvedPracticeId: string | undefined;
  if (parsed.data.practiceId) {
    const [practice] = await db
      .select({ id: doctorPractices.id })
      .from(doctorPractices)
      .where(
        and(
          eq(doctorPractices.id, parsed.data.practiceId),
          eq(doctorPractices.doctorId, doctor.id),
          eq(doctorPractices.isActive, true),
        )
      )
      .limit(1);
    if (!practice) {
      return NextResponse.json({ error: "Cabinet introuvable" }, { status: 400 });
    }
    resolvedPracticeId = practice.id;
  }

  try {
    const appointment = await createAppointment({
      doctorId: parsed.data.doctorId,
      patientId: patient.id,
      startsAt,
      endsAt,
      reason: parsed.data.reason,
      appointmentTypeId: parsed.data.appointmentTypeId,
      dependentId,
      practiceId: resolvedPracticeId,
    });

    // G3: save questionnaire answers (don't fail the booking on error)
    if (parsed.data.questionnaire && Object.keys(parsed.data.questionnaire).length > 0) {
      try {
        const rows = Object.entries(parsed.data.questionnaire)
          .filter(([, value]) => value.trim().length > 0)
          .map(([questionId, value]) => ({
            appointmentId: appointment.id,
            questionId,
            value,
          }));
        if (rows.length > 0) {
          await db.insert(appointmentAnswers).values(rows).onConflictDoNothing();
        }
      } catch (e) {
        console.error("Failed to insert appointment answers:", e);
      }
    }

    // Send confirmation SMS (don't fail the booking on SMS error)
    const specialty = SPECIALTIES.find((s) => s.id === doctor.specialty)?.label || "";
    const timeStr = format(startsAt, "HH:mm");
    const dateStr = format(startsAt, "EEEE d MMMM", { locale: fr });
    try {
      const smsMessage = `Doktori: RDV confirme le ${dateStr} a ${timeStr} avec ${doctor.name} (${specialty}), ${doctor.address}. Rappel la veille par SMS.`;
      await sendSMS(phone, smsMessage, appointment.id);
    } catch (e) {
      console.error("SMS send failed:", e);
    }

    // Send confirmation email to patient (best-effort)
    if (patient.email) {
      try {
        const email = bookingConfirmation({
          patientName: patient.name,
          doctorName: doctor.name,
          specialty,
          date: dateStr,
          time: timeStr,
          address: doctor.address,
        });
        await sendEmail({ to: patient.email, ...email, appointmentId: appointment.id });
      } catch (e) {
        console.error("Patient email send failed:", e);
      }

      // Welcome email for first-time patients
      try {
        const isFirstBooking = patient.createdAt && (Date.now() - new Date(patient.createdAt).getTime()) < 60_000;
        if (isFirstBooking) {
          const welcome = welcomePatient({ patientName: patient.name });
          await sendEmail({ to: patient.email, ...welcome });
        }
      } catch {}
    }

    // Notify doctor of new booking (best-effort)
    if (doctor.email) {
      try {
        const doctorEmail = newBookingDoctor({
          doctorName: doctor.name,
          patientName: parsed.data.patientName,
          patientPhone: phone,
          date: dateStr,
          time: timeStr,
          reason: parsed.data.reason,
          agendaUrl: `https://doktori.tn/agenda`,
        });
        await sendEmail({ to: doctor.email, ...doctorEmail, appointmentId: appointment.id });
      } catch (e) {
        console.error("Doctor email send failed:", e);
      }
    }

    return NextResponse.json(appointment, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Erreur lors de la réservation";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
