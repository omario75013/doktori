import { NextResponse, NextRequest } from "next/server";
import {
  db,
  patientMedicalProfile,
  clinicDoctors,
  clinics,
  appointments,
} from "@doktori/db";
import { eq, and, inArray, sql } from "drizzle-orm";
import { requireAuth } from "@/lib/require-auth";

const VALID_SECTIONS = [
  "profile",
  "allergies",
  "vaccinations",
  "analyses",
  "prescriptions",
  "certificates",
  "documents",
  "labOrders",
] as const;

type SectionKey = (typeof VALID_SECTIONS)[number];

// ── GET /api/medecin/patients/[id]/clinic-sharing ─────────────────────────────
// Returns clinic sharing flags for all clinics the doctor belongs to,
// along with clinic names (for display in the UI).
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth(req);
  if (!user || user.role !== "doctor") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id: patientId } = await params;

  // Clinics this doctor belongs to
  const clinicRows = await db
    .select({
      clinicId: clinicDoctors.clinicId,
      clinicName: clinics.name,
    })
    .from(clinicDoctors)
    .innerJoin(clinics, eq(clinicDoctors.clinicId, clinics.id))
    .where(eq(clinicDoctors.doctorId, user.id));

  if (clinicRows.length === 0) {
    return NextResponse.json({ clinics: [] });
  }

  const clinicIds = clinicRows.map((r) => r.clinicId);

  // Check patient has at least one appointment with this doctor at any of these clinics
  const [apptCheck] = await db
    .select({ id: appointments.id })
    .from(appointments)
    .where(
      and(
        eq(appointments.patientId, patientId),
        eq(appointments.doctorId, user.id)
      )
    )
    .limit(1);

  if (!apptCheck) {
    return NextResponse.json({ clinics: [] });
  }

  // Fetch current sharing flags
  const [profile] = await db
    .select({ sharedWithClinics: patientMedicalProfile.sharedWithClinics })
    .from(patientMedicalProfile)
    .where(eq(patientMedicalProfile.patientId, patientId))
    .limit(1);

  const flags = (profile?.sharedWithClinics ?? {}) as Record<
    string,
    Record<string, boolean>
  >;

  // Build per-clinic section flags (missing key → all true by default)
  const result = clinicRows
    .filter((c) => clinicIds.includes(c.clinicId))
    .map((c) => {
      const clinicFlags = flags[c.clinicId];
      const sections: Record<string, boolean> = {};
      for (const section of VALID_SECTIONS) {
        sections[section] =
          clinicFlags === undefined || clinicFlags[section] !== false;
      }
      return {
        clinicId: c.clinicId,
        clinicName: c.clinicName,
        sections,
      };
    });

  return NextResponse.json({ clinics: result });
}

// ── PATCH /api/medecin/patients/[id]/clinic-sharing ───────────────────────────
// Toggle one section's sharing flag for a given clinic.
// Body: { clinicId: string, section: SectionKey, value: boolean }
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth(req);
  if (!user || user.role !== "doctor") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id: patientId } = await params;

  const body = (await req.json()) as {
    clinicId: string;
    section: SectionKey;
    value: boolean;
  };

  const { clinicId, section, value } = body;

  if (!clinicId || !VALID_SECTIONS.includes(section) || typeof value !== "boolean") {
    return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
  }

  // Verify doctor is in this clinic
  const [clinicDoctorRow] = await db
    .select({ doctorId: clinicDoctors.doctorId })
    .from(clinicDoctors)
    .where(
      and(
        eq(clinicDoctors.clinicId, clinicId),
        eq(clinicDoctors.doctorId, user.id)
      )
    )
    .limit(1);

  if (!clinicDoctorRow) {
    return NextResponse.json(
      { error: "Médecin non membre de cette clinique" },
      { status: 403 }
    );
  }

  // Verify doctor has at least one appointment with this patient
  const [apptCheck] = await db
    .select({ id: appointments.id })
    .from(appointments)
    .where(
      and(
        eq(appointments.patientId, patientId),
        eq(appointments.doctorId, user.id)
      )
    )
    .limit(1);

  if (!apptCheck) {
    return NextResponse.json(
      { error: "Aucun rendez-vous avec ce patient" },
      { status: 404 }
    );
  }

  // Fetch or upsert the medical profile row
  const [existingProfile] = await db
    .select({ id: patientMedicalProfile.id, sharedWithClinics: patientMedicalProfile.sharedWithClinics })
    .from(patientMedicalProfile)
    .where(eq(patientMedicalProfile.patientId, patientId))
    .limit(1);

  if (!existingProfile) {
    // No profile yet — create one with the single flag
    const newFlags: Record<string, Record<string, boolean>> = {
      [clinicId]: { [section]: value },
    };
    await db.insert(patientMedicalProfile).values({
      patientId,
      sharedWithClinics: newFlags,
    });
  } else {
    // Update the specific section flag using jsonb path
    // We use a raw SQL jsonb merge to avoid a race condition read-modify-write
    await db
      .update(patientMedicalProfile)
      .set({
        sharedWithClinics: sql`
          jsonb_set(
            COALESCE(shared_with_clinics, '{}'),
            ${sql.raw(`'{${clinicId},${section}}'`)},
            ${value ? "true" : "false"}::jsonb,
            true
          )
        `,
        updatedAt: new Date(),
      })
      .where(eq(patientMedicalProfile.id, existingProfile.id));
  }

  return NextResponse.json({ ok: true });
}
