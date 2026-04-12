import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@doktori/db";
import { sql } from "drizzle-orm";
import { signSosToken } from "@/lib/sos-hmac";
import { finalizeSosSession, sendSMSWithRetry } from "@/lib/sos-lifecycle";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await req.json();
  const { sessionId, fee: bodyFee } = body;

  if (!sessionId) {
    return NextResponse.json({ error: "sessionId requis" }, { status: 400 });
  }

  const sessionResult = await db.execute(sql`
    SELECT s.id, s.patient_id, s.status,
           d.name AS doctor_name, d.sos_fee, p.phone AS patient_phone
    FROM sos_sessions s
    JOIN doctors d ON d.id = ${session.user.id}
    JOIN patients p ON p.id = s.patient_id
    WHERE s.id = ${sessionId}
      AND s.doctor_id = ${session.user.id}
      AND s.status = 'accepted'
    LIMIT 1
  `);

  const sosSession = (sessionResult as unknown as Array<{
    id: string;
    patient_id: string;
    status: string;
    doctor_name: string;
    sos_fee: number | null;
    patient_phone: string;
  }>)[0];

  if (!sosSession) {
    return NextResponse.json({ error: "Session introuvable ou non acceptée" }, { status: 404 });
  }

  const commissionRate = parseFloat(process.env.SOS_COMMISSION_RATE || "0.10");
  if (isNaN(commissionRate) || commissionRate < 0 || commissionRate > 1) {
    return NextResponse.json({ error: "SOS_COMMISSION_RATE invalide" }, { status: 500 });
  }
  const fee = bodyFee ?? sosSession.sos_fee ?? 0;
  const commission = Math.round(fee * commissionRate);

  await db.execute(sql`
    UPDATE sos_sessions
    SET status = 'completed', completed_at = NOW(),
        fee = ${fee}, commission = ${commission}, resolution = 'completed'
    WHERE id = ${sessionId} AND doctor_id = ${session.user.id} AND status = 'accepted'
  `);

  // Parallelize proxy cleanup + broadcast (don't block response)
  const reviewUrl = `${process.env.NEXTAUTH_URL}/avis-sos/${sessionId}?sig=${signSosToken(sessionId)}`;
  const smsText = `Doktori SOS: Consultation terminée. Donnez votre avis: ${reviewUrl}`;

  finalizeSosSession(sessionId, "completed", { doctorName: sosSession.doctor_name });
  sendSMSWithRetry(sosSession.patient_phone, smsText);

  return NextResponse.json({ success: true, fee, commission });
}
