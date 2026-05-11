import { db, doctors, patients, appointments, doctorPractices } from "@doktori/db";
import { eq } from "drizzle-orm";
import { render } from "@/lib/templates/render";
import type { TemplateContext } from "@/lib/templates/variables";

// Server-side resolver for `{{...}}` placeholders embedded in a prescription's
// stored content. Two call sites:
//   1. POST /api/prescriptions       — render before insert so the row is
//                                      stored already-resolved.
//   2. /ordonnance/[id] preview page — defensive re-render on read so any
//                                      legacy rows with raw placeholders
//                                      still display real values.
export async function buildPrescriptionContext(
  doctorId: string,
  patientId: string,
  appointmentId: string | null,
): Promise<TemplateContext> {
  const [doctor] = await db
    .select({
      id: doctors.id,
      name: doctors.name,
      specialty: doctors.specialty,
      phone: doctors.phone,
      city: doctors.city,
      address: doctors.address,
    })
    .from(doctors)
    .where(eq(doctors.id, doctorId))
    .limit(1);

  const [patient] = await db
    .select({
      id: patients.id,
      name: patients.name,
      phone: patients.phone,
      dateOfBirth: patients.dateOfBirth,
      bloodType: patients.bloodType,
    })
    .from(patients)
    .where(eq(patients.id, patientId))
    .limit(1);

  let practice: { address: string | null; city: string | null; phone: string | null } = {
    address: null,
    city: null,
    phone: null,
  };
  try {
    const [pr] = await db
      .select({
        address: doctorPractices.address,
        city: doctorPractices.city,
        phone: doctorPractices.phone,
      })
      .from(doctorPractices)
      .where(eq(doctorPractices.doctorId, doctorId))
      .limit(1);
    if (pr) practice = pr;
  } catch {
    /* doctorPractices may not exist in older envs */
  }

  let appt: { startsAt: Date | null; type: string | null } = { startsAt: null, type: null };
  if (appointmentId) {
    const [a] = await db
      .select({ startsAt: appointments.startsAt, type: appointments.type })
      .from(appointments)
      .where(eq(appointments.id, appointmentId))
      .limit(1);
    if (a) appt = a;
  }

  // The patient `name` column is "First Last"; split for variables.
  const fullName = patient?.name ?? null;
  const firstName = fullName?.split(/\s+/)[0] ?? null;
  const lastName = fullName?.split(/\s+/).slice(1).join(" ") || null;

  return {
    patient: {
      firstName,
      lastName,
      phone: patient?.phone ?? null,
      cin: null,
      dateOfBirth: patient?.dateOfBirth ?? null,
      weightKg: null,
      heightCm: null,
      bloodType: patient?.bloodType ?? null,
      insuranceProvider: null,
      allergies: null,
    },
    doctor: {
      name: doctor?.name ?? null,
      specialty: doctor?.specialty ?? null,
      city: doctor?.city ?? null,
      phone: doctor?.phone ?? null,
      address: doctor?.address ?? null,
      registrationNumber: null,
    },
    practice,
    appointment: { startsAt: appt.startsAt, type: appt.type },
    locale: "fr",
    now: new Date(),
  };
}

export async function renderPrescriptionContent(
  content: string,
  doctorId: string,
  patientId: string,
  appointmentId: string | null,
): Promise<string> {
  // Cheap pre-check — skip the DB roundtrip when there are no placeholders.
  if (!/\{\{\w+\}\}/.test(content)) return content;
  const ctx = await buildPrescriptionContext(doctorId, patientId, appointmentId);
  const { body } = render(content, ctx);
  return body;
}
