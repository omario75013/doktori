import { NextResponse } from "next/server";
import { db, patients, doctors, doctorSchedules } from "@doktori/db";
import { createAppointment, getAvailableSlots } from "@/lib/queries/appointments";
import { bookAppointmentSchema } from "@doktori/validation";
import { formatPhone, SPECIALTIES } from "@doktori/shared";
import { eq } from "drizzle-orm";
import { sendSMS } from "@/lib/sms";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const doctorId = searchParams.get("doctorId");
  const date = searchParams.get("date");

  if (!doctorId || !date) {
    return NextResponse.json(
      { error: "doctorId et date requis" },
      { status: 400 }
    );
  }

  const slots = await getAvailableSlots(doctorId, date);
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

  const [doctor] = await db
    .select()
    .from(doctors)
    .where(eq(doctors.id, parsed.data.doctorId))
    .limit(1);

  if (!doctor) {
    return NextResponse.json({ error: "Médecin introuvable" }, { status: 404 });
  }

  const [schedule] = await db
    .select()
    .from(doctorSchedules)
    .where(eq(doctorSchedules.doctorId, doctor.id))
    .limit(1);

  const slotDuration = schedule?.slotDuration ?? 20;

  const startsAt = new Date(`${parsed.data.date}T${parsed.data.startTime}:00`);
  const endsAt = new Date(startsAt.getTime() + slotDuration * 60 * 1000);

  try {
    const appointment = await createAppointment({
      doctorId: parsed.data.doctorId,
      patientId: patient.id,
      startsAt,
      endsAt,
      reason: parsed.data.reason,
    });

    // Send confirmation SMS (don't fail the booking on SMS error)
    try {
      const specialty = SPECIALTIES.find((s) => s.id === doctor.specialty)?.label || "";
      const time = format(startsAt, "HH:mm");
      const date = format(startsAt, "EEEE d MMMM", { locale: fr });
      const smsMessage = `Doktori: RDV confirme le ${date} a ${time} avec ${doctor.name} (${specialty}), ${doctor.address}. Rappel la veille par SMS.`;
      await sendSMS(phone, smsMessage, appointment.id);
    } catch (e) {
      console.error("SMS send failed:", e);
    }

    return NextResponse.json(appointment, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Erreur lors de la réservation";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
