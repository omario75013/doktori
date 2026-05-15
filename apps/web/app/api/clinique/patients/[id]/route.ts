import { NextResponse } from "next/server";
import {
  db,
  patients,
  patientMedicalProfile,
  patientAllergies,
  patientVaccinations,
  patientAnalyses,
  prescriptions,
  medicalCertificates,
  patientDocuments,
  appointments,
  labOrders,
  clinicDoctors,
  clinics,
  labs,
  doctors,
  doctorPractices,
} from "@doktori/db";
import { eq, desc, inArray, and, max, sql } from "drizzle-orm";
import { requireClinic } from "@/lib/clinic-auth";
import { assertPatientBelongsToClinic } from "@/lib/clinic-membership";

/** Returns true unless flags[clinicId][section] === false explicitly. */
function isSectionShared(
  flags: Record<string, Record<string, boolean>>,
  clinicId: string,
  section: string
): boolean {
  const clinicFlags = flags[clinicId];
  if (clinicFlags === undefined) return true; // no flags = all shared
  return clinicFlags[section] !== false;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const clinic = await requireClinic();
  if (clinic instanceof NextResponse) return clinic;

  const { id: patientId } = await params;

  try {
    await assertPatientBelongsToClinic(patientId, clinic.id);
  } catch {
    return NextResponse.json({ error: "Patient introuvable" }, { status: 404 });
  }

  // ── Resolve clinic doctor IDs (needed for access-control filtering) ──────────
  const clinicDoctorRows = await db
    .select({ doctorId: clinicDoctors.doctorId })
    .from(clinicDoctors)
    .where(eq(clinicDoctors.clinicId, clinic.id));
  const clinicDoctorIds = clinicDoctorRows.map((r) => r.doctorId);

  // ── Patient basic info (only non-PII fields) ─────────────────────────────────
  const [patientRow] = await db
    .select({
      id: patients.id,
      name: patients.name,
      dateOfBirth: patients.dateOfBirth,
      gender: patients.gender,
      bloodType: patients.bloodType,
    })
    .from(patients)
    .where(eq(patients.id, patientId))
    .limit(1);

  if (!patientRow) {
    return NextResponse.json({ error: "Patient introuvable" }, { status: 404 });
  }

  // Compute age in years from dateOfBirth
  let ageYears: number | null = null;
  if (patientRow.dateOfBirth) {
    const dob = new Date(patientRow.dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const mDiff = today.getMonth() - dob.getMonth();
    if (mDiff < 0 || (mDiff === 0 && today.getDate() < dob.getDate())) age--;
    ageYears = age;
  }

  const patient = {
    id: patientRow.id,
    name: patientRow.name,
    ageYears,
    gender: patientRow.gender,
    bloodType: patientRow.bloodType,
  };

  // ── Medical profile ──────────────────────────────────────────────────────────
  const [medicalProfile] = await db
    .select()
    .from(patientMedicalProfile)
    .where(eq(patientMedicalProfile.patientId, patientId))
    .limit(1);

  // ── Allergies ────────────────────────────────────────────────────────────────
  const allergies = await db
    .select()
    .from(patientAllergies)
    .where(eq(patientAllergies.patientId, patientId))
    .orderBy(desc(patientAllergies.createdAt));

  // ── Vaccinations ─────────────────────────────────────────────────────────────
  const vaccinations = await db
    .select()
    .from(patientVaccinations)
    .where(eq(patientVaccinations.patientId, patientId))
    .orderBy(desc(patientVaccinations.dateReceived));

  // ── Analyses ─────────────────────────────────────────────────────────────────
  const analyses = await db
    .select()
    .from(patientAnalyses)
    .where(eq(patientAnalyses.patientId, patientId))
    .orderBy(desc(patientAnalyses.testDate));

  // ── Prescriptions ────────────────────────────────────────────────────────────
  const prescrRows = await db
    .select()
    .from(prescriptions)
    .where(eq(prescriptions.patientId, patientId))
    .orderBy(desc(prescriptions.createdAt))
    .limit(100);

  // ── Certificates ─────────────────────────────────────────────────────────────
  const certificates = await db
    .select()
    .from(medicalCertificates)
    .where(eq(medicalCertificates.patientId, patientId))
    .orderBy(desc(medicalCertificates.createdAt))
    .limit(100);

  // ── Documents ────────────────────────────────────────────────────────────────
  // Visible if:
  //  (a) at least one clinic doctor is in sharedWithDoctorIds  — own documents
  //  (b) our clinic id is in sharedWithClinicIds               — inter-clinic shared
  const allDocRows = await db
    .select({
      id: patientDocuments.id,
      patientId: patientDocuments.patientId,
      uploadedBy: patientDocuments.uploadedBy,
      uploadedByDoctorId: patientDocuments.uploadedByDoctorId,
      uploadedByLabId: patientDocuments.uploadedByLabId,
      labOrderId: patientDocuments.labOrderId,
      sharedWithDoctorIds: patientDocuments.sharedWithDoctorIds,
      sharedWithClinicIds: patientDocuments.sharedWithClinicIds,
      fileUrl: patientDocuments.fileUrl,
      fileName: patientDocuments.fileName,
      mimeType: patientDocuments.mimeType,
      sizeBytes: patientDocuments.sizeBytes,
      category: patientDocuments.category,
      title: patientDocuments.title,
      note: patientDocuments.note,
      createdAt: patientDocuments.createdAt,
      labName: labs.name,
    })
    .from(patientDocuments)
    .leftJoin(labs, eq(patientDocuments.uploadedByLabId, labs.id))
    .where(eq(patientDocuments.patientId, patientId))
    .orderBy(desc(patientDocuments.createdAt));

  // Filter to (a) own docs shared with a clinic doctor, or (b) inter-clinic shared to us.
  const ownedDocRows = allDocRows.filter(
    (doc) =>
      doc.sharedWithDoctorIds?.some((id) => clinicDoctorIds.includes(id))
  );
  const interClinicDocRows = allDocRows.filter(
    (doc) =>
      !ownedDocRows.includes(doc) &&
      doc.sharedWithClinicIds?.includes(clinic.id)
  );

  // For inter-clinic docs, resolve the source clinic name from the authoring doctor.
  // Build a map: uploadedByDoctorId → clinic name.
  const interClinicDoctorIds = [
    ...new Set(
      interClinicDocRows
        .map((d) => d.uploadedByDoctorId)
        .filter((id): id is string => id !== null)
    ),
  ];
  const sourceClinicNameByDoctorId: Record<string, string> = {};
  if (interClinicDoctorIds.length > 0) {
    const sourceRows = await db
      .select({
        doctorId: clinicDoctors.doctorId,
        clinicName: clinics.name,
      })
      .from(clinicDoctors)
      .innerJoin(clinics, eq(clinicDoctors.clinicId, clinics.id))
      .where(inArray(clinicDoctors.doctorId, interClinicDoctorIds));
    for (const row of sourceRows) {
      sourceClinicNameByDoctorId[row.doctorId] = row.clinicName;
    }
  }

  const visibleDocRows = [
    ...ownedDocRows.map((doc) => ({ ...doc, sharedFromClinicName: null as string | null })),
    ...interClinicDocRows.map((doc) => ({
      ...doc,
      sharedFromClinicName: doc.uploadedByDoctorId
        ? (sourceClinicNameByDoctorId[doc.uploadedByDoctorId] ?? null)
        : null,
    })),
  ];

  // ── Appointments at this clinic (no limit, scoped by practice_id) ───────────
  const clinicPracticeIds = (
    await db
      .select({ id: doctorPractices.id })
      .from(doctorPractices)
      .where(eq(doctorPractices.clinicId, clinic.id))
  ).map((r) => r.id);

  const apptRows = clinicPracticeIds.length === 0
    ? []
    : await db
        .select({
          id: appointments.id,
          startsAt: appointments.startsAt,
          endsAt: appointments.endsAt,
          status: appointments.status,
          type: appointments.type,
          reason: appointments.reason,
          notes: appointments.notes,
          createdAt: appointments.createdAt,
          doctorId: appointments.doctorId,
          practiceId: appointments.practiceId,
          doctorName: doctors.name,
          doctorSpecialty: doctors.specialty,
          practiceCity: doctorPractices.city,
        })
        .from(appointments)
        .leftJoin(doctors, eq(appointments.doctorId, doctors.id))
        .leftJoin(
          doctorPractices,
          eq(appointments.practiceId, doctorPractices.id)
        )
        .where(
          and(
            eq(appointments.patientId, patientId),
            inArray(appointments.practiceId, clinicPracticeIds)
          )
        )
        .orderBy(desc(appointments.startsAt));

  // ── Lab orders ───────────────────────────────────────────────────────────────
  const labOrderRows = await db
    .select({
      id: labOrders.id,
      doctorId: labOrders.doctorId,
      labId: labOrders.labId,
      tests: labOrders.tests,
      instructions: labOrders.instructions,
      urgency: labOrders.urgency,
      status: labOrders.status,
      createdAt: labOrders.createdAt,
      updatedAt: labOrders.updatedAt,
      completedAt: labOrders.completedAt,
      labName: labs.name,
      doctorName: doctors.name,
    })
    .from(labOrders)
    .leftJoin(labs, eq(labOrders.labId, labs.id))
    .leftJoin(doctors, eq(labOrders.doctorId, doctors.id))
    .where(
      and(
        eq(labOrders.patientId, patientId),
        inArray(labOrders.doctorId, clinicDoctorIds)
      )
    )
    .orderBy(desc(labOrders.createdAt))
    .limit(100);

  // ── Per-section sharing flags ────────────────────────────────────────────────
  const sharingFlags = ((medicalProfile as { sharedWithClinics?: Record<string, Record<string, boolean>> } | undefined)?.sharedWithClinics ?? {}) as Record<string, Record<string, boolean>>;
  const clinicId = (clinic as { id: string }).id;

  const suppressedSections: string[] = [];
  function checkSection(key: string): boolean {
    const shared = isSectionShared(sharingFlags, clinicId, key);
    if (!shared) suppressedSections.push(key);
    return shared;
  }

  // ── Treating doctors strip (multi-doctor surfacing) ──────────────────────────
  // Each doctor in this clinic who has at least one appointment with this patient.
  const treatingDoctorAgg = await db
    .select({
      doctorId: appointments.doctorId,
      lastRdv: max(appointments.startsAt),
      doctorName: doctors.name,
      doctorSpecialty: doctors.specialty,
      doctorPhotoUrl: doctors.photoUrl,
    })
    .from(appointments)
    .innerJoin(doctors, eq(appointments.doctorId, doctors.id))
    .where(
      and(
        eq(appointments.patientId, patientId),
        inArray(appointments.doctorId, clinicDoctorIds)
      )
    )
    .groupBy(appointments.doctorId, doctors.name, doctors.specialty, doctors.photoUrl);

  const treatingDoctors = treatingDoctorAgg.map((r) => ({
    doctorId: r.doctorId,
    name: r.doctorName ?? null,
    specialty: r.doctorSpecialty ?? null,
    photoUrl: r.doctorPhotoUrl ?? null,
    lastRdv: r.lastRdv,
  }));

  return NextResponse.json({
    patient,
    medicalProfile: checkSection("profile") ? (medicalProfile ?? null) : null,
    allergies: checkSection("allergies") ? allergies : [],
    vaccinations: checkSection("vaccinations") ? vaccinations : [],
    analyses: checkSection("analyses") ? analyses : [],
    prescriptions: checkSection("prescriptions") ? prescrRows : [],
    certificates: checkSection("certificates") ? certificates : [],
    documents: checkSection("documents") ? visibleDocRows : [],
    appointments: apptRows,
    labOrders: checkSection("labOrders") ? labOrderRows : [],
    treatingDoctors,
    meta: {
      suppressedSections,
    },
  });
}
