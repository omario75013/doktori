import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@doktori/db";
import { sql } from "drizzle-orm";
import { sendSMS } from "@/lib/sms";
import { broadcastSos } from "@/lib/sos-broadcast";
import { createPhoneProxy } from "@/lib/phone-proxy";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { sessionId } = await req.json();
  if (!sessionId) return NextResponse.json({ error: "sessionId requis" }, { status: 400 });

  // Atomic update: only succeeds if session is still pending
  const result = await db.execute(sql`
    UPDATE sos_sessions
    SET status = 'accepted',
        doctor_id = ${session.user.id},
        accepted_at = NOW(),
        distance_m = (
          SELECT ST_Distance(s.patient_location, d.location)::integer
          FROM sos_sessions s, doctors d
          WHERE s.id = ${sessionId} AND d.id = ${session.user.id}
        )
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
    // Create phone proxy (dev mode just returns the real number)
    const proxy = await createPhoneProxy({
      sosSessionId: updated.id,
      patientPhone: info.patient_phone,
      doctorPhone: info.phone,
      ttlMinutes: 60,
    });

    const displayPhone = proxy.success ? proxy.proxyNumber : info.phone;

    const smsText = `Doktori SOS: ${info.name} accepte votre demande. Tel: ${displayPhone}. Adresse: ${info.address}`;
    const smsResult = await sendSMS(info.patient_phone, smsText);
    if (!smsResult.success) {
      // Fire-and-forget retry after 5 seconds
      setTimeout(() => {
        sendSMS(info.patient_phone, smsText).catch(() => {});
      }, 5000);
    }

    // Notify the patient in real-time that their session was accepted
    // Use the masked phone if a proxy was created, fall back to real phone
    await broadcastSos(`session:${sessionId}`, "session-update", {
      status: "accepted",
      doctorName: info.name,
      doctorPhone: displayPhone,
      doctorAddress: info.address,
    });

    // Notify all doctors that this request has been taken
    await broadcastSos("doctors-all", "request-taken", { sessionId });
  }

  return NextResponse.json({ success: true });
}
