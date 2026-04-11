import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@doktori/db";
import { sql } from "drizzle-orm";
import { sendSMS } from "@/lib/sms";
import { broadcastSos } from "@/lib/sos-broadcast";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { sessionId } = await req.json();
  if (!sessionId) return NextResponse.json({ error: "sessionId requis" }, { status: 400 });

  // Atomic update: only succeeds if session is still pending
  const result = await db.execute(sql`
    UPDATE sos_sessions
    SET status = 'accepted', doctor_id = ${session.user.id}, accepted_at = NOW()
    WHERE id = ${sessionId} AND status = 'pending' AND expires_at > NOW()
    RETURNING id, patient_id
  `);

  const updated = (result as unknown as Array<{ id: string; patient_id: string }>)[0];
  if (!updated) {
    return NextResponse.json({ error: "Session déjà prise ou expirée" }, { status: 409 });
  }

  // Send SMS to patient with the doctor's details
  const doctorResult = await db.execute(sql`
    SELECT d.name, d.phone, d.address, p.phone AS patient_phone
    FROM doctors d, patients p
    WHERE d.id = ${session.user.id} AND p.id = ${updated.patient_id}
    LIMIT 1
  `);
  const info = (doctorResult as unknown as any[])[0];

  if (info) {
    try {
      await sendSMS(
        info.patient_phone,
        `Doktori SOS: ${info.name} accepte votre demande. Tel: ${info.phone}. Adresse: ${info.address}`,
      );
    } catch (e) {
      console.error("SMS failed:", e);
    }

    // Notify the patient in real-time that their session was accepted
    await broadcastSos(`session:${sessionId}`, "session-update", {
      status: "accepted",
      doctorName: info.name,
      doctorPhone: info.phone,
      doctorAddress: info.address,
    });
  }

  return NextResponse.json({ success: true });
}
