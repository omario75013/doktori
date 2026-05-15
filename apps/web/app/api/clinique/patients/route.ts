import { NextResponse } from "next/server";
import {
  db,
  appointments,
  doctors,
  patients,
  patientMedicalProfile,
  clinicDoctors,
} from "@doktori/db";
import { eq, inArray, desc, count, max, and, or, isNull, sql } from "drizzle-orm";
import { requireClinic } from "@/lib/clinic-auth";
import { logClinicAudit } from "@/lib/audit";
import { getClinicScope } from "@/lib/clinic-scope";
import { resolveOrCreatePatient } from "@/lib/patient-identity";

export async function GET() {
  const clinic = await requireClinic();
  if (clinic instanceof NextResponse) return clinic;

  // Resolve clinic scope (doctors + practices)
  const scope = await getClinicScope(clinic.id);
  const allDoctorIds = scope.doctorIds;
  const allPracticeIds = scope.practiceIds;

  if (allDoctorIds.length === 0) {
    return NextResponse.json({ patients: [] });
  }

  // Practice scope condition — include legacy rows with null practiceId
  const practiceCondition =
    allPracticeIds.length > 0
      ? or(inArray(appointments.practiceId, allPracticeIds), isNull(appointments.practiceId))!
      : isNull(appointments.practiceId);

  // Aggregate per patient: appointment count + last visit date (scoped to clinic practices)
  const patientAgg = await db
    .select({
      patientId: appointments.patientId,
      appointmentCount: count(appointments.id),
      lastVisit: max(appointments.startsAt),
    })
    .from(appointments)
    .where(and(inArray(appointments.doctorId, allDoctorIds), practiceCondition))
    .groupBy(appointments.patientId)
    .orderBy(desc(max(appointments.startsAt)))
    .limit(500);

  if (patientAgg.length === 0) {
    return NextResponse.json({ patients: [] });
  }

  const patientIds = patientAgg.map((r) => r.patientId);

  // Fetch patient details
  const patientRows = await db
    .select({
      id: patients.id,
      name: patients.name,
      phone: patients.phone,
      email: patients.email,
    })
    .from(patients)
    .where(inArray(patients.id, patientIds));

  // For each patient, find the most recent appointment's doctor — via a single query
  // Fetch the last appointment per patient (most recent startsAt) within clinic practices
  const lastApptRows = await db
    .select({
      patientId: appointments.patientId,
      doctorId: appointments.doctorId,
      startsAt: appointments.startsAt,
    })
    .from(appointments)
    .where(
      and(
        inArray(appointments.doctorId, allDoctorIds),
        inArray(appointments.patientId, patientIds),
        practiceCondition
      )
    )
    .orderBy(desc(appointments.startsAt));

  // Build map: patientId → last doctorId (first occurrence after ordering by desc)
  const lastDoctorByPatient = new Map<string, string>();
  for (const row of lastApptRows) {
    if (!lastDoctorByPatient.has(row.patientId)) {
      lastDoctorByPatient.set(row.patientId, row.doctorId);
    }
  }

  const lastDoctorIds = [...new Set(lastDoctorByPatient.values())];

  // Fetch doctor names for last-seen
  const doctorRows =
    lastDoctorIds.length > 0
      ? await db
          .select({ id: doctors.id, name: doctors.name })
          .from(doctors)
          .where(inArray(doctors.id, lastDoctorIds))
      : [];

  const patientMap = new Map(patientRows.map((p) => [p.id, p]));
  const doctorMap = new Map(doctorRows.map((d) => [d.id, d.name]));

  const result = patientAgg.map((agg) => {
    const patient = patientMap.get(agg.patientId);
    const lastDoctorId = lastDoctorByPatient.get(agg.patientId);
    return {
      id: agg.patientId,
      name: patient?.name ?? "—",
      phone: patient?.phone ?? "—",
      email: patient?.email ?? null,
      appointmentCount: Number(agg.appointmentCount),
      lastVisit: agg.lastVisit,
      lastDoctorName: lastDoctorId ? (doctorMap.get(lastDoctorId) ?? "—") : "—",
    };
  });

  return NextResponse.json({ patients: result });
}

// ── POST /api/clinique/patients ───────────────────────────────────────────────
// Create a new patient from the clinic admin UI.
// Body: { firstName, lastName, email?, phone, dateOfBirth?, gender?, doctorId, shareDossierWithClinic?, firstRdvAt? }

export async function POST(req: Request) {
  const clinic = await requireClinic();
  if (clinic instanceof NextResponse) return clinic;

  const body = (await req.json()) as {
    firstName: string;
    lastName: string;
    email?: string | null;
    phone: string;
    cin?: string | null;
    dateOfBirth?: string | null;
    gender?: string | null;
    doctorId: string;
    shareDossierWithClinic?: boolean;
    firstRdvAt?: string | null;
  };

  const { firstName, lastName, email, phone, cin, dateOfBirth, gender, doctorId } = body;
  const shareDossierWithClinic = body.shareDossierWithClinic !== false; // default true

  // Validate required fields
  if (!firstName?.trim() || !lastName?.trim() || !phone?.trim() || !doctorId) {
    return NextResponse.json(
      { error: "Champs obligatoires manquants (prénom, nom, téléphone, médecin)" },
      { status: 400 }
    );
  }

  // Validate doctorId belongs to this clinic
  const [clinicDoctorRow] = await db
    .select({ doctorId: clinicDoctors.doctorId })
    .from(clinicDoctors)
    .where(
      and(
        eq(clinicDoctors.clinicId, clinic.id),
        eq(clinicDoctors.doctorId, doctorId)
      )
    )
    .limit(1);

  if (!clinicDoctorRow) {
    return NextResponse.json(
      { error: "Médecin introuvable dans cette clinique" },
      { status: 400 }
    );
  }

  const fullName = `${firstName.trim()} ${lastName.trim()}`;

  // Resolve or create patient (CIN → phone → email → new)
  const { patientId, matched } = await resolveOrCreatePatient({
    cin: cin?.trim() || null,
    phone: phone.trim(),
    email: email?.trim() || null,
    name: fullName,
    dateOfBirth: dateOfBirth ?? null,
    gender: gender ?? null,
    createdByClinicId: clinic.id,
  });

  // If patient was newly created, the medical profile was already created inside resolveOrCreatePatient.
  // If matched, ensure a medical profile exists (upsert-style: insert if missing).
  if (matched !== null) {
    const [existingProfile] = await db
      .select({ id: patientMedicalProfile.id })
      .from(patientMedicalProfile)
      .where(eq(patientMedicalProfile.patientId, patientId))
      .limit(1);
    if (!existingProfile) {
      await db.insert(patientMedicalProfile).values({
        id: crypto.randomUUID(),
        patientId,
        sharedWithClinics: {},
      });
    }
  }

  // Apply clinic-sharing flags to the medical profile
  if (!shareDossierWithClinic) {
    const sharedWithClinicsUpdate: Record<string, Record<string, boolean>> = {};
    sharedWithClinicsUpdate[clinic.id] = {
      profile: false,
      allergies: false,
      vaccinations: false,
      analyses: false,
      prescriptions: false,
      certificates: false,
      documents: false,
      labOrders: false,
    };
    // We do a jsonb merge so we don't overwrite existing keys from other clinics
    await db.execute(
      sql`UPDATE patient_medical_profile
          SET shared_with_clinics = shared_with_clinics || ${JSON.stringify(sharedWithClinicsUpdate)}::jsonb
          WHERE patient_id = ${patientId}`
    );
  }

  // Compute placeholder appointment date: firstRdvAt or tomorrow 09:00
  let rdvDate: Date;
  if (body.firstRdvAt) {
    rdvDate = new Date(body.firstRdvAt);
    if (isNaN(rdvDate.getTime())) {
      rdvDate = new Date();
      rdvDate.setDate(rdvDate.getDate() + 1);
      rdvDate.setHours(9, 0, 0, 0);
    }
  } else {
    rdvDate = new Date();
    rdvDate.setDate(rdvDate.getDate() + 1);
    rdvDate.setHours(9, 0, 0, 0);
  }
  const rdvEnd = new Date(rdvDate.getTime() + 30 * 60 * 1000); // +30 min

  // Create placeholder appointment (makes patient visible in clinic patient list)
  const appointmentId = crypto.randomUUID();
  await db.insert(appointments).values({
    id: appointmentId,
    doctorId,
    patientId,
    startsAt: rdvDate,
    endsAt: rdvEnd,
    status: "pending",
    type: "cabinet",
    reason: "[Premier RDV]",
  });

  await logClinicAudit({
    clinicId: clinic.id,
    actorType: "clinic",
    action: "patient_create",
    targetType: "patient",
    targetId: patientId,
    metadata: { name: fullName, doctorId, shareDossierWithClinic, matched: matched ?? "new" },
  });

  return NextResponse.json({ patientId, matched: matched ?? "new" }, { status: matched !== null ? 200 : 201 });
}
