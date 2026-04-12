import { NextResponse } from "next/server";
import { db, appointments, patients, doctors, doctorHomeVisitSettings } from "@doktori/db";
import { formatPhone } from "@doktori/shared";
import { eq, and, gte, count } from "drizzle-orm";
import { sendSMS } from "@/lib/sms";

export async function POST(req: Request) {
  const body = await req.json();
  const { doctorId, patientName, patientPhone, address, preferredDate, preferredTime, reason } = body;

  if (!doctorId || !patientName || !patientPhone || !address || !preferredDate || !preferredTime) {
    return NextResponse.json({ error: "Tous les champs sont requis" }, { status: 400 });
  }

  // Verify doctor accepts home visits
  const [settings] = await db
    .select()
    .from(doctorHomeVisitSettings)
    .where(and(
      eq(doctorHomeVisitSettings.doctorId, doctorId),
      eq(doctorHomeVisitSettings.isAvailable, true),
    ))
    .limit(1);

  if (!settings) {
    return NextResponse.json({ error: "Ce médecin ne propose pas de visites à domicile" }, { status: 400 });
  }

  const [doctor] = await db.select().from(doctors).where(eq(doctors.id, doctorId)).limit(1);
  if (!doctor) return NextResponse.json({ error: "Médecin introuvable" }, { status: 404 });

  const phone = formatPhone(patientPhone);

  // Upsert patient
  let [patient] = await db.select().from(patients).where(eq(patients.phone, phone)).limit(1);
  if (!patient) {
    [patient] = await db.insert(patients).values({ name: patientName, phone }).returning();
  }

  // Rate limit: max 3 home-visit requests per 30 minutes per patient
  const windowStart = new Date(Date.now() - 30 * 60 * 1000);
  const [recentCount] = await db
    .select({ total: count(appointments.id) })
    .from(appointments)
    .where(and(
      eq(appointments.patientId, patient.id),
      eq(appointments.type, "home_visit"),
      gte(appointments.startsAt, windowStart),
    ));

  if ((recentCount?.total ?? 0) >= 3) {
    return NextResponse.json(
      { error: "Trop de demandes de visite à domicile. Veuillez patienter 30 minutes avant de réessayer." },
      { status: 429 }
    );
  }

  const startsAt = new Date(`${preferredDate}T${preferredTime}:00`);
  const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000); // 1h default for home visit

  const [appt] = await db.insert(appointments).values({
    doctorId,
    patientId: patient.id,
    startsAt,
    endsAt,
    status: "pending",
    type: "home_visit",
    reason: `[Adresse: ${address}] ${reason || ""}`,
  }).returning();

  // SMS confirmation (non-blocking)
  try {
    const feeDT = settings.fee / 1000;
    const msg = `Doktori: Demande de visite a domicile envoyee au ${doctor.name}. Tarif: ${feeDT} DT. Vous serez notifie a la confirmation.`;
    await sendSMS(phone, msg, appt.id);
  } catch (e) {
    console.error("SMS failed:", e);
  }

  return NextResponse.json(appt, { status: 201 });
}
