import { NextResponse } from "next/server";
import { requireDoctor } from "@/lib/doctor-auth";
import { db } from "@doktori/db";
import { sql } from "drizzle-orm";
import { signSosToken } from "@/lib/sos-hmac";
import { finalizeSosSession, sendSMSWithRetry } from "@/lib/sos-lifecycle";

export async function POST(req: Request) {
  const doctor = await requireDoctor();
  if (doctor instanceof NextResponse) return doctor;

  const body = await req.json();
  const { sessionId, fee: bodyFee } = body;

  if (!sessionId) {
    return NextResponse.json({ error: "sessionId requis" }, { status: 400 });
  }

  const sessionResult = await db.execute(sql`
    SELECT s.id, s.patient_id, s.status,
           d.name AS doctor_name, d.sos_fee, p.phone AS patient_phone
    FROM sos_sessions s
    JOIN doctors d ON d.id = ${doctor.id}
    JOIN patients p ON p.id = s.patient_id
    WHERE s.id = ${sessionId}
      AND s.doctor_id = ${doctor.id}
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
    WHERE id = ${sessionId} AND doctor_id = ${doctor.id} AND status = 'accepted'
  `);

  // Credit doctor wallet (fee minus commission)
  if (fee > 0) {
    const credit = fee - commission;
    await db.execute(sql`
      INSERT INTO wallet_transactions (doctor_id, type, amount, description, created_at)
      VALUES (${doctor.id}, 'credit', ${credit}, ${'SOS consultation — ' + fee / 1000 + ' DT'}, NOW())
    `);
    await db.execute(sql`
      INSERT INTO wallet_transactions (doctor_id, type, amount, description, created_at)
      VALUES (${doctor.id}, 'commission', ${-commission}, ${'Commission SOS 10%'}, NOW())
    `);
    await db.execute(sql`
      UPDATE doctor_wallets
      SET balance = balance + ${credit},
          total_earned = total_earned + ${fee},
          total_commission = total_commission + ${commission},
          updated_at = NOW()
      WHERE doctor_id = ${doctor.id}
    `);
  }

  // Parallelize proxy cleanup + broadcast (don't block response)
  const reviewUrl = `${process.env.NEXTAUTH_URL}/avis-sos/${sessionId}?sig=${signSosToken(sessionId)}`;
  const smsText = `Doktori SOS: Consultation terminée. Donnez votre avis: ${reviewUrl}`;

  finalizeSosSession(sessionId, "completed", { doctorName: sosSession.doctor_name });
  sendSMSWithRetry(sosSession.patient_phone, smsText);

  return NextResponse.json({ success: true, fee, commission });
}
