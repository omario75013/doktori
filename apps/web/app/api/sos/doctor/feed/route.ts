import { NextResponse } from "next/server";
import { requireDoctor } from "@/lib/doctor-auth";
import { db } from "@doktori/db";
import { sql } from "drizzle-orm";

export async function GET() {
  const doctor = await requireDoctor();
  if (doctor instanceof NextResponse) return doctor;

  // Find pending SOS sessions within the doctor's radius
  const result = await db.execute(sql`
    SELECT
      s.id, s.symptom_category, s.description, s.requested_at, s.expires_at,
      p.name AS patient_name,
      ST_Distance(s.patient_location, d.location) AS distance_m
    FROM sos_sessions s
    INNER JOIN doctors d ON d.id = ${doctor.id}
    INNER JOIN patients p ON p.id = s.patient_id
    WHERE s.status = 'pending'
      AND s.expires_at > NOW()
      AND d.sos_available = true
      AND d.location IS NOT NULL
      AND ST_DWithin(s.patient_location, d.location, d.sos_radius_km * 1000)
      AND NOT EXISTS (
        SELECT 1 FROM sos_declines sd
        WHERE sd.session_id = s.id AND sd.doctor_id = ${doctor.id}
      )
      AND (d.sos_available_from IS NULL OR (
        CASE WHEN d.sos_available_from <= d.sos_available_to
          THEN LOCALTIME AT TIME ZONE 'Africa/Tunis' BETWEEN d.sos_available_from AND d.sos_available_to
          ELSE LOCALTIME AT TIME ZONE 'Africa/Tunis' >= d.sos_available_from
               OR LOCALTIME AT TIME ZONE 'Africa/Tunis' <= d.sos_available_to
        END
      ))
    ORDER BY s.requested_at ASC
    LIMIT 20
  `);

  return NextResponse.json(result);
}
