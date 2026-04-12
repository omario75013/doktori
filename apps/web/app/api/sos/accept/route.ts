import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@doktori/db";
import { sql } from "drizzle-orm";
import { broadcastSos } from "@/lib/sos-broadcast";
import { createPhoneProxy } from "@/lib/phone-proxy";
import { sendSMSWithRetry } from "@/lib/sos-lifecycle";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { sessionId } = await req.json();
  if (!sessionId) return NextResponse.json({ error: "sessionId requis" }, { status: 400 });

  // Atomic update with distance capture — only succeeds if session is still pending
  const result = await db.execute(sql`
    WITH updated AS (
      UPDATE sos_sessions
      SET status = 'accepted', doctor_id = ${session.user.id}, accepted_at = NOW(),
          distance_m = (
            SELECT ST_Distance(s.patient_location, d.location)::integer
            FROM sos_sessions s, doctors d
            WHERE s.id = ${sessionId} AND d.id = ${session.user.id}
          )
      WHERE id = ${sessionId} AND status = 'pending' AND expires_at > NOW()
      RETURNING id, patient_id
    )
    SELECT u.id, u.patient_id, d.name, d.phone, d.address,
           d.latitude AS doctor_lat, d.longitude AS doctor_lng,
           p.phone AS patient_phone
    FROM updated u
    JOIN doctors d ON d.id = ${session.user.id}
    JOIN patients p ON p.id = u.patient_id
  `);

  const info = (result as unknown as Array<{
    id: string;
    patient_id: string;
    name: string;
    phone: string;
    address: string;
    doctor_lat: string | null;
    doctor_lng: string | null;
    patient_phone: string;
  }>)[0];

  if (!info) {
    return NextResponse.json({ error: "Session déjà prise ou expirée" }, { status: 409 });
  }

  // Create phone proxy (dev mode just returns the real number)
  const proxy = await createPhoneProxy({
    sosSessionId: info.id,
    patientPhone: info.patient_phone,
    doctorPhone: info.phone,
    ttlMinutes: 60,
  });

  const displayPhone = proxy.success ? proxy.proxyNumber : info.phone;

  // Parallelize: broadcasts + SMS (don't block the doctor response)
  Promise.allSettled([
    broadcastSos(`session:${sessionId}`, "session-update", {
      status: "accepted",
      doctorName: info.name,
      doctorPhone: displayPhone,
      doctorAddress: info.address,
      doctorLatitude: info.doctor_lat,
      doctorLongitude: info.doctor_lng,
    }),
    broadcastSos("doctors-all", "request-taken", { sessionId }),
    sendSMSWithRetry(
      info.patient_phone,
      `Doktori SOS: ${info.name} accepte votre demande. Tel: ${displayPhone}. Adresse: ${info.address}`,
    ),
  ]);

  return NextResponse.json({ success: true });
}
