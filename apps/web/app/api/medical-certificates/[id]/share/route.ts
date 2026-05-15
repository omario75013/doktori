import { NextResponse, type NextRequest } from "next/server";
import { db, medicalCertificates, appointments } from "@doktori/db";
import { and, eq, inArray, ne } from "drizzle-orm";
import { requireAuth } from "@/lib/require-auth";

/**
 * PATCH /api/medical-certificates/[id]/share
 * Body: { doctorIds: string[] }
 *
 * Updates the shared_with_doctor_ids list on a medical certificate.
 * Only the owning doctor can share their own certificate.
 * The supplied doctorIds must all have ≥1 appointment with the same patient.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireAuth(req);
  if (!user || user.role !== "doctor") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;

  let body: { doctorIds?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }

  const { doctorIds } = body;
  if (
    !Array.isArray(doctorIds) ||
    doctorIds.some((d) => typeof d !== "string")
  ) {
    return NextResponse.json(
      { error: "doctorIds doit être un tableau de chaînes" },
      { status: 400 },
    );
  }

  // UUID format check
  const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (doctorIds.some((d) => !UUID_RE.test(d))) {
    return NextResponse.json({ error: "UUID invalide dans doctorIds" }, { status: 400 });
  }

  // Verify owning doctor + get patientId
  const [existing] = await db
    .select({
      id: medicalCertificates.id,
      doctorId: medicalCertificates.doctorId,
      patientId: medicalCertificates.patientId,
    })
    .from(medicalCertificates)
    .where(
      and(
        eq(medicalCertificates.id, id),
        eq(medicalCertificates.doctorId, user.id),
      ),
    )
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "Certificat introuvable" }, { status: 404 });
  }

  // Validate that all supplied doctorIds have ≥1 appointment with this patient
  if (doctorIds.length > 0) {
    const validRows = await db
      .selectDistinct({ doctorId: appointments.doctorId })
      .from(appointments)
      .where(
        and(
          eq(appointments.patientId, existing.patientId),
          inArray(appointments.doctorId, doctorIds),
          ne(appointments.doctorId, user.id),
        ),
      );
    const validIds = new Set(validRows.map((r) => r.doctorId));
    const invalid = doctorIds.filter((d) => !validIds.has(d));
    if (invalid.length > 0) {
      return NextResponse.json(
        { error: "Certains médecins ne sont pas associés à ce patient" },
        { status: 400 },
      );
    }
  }

  const [updated] = await db
    .update(medicalCertificates)
    .set({ sharedWithDoctorIds: doctorIds })
    .where(eq(medicalCertificates.id, id))
    .returning({
      id: medicalCertificates.id,
      sharedWithDoctorIds: medicalCertificates.sharedWithDoctorIds,
    });

  return NextResponse.json({ ok: true, sharedWithDoctorIds: updated.sharedWithDoctorIds });
}
