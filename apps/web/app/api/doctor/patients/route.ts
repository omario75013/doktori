import { NextResponse } from "next/server";
import { requireDoctorOrSecretary } from "@/lib/secretary-auth";
import { db, patients, appointments } from "@doktori/db";
import { eq, sql } from "drizzle-orm";

// ─── POST /api/doctor/patients ────────────────────────────────────────────────
// Create a patient manually. If phone already exists, links to the existing
// patient record instead of creating a duplicate.

export async function POST(req: Request) {
  const actor = await requireDoctorOrSecretary();
  if (actor instanceof NextResponse) return actor;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 });
  }

  const { name, phone, email, dateOfBirth } = body as Record<string, unknown>;

  if (typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Le nom est obligatoire" }, { status: 400 });
  }
  if (typeof phone !== "string" || phone.trim().length === 0) {
    return NextResponse.json({ error: "Le téléphone est obligatoire" }, { status: 400 });
  }

  const normalizedPhone = phone.replace(/\s+/g, "").trim();

  // Check if patient with this phone already exists — if so, link don't duplicate
  const [existing] = await db
    .select()
    .from(patients)
    .where(eq(patients.phone, normalizedPhone))
    .limit(1);

  if (existing) {
    return NextResponse.json({ ...existing, linked: true }, { status: 200 });
  }

  const insertValues: typeof patients.$inferInsert = {
    name: name.trim(),
    phone: normalizedPhone,
  };

  if (typeof email === "string" && email.trim().length > 0) {
    insertValues.email = email.trim().toLowerCase();
  }

  if (typeof dateOfBirth === "string" && dateOfBirth.trim().length > 0) {
    insertValues.dateOfBirth = dateOfBirth.trim();
  }

  const [created] = await db.insert(patients).values(insertValues).returning();

  return NextResponse.json({ ...created, linked: false }, { status: 201 });
}

// ─── GET /api/doctor/patients ─────────────────────────────────────────────────
// List all patients who have had appointments with this doctor.

export async function GET() {
  const actor = await requireDoctorOrSecretary();
  if (actor instanceof NextResponse) return actor;

  const result = await db.execute(sql`
    SELECT
      p.id,
      p.name,
      p.phone,
      p.email,
      p.date_of_birth AS "dateOfBirth",
      COUNT(a.id)::int AS total_visits,
      MAX(a.starts_at) AS last_visit
    FROM patients p
    INNER JOIN appointments a ON a.patient_id = p.id
    WHERE a.doctor_id = ${actor.doctorId}
    GROUP BY p.id, p.name, p.phone, p.email, p.date_of_birth
    ORDER BY last_visit DESC
    LIMIT 200
  `);

  return NextResponse.json(result);
}
