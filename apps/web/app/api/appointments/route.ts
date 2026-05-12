import { NextResponse } from "next/server";
import { db, patients, doctors, doctorSchedules, doctorPractices, appointmentTypes, patientDependents, appointmentAnswers, appointments } from "@doktori/db";
import { createAppointment, getAvailableSlots } from "@/lib/queries/appointments";
import { assertPlanLimit, PlanLimitError } from "@/lib/plan-gates";
import { bookAppointmentSchema } from "@doktori/validation";
import { formatPhone, SPECIALTIES } from "@doktori/shared";
import { eq, and, sql, gte, lte, ne, inArray, not } from "drizzle-orm";
import { notifyDoctorAppointmentEvent } from "@/lib/notify-doctor-rdv";
import { DEFAULT_NOSHOW_THRESHOLD, SUSPENSION_DAYS } from "@/lib/noshow-policy";
import { sendSMS } from "@/lib/sms";
import { sendEmail } from "@/lib/email";
import { bookingConfirmation, welcomePatient, newBookingDoctor } from "@/emails/templates";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { createFlouciPayment } from "@/lib/flouci";
import { dispatchWebhook } from "@/lib/webhooks";

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

  const slots = await getAvailableSlots(doctorId, date, duration, practiceId, typeId ?? undefined);
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

  // Auto-unban: lift suspension after SUSPENSION_DAYS if the patient waited long enough
  if (patient.isSuspended && patient.suspendedAt) {
    const msElapsed = Date.now() - new Date(patient.suspendedAt).getTime();
    const msThreshold = SUSPENSION_DAYS * 24 * 60 * 60 * 1000;
    if (msElapsed >= msThreshold) {
      await db
        .update(patients)
        .set({ isSuspended: false, suspensionReason: null, suspendedAt: null, noShowCount: 0 })
        .where(eq(patients.id, patient.id));
      // Refresh the local patient object so the suspended check below passes
      patient = { ...patient, isSuspended: false, suspensionReason: null, suspendedAt: null, noShowCount: 0 };
    }
  }

  // Guard: block suspended patients from booking
  if (patient.isSuspended) {
    return NextResponse.json({ error: "Compte patient suspendu" }, { status: 403 });
  }

  // Soft warning: include no-show count in the response for the client to display
  const noShowWarning =
    patient.noShowCount > 0
      ? {
          noShowWarning: `Attention : vous avez ${patient.noShowCount} absence(s) non justifiée(s). Après ${DEFAULT_NOSHOW_THRESHOLD} absences, votre compte sera temporairement suspendu.`,
        }
      : {};

  const [doctor] = await db
    .select()
    .from(doctors)
    .where(eq(doctors.id, parsed.data.doctorId))
    .limit(1);

  if (!doctor) {
    return NextResponse.json({ error: "Médecin introuvable" }, { status: 404 });
  }

  try {
    await assertPlanLimit(doctor.id, "appointments");
  } catch (e) {
    if (e instanceof PlanLimitError) {
      return NextResponse.json(
        { error: "PLAN_LIMIT_REACHED", resource: e.resource, current: e.current, max: e.max },
        { status: 402 }
      );
    }
    throw e;
  }

  let slotDuration: number | undefined;
  let resolvedTypeFee: number | null = null;
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
    resolvedTypeFee = type.fee ?? null;
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

  // Same-day duplicate guard. If the patient already has an active RDV with
  // this doctor on the chosen date, return 409 and let the client decide
  // whether to reschedule the existing row (re-POST with replaceAppointmentId).
  // Skipped when the client is explicitly replacing.
  const dayStart = new Date(`${parsed.data.date}T00:00:00`);
  const dayEnd = new Date(`${parsed.data.date}T23:59:59`);
  if (!parsed.data.replaceAppointmentId) {
    const [existingSameDay] = await db
      .select({
        id: appointments.id,
        startsAt: appointments.startsAt,
        endsAt: appointments.endsAt,
        status: appointments.status,
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.doctorId, parsed.data.doctorId),
          eq(appointments.patientId, patient.id),
          gte(appointments.startsAt, dayStart),
          lte(appointments.startsAt, dayEnd),
          not(inArray(appointments.status, ["cancelled", "completed", "no_show"])),
        ),
      )
      .limit(1);
    if (existingSameDay) {
      return NextResponse.json(
        {
          error: "SAME_DAY_APPOINTMENT_EXISTS",
          existing: {
            id: existingSameDay.id,
            startsAt: existingSameDay.startsAt,
            endsAt: existingSameDay.endsAt,
            status: existingSameDay.status,
          },
        },
        { status: 409 },
      );
    }
  }

  // Resolve practiceId: explicit → validate; otherwise fall back to doctor's primary practice
  // (appointments.practice_id is NOT NULL since migration 0063).
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
  } else {
    const [primary] = await db
      .select({ id: doctorPractices.id })
      .from(doctorPractices)
      .where(
        and(
          eq(doctorPractices.doctorId, doctor.id),
          eq(doctorPractices.isPrimary, true),
          eq(doctorPractices.isActive, true),
        )
      )
      .limit(1);
    if (!primary) {
      return NextResponse.json(
        { error: "Le médecin n'a pas de cabinet actif" },
        { status: 400 }
      );
    }
    resolvedPracticeId = primary.id;
  }

  // Analytics: capture referredBy from ?ref query param in the Referer header
  let referredBy: string | null = null;
  const refererHeader = req.headers.get("referer") ?? "";
  try {
    const refUrl = new URL(refererHeader);
    referredBy = refUrl.searchParams.get("ref");
  } catch {
    // Ignore malformed referer
  }

  try {
    // Reschedule-in-place path: patient confirmed the "you already have a
    // RDV that day, move it?" prompt. Validate ownership, then update the
    // existing row's time and notify the doctor.
    if (parsed.data.replaceAppointmentId) {
      const [existing] = await db
        .select()
        .from(appointments)
        .where(
          and(
            eq(appointments.id, parsed.data.replaceAppointmentId),
            eq(appointments.patientId, patient.id),
            eq(appointments.doctorId, parsed.data.doctorId),
          ),
        )
        .limit(1);
      if (!existing) {
        return NextResponse.json(
          { error: "RDV à modifier introuvable" },
          { status: 404 },
        );
      }
      if (["cancelled", "completed", "no_show"].includes(existing.status)) {
        return NextResponse.json(
          { error: "Ce RDV ne peut plus être modifié" },
          { status: 409 },
        );
      }
      const previousStartsAt = existing.startsAt;
      const [updated] = await db
        .update(appointments)
        // Reschedule resets status to pending — doctor re-validates the
        // new slot before SMS/email reminders fire.
        .set({ startsAt, endsAt, status: "pending", updatedAt: new Date() })
        .where(eq(appointments.id, existing.id))
        .returning();

      // Notify the doctor: patient moved their RDV.
      void notifyDoctorAppointmentEvent(
        parsed.data.doctorId,
        "appointment_rescheduled_by_patient",
        {
          appointmentId: updated.id,
          patientId: patient.id,
          patientName: patient.name,
          previousStartsAt: previousStartsAt.toISOString(),
          newStartsAt: updated.startsAt.toISOString(),
        },
      );

      return NextResponse.json({ ...updated, ...noShowWarning });
    }

    const appointment = await createAppointment({
      doctorId: parsed.data.doctorId,
      patientId: patient.id,
      startsAt,
      endsAt,
      reason: parsed.data.reason,
      appointmentTypeId: parsed.data.appointmentTypeId,
      dependentId,
      practiceId: resolvedPracticeId,
      type: parsed.data.type || "cabinet",
    });

    // Log referral source for analytics (best-effort, non-blocking)
    if (referredBy && typeof referredBy === "string") {
      try {
        await db.execute(sql`
          UPDATE appointments
          SET referred_by = ${referredBy}
          WHERE id = ${appointment.id}
        `);
      } catch {
        // Column may not exist yet — safe to ignore
      }
    }

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

    // Teleconsult: mandatory payment via Flouci
    const isTeleconsult = parsed.data.type === "teleconsult";
    if (isTeleconsult) {
      const fee = resolvedTypeFee ?? doctor.teleconsultFee ?? doctor.consultationFee ?? null;

      if (fee != null && fee > 0) {
        const baseUrl = process.env.NEXTAUTH_URL || "https://doktori.tn";
        const successUrl = `${baseUrl}/payment/success?appt=${appointment.id}`;
        const failUrl = `${baseUrl}/payment/fail?appt=${appointment.id}`;

        const payment = await createFlouciPayment({
          amount: fee,
          reference: appointment.id,
          successUrl,
          failUrl,
        });

        if (payment.success && payment.paymentUrl) {
          // Mark appointment with pending payment
          await db.execute(sql`
            UPDATE appointments
            SET payment_status = 'pending',
                payment_amount = ${fee},
                payment_ref = ${payment.paymentRef ?? null},
                payment_provider = 'flouci',
                updated_at = NOW()
            WHERE id = ${appointment.id}
          `);

          return NextResponse.json(
            { id: appointment.id, paymentUrl: payment.paymentUrl, paymentRequired: true, ...noShowWarning },
            { status: 201 }
          );
        }
        // If Flouci fails, fall through — appointment created but no payment attached
        console.error("Flouci payment creation failed:", payment.error);
      }
      // fee is 0 or null — free teleconsult, proceed without payment
    }

    // Dispatch webhook (fire-and-forget)
    dispatchWebhook("booking.created", {
      appointmentId: appointment.id,
      doctorId: appointment.doctorId,
      patientId: appointment.patientId,
    }).catch(console.error);

    return NextResponse.json({ ...appointment, ...noShowWarning }, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Erreur lors de la réservation";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
