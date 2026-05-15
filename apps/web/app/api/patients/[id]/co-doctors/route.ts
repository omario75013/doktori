import { NextResponse, type NextRequest } from "next/server";
import { db, appointments, doctors } from "@doktori/db";
import { and, eq, inArray, ne } from "drizzle-orm";
import { requireAuth } from "@/lib/require-auth";

/**
 * GET /api/patients/[id]/co-doctors
 *
 * Returns other doctors who have ≥1 appointment with this patient
 * (excluding the requesting doctor). Used to populate the sharing
 * popover on prescriptions and certificates.
 *
 * Auth: requesting doctor must have ≥1 appointment with this patient.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireAuth(req);
  if (!user || user.role !== "doctor") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id: patientId } = await params;

  // Verify requesting doctor has seen this patient
  const [own] = await db
    .select({ id: appointments.id })
    .from(appointments)
    .where(
      and(
        eq(appointments.patientId, patientId),
        eq(appointments.doctorId, user.id),
      ),
    )
    .limit(1);

  if (!own) {
    return NextResponse.json({ error: "Patient non lié au médecin" }, { status: 403 });
  }

  // Find other doctors who also have ≥1 appointment with the same patient
  const otherDoctorRows = await db
    .selectDistinct({ doctorId: appointments.doctorId })
    .from(appointments)
    .where(
      and(
        eq(appointments.patientId, patientId),
        ne(appointments.doctorId, user.id),
      ),
    );

  if (otherDoctorRows.length === 0) {
    return NextResponse.json([]);
  }

  const doctorIds = otherDoctorRows.map((r) => r.doctorId);

  const rows = await db
    .select({
      id: doctors.id,
      name: doctors.name,
      specialty: doctors.specialty,
    })
    .from(doctors)
    .where(inArray(doctors.id, doctorIds));

  return NextResponse.json(rows);
}
