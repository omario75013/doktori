import { type NextRequest, NextResponse } from "next/server";
import { requireDoctorOrSecretaryUnified } from "@/lib/require-auth";
import { db, patients } from "@doktori/db";
import { assertPlanLimit, PlanLimitError } from "@/lib/plan-gates";
import { resolveOrCreatePatient } from "@/lib/patient-identity";
import { eq, sql } from "drizzle-orm";

// GET /api/secretaire/patients
// Returns all patients who have had appointments with this secretary's doctor
export async function GET(req: NextRequest) {
  const ctx = await requireDoctorOrSecretaryUnified(req);
  if (ctx instanceof Response) return ctx;
  const secretary = { doctorId: ctx.doctorId };

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
    WHERE a.doctor_id = ${secretary.doctorId}
    GROUP BY p.id, p.name, p.phone, p.email, p.date_of_birth
    ORDER BY last_visit DESC
    LIMIT 200
  `);

  return NextResponse.json(result);
}

// POST /api/secretaire/patients
// Create or link a patient manually
export async function POST(req: NextRequest) {
  const ctx = await requireDoctorOrSecretaryUnified(req);
  if (ctx instanceof Response) return ctx;
  const secretary = { doctorId: ctx.doctorId };

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

  const cin = typeof (body as Record<string, unknown>).cin === "string"
    ? ((body as Record<string, unknown>).cin as string).trim() || null
    : null;

  // resolveOrCreatePatient handles CIN → phone → email match-or-create.
  // Only charge the plan limit if we are actually creating a new patient.
  const { patientId, matched } = await resolveOrCreatePatient({
    cin,
    phone: typeof phone === "string" ? phone : null,
    email: typeof email === "string" ? email : null,
    name: (name as string).trim(),
    dateOfBirth: typeof dateOfBirth === "string" && dateOfBirth.trim() ? dateOfBirth.trim() : null,
  });

  if (matched !== null) {
    // Existing patient found — no plan limit charge.
    const [existing] = await db
      .select()
      .from(patients)
      .where(eq(patients.id, patientId))
      .limit(1);
    return NextResponse.json({ ...existing, linked: true }, { status: 200 });
  }

  // New patient created — enforce plan limit.
  try {
    await assertPlanLimit(secretary.doctorId, "patients");
  } catch (e) {
    if (e instanceof PlanLimitError) {
      return NextResponse.json(
        { error: "PLAN_LIMIT_REACHED", resource: e.resource, current: e.current, max: e.max },
        { status: 402 }
      );
    }
    throw e;
  }

  const [created] = await db
    .select()
    .from(patients)
    .where(eq(patients.id, patientId))
    .limit(1);

  return NextResponse.json({ ...created, linked: false }, { status: 201 });
}
