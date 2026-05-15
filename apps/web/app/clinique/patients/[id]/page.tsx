import { getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, User } from "lucide-react";
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
  labs,
  doctors,
  doctorPractices,
} from "@doktori/db";
import { eq, desc, inArray, and, max } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { DossierTabs, type DossierData } from "./dossier-tabs";

export default async function PatientDossierPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: patientId } = await params;
  const t = await getTranslations("clinique.dossier");

  // ── Auth ─────────────────────────────────────────────────────────────────────
  const session = await auth();
  if (!session?.user?.id) redirect("/clinique-login");
  const role = (session.user as { role?: string }).role;
  if (role !== "clinic") redirect("/clinique-login");
  const clinicId = session.user.id;

  // ── Membership check ─────────────────────────────────────────────────────────
  const clinicDoctorRows = await db
    .select({ doctorId: clinicDoctors.doctorId })
    .from(clinicDoctors)
    .where(eq(clinicDoctors.clinicId, clinicId));
  const clinicDoctorIds = clinicDoctorRows.map((r) => r.doctorId);

  if (clinicDoctorIds.length > 0) {
    const memberCheck = await db
      .select({ id: appointments.id })
      .from(appointments)
      .where(
        and(
          eq(appointments.patientId, patientId),
          inArray(appointments.doctorId, clinicDoctorIds)
        )
      )
      .limit(1);
    if (memberCheck.length === 0) notFound();
  } else {
    notFound();
  }

  // ── Patient row ───────────────────────────────────────────────────────────────
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

  if (!patientRow) notFound();

  let ageYears: number | null = null;
  if (patientRow.dateOfBirth) {
    const dob = new Date(patientRow.dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const mDiff = today.getMonth() - dob.getMonth();
    if (mDiff < 0 || (mDiff === 0 && today.getDate() < dob.getDate())) age--;
    ageYears = age;
  }

  // ── Fetch all dossier data ────────────────────────────────────────────────────
  const [
    medicalProfile,
    allergies,
    vaccinations,
    analyses,
    prescrRows,
    certificates,
    allDocRows,
    apptRows,
    labOrderRows,
  ] = await Promise.all([
    db
      .select()
      .from(patientMedicalProfile)
      .where(eq(patientMedicalProfile.patientId, patientId))
      .limit(1)
      .then((r) => r[0] ?? null),
    db
      .select()
      .from(patientAllergies)
      .where(eq(patientAllergies.patientId, patientId))
      .orderBy(desc(patientAllergies.createdAt)),
    db
      .select()
      .from(patientVaccinations)
      .where(eq(patientVaccinations.patientId, patientId))
      .orderBy(desc(patientVaccinations.dateReceived)),
    db
      .select()
      .from(patientAnalyses)
      .where(eq(patientAnalyses.patientId, patientId))
      .orderBy(desc(patientAnalyses.testDate)),
    db
      .select()
      .from(prescriptions)
      .where(eq(prescriptions.patientId, patientId))
      .orderBy(desc(prescriptions.createdAt))
      .limit(100),
    db
      .select()
      .from(medicalCertificates)
      .where(eq(medicalCertificates.patientId, patientId))
      .orderBy(desc(medicalCertificates.createdAt))
      .limit(100),
    db
      .select({
        id: patientDocuments.id,
        patientId: patientDocuments.patientId,
        uploadedBy: patientDocuments.uploadedBy,
        uploadedByDoctorId: patientDocuments.uploadedByDoctorId,
        uploadedByLabId: patientDocuments.uploadedByLabId,
        labOrderId: patientDocuments.labOrderId,
        sharedWithDoctorIds: patientDocuments.sharedWithDoctorIds,
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
      .orderBy(desc(patientDocuments.createdAt)),
    db
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
        practiceCity: doctorPractices.city,
      })
      .from(appointments)
      .leftJoin(doctors, eq(appointments.doctorId, doctors.id))
      .leftJoin(doctorPractices, eq(appointments.practiceId, doctorPractices.id))
      .where(
        and(
          eq(appointments.patientId, patientId),
          inArray(appointments.doctorId, clinicDoctorIds)
        )
      )
      .orderBy(desc(appointments.startsAt))
      .limit(50),
    db
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
      .limit(100),
  ]);

  // Privacy filter on documents
  const visibleDocs = allDocRows.filter((doc) => {
    if (!doc.sharedWithDoctorIds || doc.sharedWithDoctorIds.length === 0) return false;
    return doc.sharedWithDoctorIds.some((id) => clinicDoctorIds.includes(id));
  });

  // Per-section sharing flags from patient medical profile
  const sharingFlags = (medicalProfile as { sharedWithClinics?: Record<string, Record<string, boolean>> } | null)?.sharedWithClinics ?? {};
  const clinicFlags = (sharingFlags as Record<string, Record<string, boolean>>)[clinicId] ?? undefined;
  function isShared(section: string): boolean {
    if (!clinicFlags) return true;
    return clinicFlags[section] !== false;
  }
  const suppressedSections: string[] = [];
  const sectionsToCheck = ["profile","allergies","vaccinations","analyses","prescriptions","certificates","documents","labOrders"] as const;
  for (const s of sectionsToCheck) {
    if (!isShared(s)) suppressedSections.push(s);
  }

  // Treating doctors — unique doctors from apptRows
  const treatingDoctorsMap = new Map<string, { doctorId: string; name: string | null; specialty: string | null; photoUrl: string | null; lastRdv: Date | null }>();
  for (const a of apptRows) {
    const existing = treatingDoctorsMap.get(a.doctorId);
    if (!existing || (a.startsAt && (!existing.lastRdv || a.startsAt > existing.lastRdv))) {
      treatingDoctorsMap.set(a.doctorId, {
        doctorId: a.doctorId,
        name: a.doctorName ?? null,
        specialty: null,
        photoUrl: null,
        lastRdv: a.startsAt ?? null,
      });
    }
  }
  const treatingDoctors = [...treatingDoctorsMap.values()].map((d) => ({
    ...d,
    lastRdv: d.lastRdv?.toISOString() ?? null,
  }));

  const dossierData: DossierData = {
    patient: {
      id: patientRow.id,
      name: patientRow.name,
      ageYears,
      gender: patientRow.gender,
      bloodType: patientRow.bloodType,
    },
    medicalProfile: isShared("profile") && medicalProfile
      ? {
          allergies: medicalProfile.allergies,
          chronicConditions: medicalProfile.chronicConditions,
          currentMeds: medicalProfile.currentMeds,
          notes: medicalProfile.notes,
          lifestyle: medicalProfile.lifestyle,
          familyHistory: medicalProfile.familyHistory,
          pastSurgeries: medicalProfile.pastSurgeries,
          pastHospitalizations: medicalProfile.pastHospitalizations,
          vaccinations: medicalProfile.vaccinations,
          womensHealth: medicalProfile.womensHealth,
          updatedAt: medicalProfile.updatedAt.toISOString(),
        }
      : null,
    allergies: isShared("allergies") ? allergies.map((a) => ({
      id: a.id,
      allergen: a.allergen,
      severity: a.severity,
      reaction: a.reaction,
      diagnosedAt: a.diagnosedAt,
      createdAt: a.createdAt.toISOString(),
    })) : [],
    vaccinations: isShared("vaccinations") ? vaccinations.map((v) => ({
      id: v.id,
      vaccineName: v.vaccineName,
      dateReceived: v.dateReceived,
      batchNumber: v.batchNumber,
      givenBy: v.givenBy,
      notes: v.notes,
    })) : [],
    analyses: isShared("analyses") ? analyses.map((a) => ({
      id: a.id,
      title: a.title,
      labName: a.labName,
      testDate: a.testDate,
      fileUrl: a.fileUrl,
      notes: a.notes,
      createdAt: a.createdAt.toISOString(),
    })) : [],
    prescriptions: isShared("prescriptions") ? prescrRows.map((p) => ({
      id: p.id,
      content: p.content,
      createdAt: p.createdAt.toISOString(),
    })) : [],
    certificates: isShared("certificates") ? certificates.map((c) => ({
      id: c.id,
      title: c.title,
      content: c.content,
      createdAt: c.createdAt.toISOString(),
    })) : [],
    documents: isShared("documents") ? visibleDocs.map((d) => ({
      id: d.id,
      uploadedBy: d.uploadedBy,
      uploadedByLabId: d.uploadedByLabId,
      category: d.category,
      title: d.title,
      fileName: d.fileName,
      fileUrl: d.fileUrl,
      mimeType: d.mimeType,
      createdAt: d.createdAt.toISOString(),
      labName: d.labName ?? null,
    })) : [],
    appointments: apptRows.map((a) => ({
      id: a.id,
      startsAt: a.startsAt.toISOString(),
      status: a.status,
      type: a.type,
      reason: a.reason,
      doctorName: a.doctorName ?? null,
      practiceCity: a.practiceCity ?? null,
      doctorId: a.doctorId,
    })),
    labOrders: isShared("labOrders") ? labOrderRows.map((o) => ({
      id: o.id,
      urgency: o.urgency,
      status: o.status,
      tests: o.tests,
      labName: o.labName ?? null,
      doctorName: o.doctorName ?? null,
      createdAt: o.createdAt.toISOString(),
    })) : [],
    treatingDoctors,
    meta: { suppressedSections },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/clinique/patients"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div
            className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-black text-white shrink-0"
            style={{ background: "#0891B2" }}
          >
            {dossierData.patient.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-black text-foreground flex items-center gap-2">
              <User className="h-5 w-5" style={{ color: "#0891B2" }} strokeWidth={2.5} />
              {dossierData.patient.name}
            </h1>
            <div className="flex flex-wrap gap-3 mt-1">
              {dossierData.patient.ageYears !== null && (
                <span className="text-sm text-muted-foreground">
                  {t("ageYears", { years: dossierData.patient.ageYears })}
                </span>
              )}
              {dossierData.patient.gender && (
                <span className="text-sm text-muted-foreground">
                  {t("gender")} : {dossierData.patient.gender}
                </span>
              )}
              {dossierData.patient.bloodType && (
                <span className="text-sm text-muted-foreground">
                  {t("bloodType")} : {dossierData.patient.bloodType}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-border shadow-sm p-5">
        <DossierTabs data={dossierData} />
      </div>
    </div>
  );
}
