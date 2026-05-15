import { NextResponse, NextRequest } from "next/server";
import { requireDoctorOrSecretaryUnified } from "@/lib/require-auth";
import { db, patients, appointments } from "@doktori/db";
import { eq, sql } from "drizzle-orm";
import { resolveOrCreatePatient } from "@/lib/patient-identity";

export async function POST(req: NextRequest) {
  const actor = await requireDoctorOrSecretaryUnified(req);
  if (actor instanceof Response) return actor;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 });
  }

  const { name, phone, email, dateOfBirth, cin, gender } = body as Record<string, unknown>;

  if (typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Le nom est obligatoire" }, { status: 400 });
  }
  if (typeof phone !== "string" || phone.trim().length === 0) {
    return NextResponse.json({ error: "Le téléphone est obligatoire" }, { status: 400 });
  }

  // Use identity resolver: CIN → phone → email → create
  const { patientId, matched } = await resolveOrCreatePatient({
    cin: typeof cin === "string" && cin.trim() ? cin.trim() : null,
    phone: phone,
    email: typeof email === "string" && email.trim() ? email : null,
    name: name.trim(),
    dateOfBirth: typeof dateOfBirth === "string" && dateOfBirth.trim() ? dateOfBirth.trim() : null,
    gender: typeof gender === "string" && gender.trim() ? gender.trim() : null,
  });

  // Fetch the full patient row to return
  const [patientRow] = await db
    .select()
    .from(patients)
    .where(eq(patients.id, patientId))
    .limit(1);

  return NextResponse.json(
    { ...patientRow, linked: matched !== null },
    { status: matched !== null ? 200 : 201 }
  );
}

// ─── GET /api/doctor/patients ─────────────────────────────────────────────────
// List all patients who have had appointments with this doctor. Accepts both
// NextAuth cookie (web) and Bearer JWT (mobile) via the unified guard.

export async function GET(req: NextRequest) {
  const authz = await requireDoctorOrSecretaryUnified(req);
  if (authz instanceof Response) return authz;

  const rows = await db.execute(sql`
    SELECT
      p.id,
      p.name,
      p.phone,
      p.email,
      p.date_of_birth    AS "dateOfBirth",
      p.gender,
      p.blood_type       AS "bloodType",
      p.cin,
      p.cnam_number      AS "cnamNumber",
      p.no_show_count    AS "noShowCount",
      p.last_minute_cancel_count AS "lastMinuteCancelCount",
      COUNT(a.id)::int   AS "appointmentCount",
      MAX(a.starts_at)   AS "lastAppointmentAt"
    FROM patients p
    INNER JOIN appointments a ON a.patient_id = p.id
    WHERE a.doctor_id = ${authz.doctorId}
      AND p.deleted_at IS NULL
    GROUP BY p.id, p.name, p.phone, p.email, p.date_of_birth,
             p.gender, p.blood_type, p.cin, p.cnam_number,
             p.no_show_count, p.last_minute_cancel_count
    ORDER BY MAX(a.starts_at) DESC
    LIMIT 200
  `);

  return NextResponse.json(rows);
}
