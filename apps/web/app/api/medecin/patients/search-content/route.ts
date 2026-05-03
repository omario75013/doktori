import { NextRequest, NextResponse } from "next/server";
import { requireDoctorOrSecretaryUnified } from "@/lib/require-auth";
import { db } from "@doktori/db";
import { sql } from "drizzle-orm";

/**
 * POST /api/medecin/patients/search-content
 * Body: { q: string }  (min 3 chars)
 *
 * Searches consultation notes (subjective, objective, assessment, plan)
 * and prescriptions (content) for the authenticated doctor.
 * Returns { patientIds: string[] }
 */
export async function POST(req: NextRequest) {
  const actor = await requireDoctorOrSecretaryUnified(req);
  if (actor instanceof Response) return actor;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 });
  }

  const { q } = body as Record<string, unknown>;

  if (typeof q !== "string" || q.trim().length < 3) {
    return NextResponse.json(
      { error: "Le terme de recherche doit contenir au moins 3 caractères" },
      { status: 400 }
    );
  }

  const pattern = `%${q.trim()}%`;
  const doctorId = actor.doctorId;

  const rows = await db.execute(sql`
    SELECT DISTINCT patient_id::text AS "patientId"
    FROM consultation_notes
    WHERE doctor_id = ${doctorId}
      AND (
        subjective ILIKE ${pattern}
        OR objective ILIKE ${pattern}
        OR assessment ILIKE ${pattern}
        OR plan ILIKE ${pattern}
      )
    UNION
    SELECT DISTINCT patient_id::text AS "patientId"
    FROM prescriptions
    WHERE doctor_id = ${doctorId}
      AND content ILIKE ${pattern}
  `);

  const patientIds = (rows as unknown as Array<{ patientId: string }>).map((r) => r.patientId);

  return NextResponse.json({ patientIds });
}
