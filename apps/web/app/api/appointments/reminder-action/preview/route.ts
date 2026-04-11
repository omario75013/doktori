import { NextResponse } from "next/server";
import { db, appointments, doctors } from "@doktori/db";
import { eq } from "drizzle-orm";
import { verifyReminderToken } from "@/lib/reminder-token";
import { SPECIALTIES } from "@doktori/shared";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Token manquant" }, { status: 400 });

  const appointmentId = verifyReminderToken(token);
  if (!appointmentId) return NextResponse.json({ error: "Lien invalide" }, { status: 401 });

  const [row] = await db
    .select({
      status: appointments.status,
      startsAt: appointments.startsAt,
      doctorName: doctors.name,
      doctorSpecialty: doctors.specialty,
      doctorAddress: doctors.address,
    })
    .from(appointments)
    .innerJoin(doctors, eq(appointments.doctorId, doctors.id))
    .where(eq(appointments.id, appointmentId))
    .limit(1);

  if (!row) return NextResponse.json({ error: "Rendez-vous introuvable" }, { status: 404 });

  return NextResponse.json({
    doctorName: row.doctorName,
    specialty: SPECIALTIES.find((s) => s.id === row.doctorSpecialty)?.label || row.doctorSpecialty,
    address: row.doctorAddress,
    startsAt: row.startsAt.toISOString(),
    status: row.status,
  });
}
