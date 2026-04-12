import { NextRequest, NextResponse } from "next/server";
import { db, patients, sosSessions } from "@doktori/db";
import { sql, eq, and, gte, count } from "drizzle-orm";
import { formatPhone } from "@doktori/shared";
import { broadcastSos } from "@/lib/sos-broadcast";
import { signSosToken } from "@/lib/sos-hmac";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { patientName, patientPhone, latitude, longitude, symptomCategory, description } = body;

  if (
    !patientName ||
    !patientPhone ||
    typeof latitude !== "number" ||
    typeof longitude !== "number"
  ) {
    return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
  }

  const phone = formatPhone(patientPhone);

  // Upsert patient
  let [patient] = await db.select().from(patients).where(eq(patients.phone, phone)).limit(1);
  if (!patient) {
    [patient] = await db.insert(patients).values({ name: patientName, phone }).returning();
  }

  // Rate limit: max 3 SOS requests per 30 minutes per patient
  const windowStart = new Date(Date.now() - 30 * 60 * 1000);
  const [recentCount] = await db
    .select({ total: count(sosSessions.id) })
    .from(sosSessions)
    .where(and(
      eq(sosSessions.patientId, patient.id),
      gte(sosSessions.requestedAt, windowStart),
    ));

  if ((recentCount?.total ?? 0) >= 3) {
    return NextResponse.json(
      { error: "Trop de demandes SOS. Veuillez patienter 30 minutes avant de réessayer." },
      { status: 429 }
    );
  }

  // Create SOS session (expires in 30 min)
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

  // Insert with raw SQL to populate the GEOGRAPHY column
  const result = await db.execute(sql`
    INSERT INTO sos_sessions (
      patient_id, patient_lat, patient_lng, patient_location,
      symptom_category, description, status, expires_at
    ) VALUES (
      ${patient.id}, ${latitude}, ${longitude},
      ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography,
      ${symptomCategory || null}, ${description || null}, 'pending', ${expiresAt.toISOString()}
    )
    RETURNING id
  `);

  const sessionId = (result as unknown as Array<{ id: string }>)[0]?.id;

  // Notify all available SOS doctors in real-time (they filter by location in their feed)
  await broadcastSos("doctors-all", "new-request", { sessionId });

  return NextResponse.json({ sessionId, token: signSosToken(sessionId) }, { status: 201 });
}
