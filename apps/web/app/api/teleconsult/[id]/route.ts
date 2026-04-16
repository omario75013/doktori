import { NextRequest, NextResponse } from "next/server";
import { db, teleconsultations } from "@doktori/db";
import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { getPatientFromRequest } from "@/lib/patient-auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const session = await auth();
  const patient = getPatientFromRequest(req);
  const doctorId = session?.user?.id ?? null;
  const patientId = patient?.id ?? null;

  if (!doctorId && !patientId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const apptRows = await db.execute(sql`
    SELECT id, type, payment_status, doctor_id, patient_id
    FROM appointments WHERE id = ${id} LIMIT 1
  `);
  const appt = (apptRows as unknown as Array<{
    id: string;
    type: string;
    payment_status: string | null;
    doctor_id: string;
    patient_id: string;
  }>)[0];

  if (!appt) return NextResponse.json({ error: "Rendez-vous introuvable" }, { status: 404 });

  const isParticipant =
    (doctorId && appt.doctor_id === doctorId) ||
    (patientId && appt.patient_id === patientId);

  if (!isParticipant) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  if (appt.type === "teleconsult" && appt.payment_status !== "paid") {
    return NextResponse.json(
      { error: "Paiement requis pour accéder à la téléconsultation" },
      { status: 402 }
    );
  }

  const [tc] = await db.select().from(teleconsultations)
    .where(eq(teleconsultations.appointmentId, id))
    .limit(1);

  if (!tc) return NextResponse.json({ error: "Téléconsultation introuvable" }, { status: 404 });
  return NextResponse.json({
    roomName: tc.roomName,
    roomUrl: `https://meet.jit.si/${tc.roomName}`,
    startedAt: tc.startedAt,
    endedAt: tc.endedAt,
  });
}
