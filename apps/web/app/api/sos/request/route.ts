import { NextRequest, NextResponse } from "next/server";
import { db, patients } from "@doktori/db";
import { sql, eq } from "drizzle-orm";
import { formatPhone } from "@doktori/shared";

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
  return NextResponse.json({ sessionId }, { status: 201 });
}
