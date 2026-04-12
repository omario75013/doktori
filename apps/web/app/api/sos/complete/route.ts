import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@doktori/db";
import { sql } from "drizzle-orm";
import { sendSMS } from "@/lib/sms";
import { broadcastSos } from "@/lib/sos-broadcast";
import { closePhoneProxy } from "@/lib/phone-proxy";
import { signSosToken } from "@/lib/sos-hmac";

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

  // Verify session is accepted and belongs to this doctor
  const sessionResult = await db.execute(sql`
    SELECT s.id, s.patient_id, s.status,
           d.name AS doctor_name, d.phone AS doctor_phone,
           d.sos_fee, p.phone AS patient_phone
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
    doctor_phone: string;
    sos_fee: number | null;
    patient_phone: string;
  }>)[0];

  if (!sosSession) {
    return NextResponse.json({ error: "Session introuvable ou non acceptée" }, { status: 404 });
  }

  const commissionRate = parseFloat(process.env.SOS_COMMISSION_RATE || "0.10");
  const fee = bodyFee ?? sosSession.sos_fee ?? 0;
  const commission = Math.round(fee * commissionRate);

  // Mark session completed
  await db.execute(sql`
    UPDATE sos_sessions
    SET status = 'completed',
        completed_at = NOW(),
        fee = ${fee},
        commission = ${commission},
        resolution = 'completed'
    WHERE id = ${sessionId}
      AND doctor_id = ${session.user.id}
      AND status = 'accepted'
  `);

  // Close phone proxy (best effort)
  try {
    await closePhoneProxy(sessionId);
  } catch (e) {
    console.error("[SOS-COMPLETE] closePhoneProxy failed:", e);
  }

  // Broadcast completion to patient
  await broadcastSos(`session:${sessionId}`, "session-update", {
    status: "completed",
    doctorName: sosSession.doctor_name,
  });

  // Send SMS review link to patient
  const reviewUrl = `${process.env.NEXTAUTH_URL}/avis-sos/${sessionId}?sig=${signSosToken(sessionId)}`;
  const smsText = `Doktori SOS: Consultation terminée. Donnez votre avis: ${reviewUrl}`;

  const smsResult = await sendSMS(sosSession.patient_phone, smsText);
  if (!smsResult.success) {
    // Fire-and-forget retry after 5 seconds
    setTimeout(() => {
      sendSMS(sosSession.patient_phone, smsText).catch(() => {});
    }, 5000);
  }

  return NextResponse.json({ success: true, fee, commission });
}
