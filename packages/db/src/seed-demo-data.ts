/**
 * Demo seed script for G2–G11 features.
 *
 * Populates: patientDependents, appointmentTypeQuestions, appointmentAnswers,
 *            consultationNotes, patientMedicalProfile, cnamClaims, waitlist (follow_up).
 *
 * Idempotent: each section checks row counts / uses ON CONFLICT DO NOTHING.
 *
 * Usage:
 *   DATABASE_URL=... pnpm --filter @doktori/db exec tsx src/seed-demo-data.ts
 *   # or via the package script:
 *   pnpm --filter @doktori/db seed:demo
 */

import { drizzle } from "drizzle-orm/postgres-js";
import { eq, and, inArray, sql as drizzleSql } from "drizzle-orm";
import postgres from "postgres";
import {
  doctors,
  patients,
  appointments,
  appointmentTypes,
  appointmentTypeQuestions,
  appointmentAnswers,
  consultationNotes,
  patientMedicalProfile,
  patientDependents,
  cnamClaims,
  waitlist,
  doctorPractices,
} from "./schema";

// ─── DB connection ────────────────────────────────────────────────────────────

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://doktori:doktori_dev@localhost:5433/doktori";

const client = postgres(DATABASE_URL);
const db = drizzle(client);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function randomDigits(length: number): string {
  let s = "";
  for (let i = 0; i < length; i++) {
    s += Math.floor(Math.random() * 10).toString();
  }
  return s;
}

/** Returns YYYY-MM-DD string for today + offsetDays */
function dateOffset(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

// ─── Section 1: Appointment types + questions + second practice ───────────────

async function seedDoctorTypes() {
  console.log("\n[appointment_types] Checking first 3 active doctors...");

  const activeDoctors = await db
    .select({ id: doctors.id, name: doctors.name, city: doctors.city, address: doctors.address })
    .from(doctors)
    .where(eq(doctors.isActive, true))
    .limit(3);

  if (activeDoctors.length === 0) {
    console.log("[appointment_types] No active doctors found — skipping.");
    return;
  }

  let typesInserted = 0;
  let questionsInserted = 0;
  let practicesInserted = 0;

  for (const doctor of activeDoctors) {
    // Check if doctor already has appointment types
    const existingTypes = await db
      .select({ id: appointmentTypes.id })
      .from(appointmentTypes)
      .where(eq(appointmentTypes.doctorId, doctor.id));

    let typeIds: string[] = existingTypes.map((t) => t.id);

    if (existingTypes.length === 0) {
      // Insert 2 appointment types
      const inserted = await db
        .insert(appointmentTypes)
        .values([
          {
            doctorId: doctor.id,
            name: "Première consultation",
            durationMinutes: 30,
            fee: 50000,
            color: "#2563eb",
            isDefault: true,
            isActive: true,
          },
          {
            doctorId: doctor.id,
            name: "Contrôle",
            durationMinutes: 20,
            fee: 40000,
            color: "#16a34a",
            isDefault: false,
            isActive: true,
          },
        ])
        .returning({ id: appointmentTypes.id });

      typeIds = inserted.map((t) => t.id);
      typesInserted += 2;
      console.log(`  [appointment_types] Doctor ${doctor.name}: inserted 2 types`);
    } else {
      console.log(
        `  [appointment_types] Doctor ${doctor.name}: already has ${existingTypes.length} type(s) — skipping types`
      );
    }

    // For each type, check/insert 2 questions (text + yesno)
    for (const typeId of typeIds) {
      const existingQuestions = await db
        .select({ id: appointmentTypeQuestions.id })
        .from(appointmentTypeQuestions)
        .where(eq(appointmentTypeQuestions.appointmentTypeId, typeId));

      if (existingQuestions.length === 0) {
        await db.insert(appointmentTypeQuestions).values([
          {
            appointmentTypeId: typeId,
            label: "Décrivez brièvement votre motif",
            kind: "text",
            choices: null,
            required: true,
            displayOrder: 1,
          },
          {
            appointmentTypeId: typeId,
            label: "Avez-vous déjà consulté pour ce problème ?",
            kind: "yesno",
            choices: null,
            required: false,
            displayOrder: 2,
          },
        ]);
        questionsInserted += 2;
      }
    }

    // Check/insert second practice ("Cabinet annexe")
    const existingPractices = await db
      .select({ id: doctorPractices.id, isPrimary: doctorPractices.isPrimary })
      .from(doctorPractices)
      .where(eq(doctorPractices.doctorId, doctor.id));

    const hasSecondary = existingPractices.some((p) => !p.isPrimary);

    if (!hasSecondary) {
      await db.insert(doctorPractices).values({
        doctorId: doctor.id,
        name: "Cabinet annexe",
        address: `${doctor.address} — Annexe B`,
        city: doctor.city,
        isPrimary: false,
        isActive: true,
      });
      practicesInserted++;
    }
  }

  console.log(`[appointment_type_questions] inserted ${questionsInserted} rows`);
  console.log(`[doctor_practices] inserted ${practicesInserted} secondary practices`);
}

// ─── Section 2: Consultation notes (SOAP) ────────────────────────────────────

async function seedConsultationNotes() {
  console.log("\n[consultation_notes] Checking completed appointments...");

  const completedAppts = await db
    .select({
      id: appointments.id,
      doctorId: appointments.doctorId,
      patientId: appointments.patientId,
      startsAt: appointments.startsAt,
    })
    .from(appointments)
    .where(eq(appointments.status, "completed"))
    .limit(5);

  if (completedAppts.length === 0) {
    console.log("[consultation_notes] No completed appointments found — skipping.");
    return;
  }

  // Filter to those that don't already have a note
  const apptIds = completedAppts.map((a) => a.id);
  const existingNotes = await db
    .select({ appointmentId: consultationNotes.appointmentId })
    .from(consultationNotes)
    .where(inArray(consultationNotes.appointmentId, apptIds));

  const alreadyNotedIds = new Set(existingNotes.map((n) => n.appointmentId));
  const toInsert = completedAppts.filter((a) => !alreadyNotedIds.has(a.id));

  if (toInsert.length === 0) {
    console.log("[consultation_notes] All completed appointments already have notes — skipping.");
    return;
  }

  const soapVariants = [
    {
      subjective:
        "Patient se plaint d'une fatigue persistante et de polydipsie depuis 3 semaines. Antécédents familiaux de diabète type 2.",
      objective:
        "PA 135/85 mmHg, FC 78 bpm, Temp 36.8°C, glycémie capillaire 2.8 g/L. IMC 27.4.",
      assessment: "Diabète type 2 nouvellement diagnostiqué. HTA limite.",
      plan:
        "Initiation Metformine 500 mg x2/j. Régime alimentaire adapté. Contrôle glycémie à J30. Avis cardiologue si PA persistante.",
      vitals: { bp_systolic: 135, bp_diastolic: 85, heart_rate: 78, temperature: 36.8, weight: 82, height: 174, spo2: 98 },
      icd10Codes: [
        { code: "E11", label: "Diabète type 2" },
        { code: "I10", label: "HTA essentielle" },
      ],
    },
    {
      subjective:
        "Céphalées matinales depuis 2 semaines, tension artérielle élevée rapportée à domicile (150/95). Pas de signes neurologiques.",
      objective:
        "PA 148/92 mmHg, FC 72 bpm. Fond d'œil normal. ECG sinusal sans anomalie.",
      assessment: "HTA essentielle stade 1, non contrôlée.",
      plan:
        "Ajustement traitement antihypertenseur. Auto-surveillance tensionnelle biquotidienne. Contrôle à 1 mois.",
      vitals: { bp_systolic: 148, bp_diastolic: 92, heart_rate: 72, temperature: 36.6, weight: 78, height: 170, spo2: 99 },
      icd10Codes: [
        { code: "I10", label: "HTA essentielle" },
      ],
    },
    {
      subjective:
        "Douleurs lombaires depuis 1 semaine, irradiant dans le membre inférieur droit. Position antalgique.",
      objective:
        "Lasègue positif à 45° à droite. Force musculaire conservée. Sensibilité normale.",
      assessment: "Lombo-sciatique droite probable sur hernie discale L4-L5.",
      plan:
        "IRM lombaire en urgence relative. AINS + myorelaxant. Repos relatif 5 jours. Réévaluation clinique à J7.",
      vitals: { bp_systolic: 122, bp_diastolic: 78, heart_rate: 80, temperature: 37.0, weight: 85, height: 178 },
      icd10Codes: [
        { code: "E11", label: "Diabète type 2" },
      ],
    },
    {
      subjective:
        "Toux sèche persistante depuis 3 semaines, légère dyspnée à l'effort. Pas de fièvre.",
      objective:
        "Auscultation : murmure vésiculaire légèrement diminué à la base gauche. SpO2 97% en air ambiant.",
      assessment: "Bronchite chronique sur terrain tabagique. À explorer.",
      plan:
        "Radiographie pulmonaire. Spirométrie. Arrêt tabac conseillé. Suivi à 3 semaines.",
      vitals: { bp_systolic: 118, bp_diastolic: 76, heart_rate: 84, temperature: 36.9, weight: 73, height: 168, spo2: 97, respiratory_rate: 18 },
      icd10Codes: [
        { code: "I10", label: "HTA essentielle" },
      ],
    },
    {
      subjective:
        "Bilan de contrôle pour diabète type 2 connu. Patient se dit bien équilibré, officine confirme observance correcte.",
      objective:
        "HbA1c 7.2% (résultat lab). PA 128/80 mmHg. Pas d'hypoglycémie signalée.",
      assessment: "Diabète type 2 équilibré. Objectif glycémique atteint.",
      plan:
        "Maintien traitement actuel. Prochain bilan HbA1c dans 3 mois. Ophtalmologiste annuel rappelé.",
      vitals: { bp_systolic: 128, bp_diastolic: 80, heart_rate: 70, temperature: 36.7, weight: 80, height: 172, spo2: 99 },
      icd10Codes: [
        { code: "E11", label: "Diabète type 2" },
        { code: "I10", label: "HTA essentielle" },
      ],
    },
  ];

  let inserted = 0;
  for (let i = 0; i < toInsert.length; i++) {
    const appt = toInsert[i];
    const variant = soapVariants[i % soapVariants.length];
    await db.insert(consultationNotes).values({
      appointmentId: appt.id,
      doctorId: appt.doctorId,
      patientId: appt.patientId,
      subjective: variant.subjective,
      objective: variant.objective,
      assessment: variant.assessment,
      plan: variant.plan,
      vitals: variant.vitals,
      icd10Codes: variant.icd10Codes,
    });
    inserted++;
  }

  console.log(`[consultation_notes] inserted ${inserted} rows`);
}

// ─── Section 3: Patient medical profiles ─────────────────────────────────────

async function seedMedicalProfiles() {
  console.log("\n[patient_medical_profile] Checking first 10 patients...");

  const firstPatients = await db
    .select({ id: patients.id })
    .from(patients)
    .limit(10);

  if (firstPatients.length === 0) {
    console.log("[patient_medical_profile] No patients found — skipping.");
    return;
  }

  const patientIds = firstPatients.map((p) => p.id);

  const existingProfiles = await db
    .select({ patientId: patientMedicalProfile.patientId })
    .from(patientMedicalProfile)
    .where(inArray(patientMedicalProfile.patientId, patientIds));

  const alreadyProfiled = new Set(existingProfiles.map((p) => p.patientId));
  const toInsert = firstPatients.filter((p) => !alreadyProfiled.has(p.id));

  if (toInsert.length === 0) {
    console.log("[patient_medical_profile] All patients already have a profile — skipping.");
    return;
  }

  const profileVariants = [
    {
      allergies: "Pénicilline, aspirine",
      chronicConditions: "Diabète type 2, HTA",
      currentMeds: "Metformine 1000 mg/j, Amlodipine 5 mg/j",
      notes: "Antécédents familiaux cardiaques. Suivi cardiologique annuel.",
    },
    {
      allergies: "Arachides",
      chronicConditions: "Asthme léger",
      currentMeds: "Salbutamol spray en cas de besoin",
      notes: "Déclenchants : poussière, animaux.",
    },
    {
      allergies: null,
      chronicConditions: "Hypothyroïdie",
      currentMeds: "Lévothyroxine 75 µg/j",
      notes: "Bilan thyroïdien à contrôler tous les 6 mois.",
    },
    {
      allergies: "Ibuprofène",
      chronicConditions: null,
      currentMeds: null,
      notes: "Antécédent d'ulcère gastrique.",
    },
    {
      allergies: null,
      chronicConditions: "Dyslipidémie",
      currentMeds: "Rosuvastatine 10 mg/j",
      notes: null,
    },
    {
      allergies: "Amoxicilline",
      chronicConditions: "HTA essentielle",
      currentMeds: "Périndopril 4 mg/j",
      notes: "Surveillance rénale annuelle.",
    },
    {
      allergies: null,
      chronicConditions: null,
      currentMeds: null,
      notes: "Patient suivi depuis 2 ans. Pas d'antécédents notables.",
    },
    {
      allergies: "Latex",
      chronicConditions: "Psoriasis",
      currentMeds: "Crème à base de corticoïdes topiques",
      notes: "Poussées fréquentes en hiver.",
    },
    {
      allergies: null,
      chronicConditions: "Reflux gastro-œsophagien",
      currentMeds: "Oméprazole 20 mg/j",
      notes: "Régime sans graisses conseillé.",
    },
    {
      allergies: "Sulfamides",
      chronicConditions: "Migraine",
      currentMeds: "Sumatriptan 50 mg au besoin",
      notes: "Évitement des facteurs déclenchants (stress, luminosité).",
    },
  ];

  let inserted = 0;
  for (let i = 0; i < toInsert.length; i++) {
    const patient = toInsert[i];
    const v = profileVariants[i % profileVariants.length];
    await db
      .insert(patientMedicalProfile)
      .values({
        patientId: patient.id,
        allergies: v.allergies,
        chronicConditions: v.chronicConditions,
        currentMeds: v.currentMeds,
        notes: v.notes,
      })
      .onConflictDoNothing();
    inserted++;
  }

  console.log(`[patient_medical_profile] inserted ${inserted} rows`);
}

// ─── Section 4: Patient dependents ───────────────────────────────────────────

async function seedDependents() {
  console.log("\n[patient_dependents] Checking first 3 patients...");

  const firstPatients = await db
    .select({ id: patients.id, name: patients.name })
    .from(patients)
    .limit(3);

  if (firstPatients.length === 0) {
    console.log("[patient_dependents] No patients found — skipping.");
    return;
  }

  const dependentTemplates = [
    [
      { name: "Amine", dateOfBirth: "2015-03-14", gender: "male", relation: "enfant" },
      { name: "Fatma", dateOfBirth: "1952-07-22", gender: "female", relation: "parent" },
    ],
    [
      { name: "Yasmine", dateOfBirth: "2018-11-05", gender: "female", relation: "enfant" },
    ],
    [
      { name: "Khalil", dateOfBirth: "2010-08-19", gender: "male", relation: "enfant" },
      { name: "Mongi", dateOfBirth: "1950-01-30", gender: "male", relation: "parent" },
    ],
  ];

  let inserted = 0;

  for (let i = 0; i < firstPatients.length; i++) {
    const patient = firstPatients[i];
    const templates = dependentTemplates[i % dependentTemplates.length];

    // Check if this patient already has dependents
    const existingDeps = await db
      .select({ id: patientDependents.id })
      .from(patientDependents)
      .where(eq(patientDependents.patientId, patient.id));

    if (existingDeps.length > 0) {
      console.log(
        `  [patient_dependents] Patient ${patient.name}: already has ${existingDeps.length} dependent(s) — skipping`
      );
      continue;
    }

    for (const tmpl of templates) {
      await db.insert(patientDependents).values({
        patientId: patient.id,
        name: tmpl.name,
        dateOfBirth: tmpl.dateOfBirth,
        gender: tmpl.gender,
        relation: tmpl.relation,
      });
      inserted++;
    }
  }

  console.log(`[patient_dependents] inserted ${inserted} rows`);
}

// ─── Section 5: CNAM claims ───────────────────────────────────────────────────

async function seedCnamClaims() {
  console.log("\n[cnam_claims] Checking completed appointments...");

  const completedAppts = await db
    .select({
      id: appointments.id,
      doctorId: appointments.doctorId,
      patientId: appointments.patientId,
      startsAt: appointments.startsAt,
    })
    .from(appointments)
    .where(eq(appointments.status, "completed"))
    .limit(5);

  if (completedAppts.length === 0) {
    console.log("[cnam_claims] No completed appointments found — skipping.");
    return;
  }

  const apptIds = completedAppts.map((a) => a.id);
  const existingClaims = await db
    .select({ appointmentId: cnamClaims.appointmentId })
    .from(cnamClaims)
    .where(inArray(cnamClaims.appointmentId, apptIds));

  const alreadyClaimedIds = new Set(existingClaims.map((c) => c.appointmentId));
  const toInsert = completedAppts.filter((a) => !alreadyClaimedIds.has(a.id));

  if (toInsert.length === 0) {
    console.log("[cnam_claims] All completed appointments already have claims — skipping.");
    return;
  }

  let inserted = 0;
  for (const appt of toInsert) {
    const consultationDate = appt.startsAt.toISOString().slice(0, 10);
    await db
      .insert(cnamClaims)
      .values({
        appointmentId: appt.id,
        doctorId: appt.doctorId,
        patientId: appt.patientId,
        cnamNumber: randomDigits(8),
        patientRole: "assure",
        amount: 40000,
        consultationDate,
        status: "draft",
      })
      .onConflictDoNothing();
    inserted++;
  }

  console.log(`[cnam_claims] inserted ${inserted} rows`);
}

// ─── Section 6: Appointment answers ──────────────────────────────────────────

async function seedAppointmentAnswers() {
  console.log("\n[appointment_answers] Checking completed appointments with type questions...");

  // Find completed appointments that have an appointmentTypeId
  const completedAppts = await db
    .select({
      id: appointments.id,
      appointmentTypeId: appointments.appointmentTypeId,
    })
    .from(appointments)
    .where(eq(appointments.status, "completed"))
    .limit(5);

  const apptWithType = completedAppts.filter((a) => a.appointmentTypeId !== null);

  if (apptWithType.length === 0) {
    console.log("[appointment_answers] No completed appointments with appointment types — skipping.");
    return;
  }

  let inserted = 0;

  for (const appt of apptWithType) {
    const typeId = appt.appointmentTypeId!;

    // Find questions for this appointment type
    const questions = await db
      .select({ id: appointmentTypeQuestions.id, kind: appointmentTypeQuestions.kind })
      .from(appointmentTypeQuestions)
      .where(eq(appointmentTypeQuestions.appointmentTypeId, typeId));

    if (questions.length === 0) continue;

    for (const question of questions) {
      const value = question.kind === "yesno" ? "non" : "Douleurs thoraciques intermittentes depuis 1 semaine";

      await db
        .insert(appointmentAnswers)
        .values({
          appointmentId: appt.id,
          questionId: question.id,
          value,
        })
        .onConflictDoNothing();
      inserted++;
    }
  }

  console.log(`[appointment_answers] inserted ${inserted} rows`);
}

// ─── Section 7: Waitlist follow-up rows ──────────────────────────────────────

async function seedWaitlistFollowUp() {
  console.log("\n[waitlist] Seeding follow_up rows for 3 active doctors...");

  const activeDoctors = await db
    .select({ id: doctors.id, name: doctors.name })
    .from(doctors)
    .where(eq(doctors.isActive, true))
    .limit(3);

  if (activeDoctors.length === 0) {
    console.log("[waitlist] No active doctors found — skipping.");
    return;
  }

  let inserted = 0;
  const offsets = [7, 14, 21];

  for (let i = 0; i < activeDoctors.length; i++) {
    const doctor = activeDoctors[i];

    // Find the latest completed appointment for this doctor
    const latestAppts = await db
      .select({
        id: appointments.id,
        patientId: appointments.patientId,
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.doctorId, doctor.id),
          eq(appointments.status, "completed")
        )
      )
      .limit(1);

    if (latestAppts.length === 0) {
      console.log(`  [waitlist] Doctor ${doctor.name}: no completed appointments — skipping follow-up`);
      continue;
    }

    const latestAppt = latestAppts[0];
    const preferredDate = dateOffset(offsets[i % offsets.length]);

    // Check if a follow_up already exists for this doctor+patient+date
    const existing = await db
      .select({ id: waitlist.id })
      .from(waitlist)
      .where(
        and(
          eq(waitlist.doctorId, doctor.id),
          eq(waitlist.patientId, latestAppt.patientId),
          eq(waitlist.source, "follow_up"),
          eq(waitlist.preferredDate, preferredDate)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      console.log(`  [waitlist] Doctor ${doctor.name}: follow-up row already exists — skipping`);
      continue;
    }

    await db.insert(waitlist).values({
      doctorId: doctor.id,
      patientId: latestAppt.patientId,
      preferredDate,
      source: "follow_up",
      appointmentId: latestAppt.id,
    });
    inserted++;
  }

  console.log(`[waitlist] inserted ${inserted} follow_up rows`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=== Doktori demo seed (G2–G11) ===");

  try {
    await seedDoctorTypes();       // G3: appointment type questions + G1 second practice
    await seedConsultationNotes(); // G5: SOAP notes
    await seedMedicalProfiles();   // G6: patient medical profiles
    await seedDependents();        // G2: patient dependents
    await seedCnamClaims();        // G9: CNAM claims
    await seedAppointmentAnswers();// G3: appointment answers
    await seedWaitlistFollowUp();  // G11: waitlist follow_up

    console.log("\n=== Demo seed complete ===");
    await client.end();
    process.exit(0);
  } catch (err) {
    console.error("\n[seed-demo-data] ERROR:", err);
    await client.end();
    process.exit(1);
  }
}

main();
