import { NextResponse } from "next/server";
import { z } from "zod";
import { db, patients, appointments, clinicDoctors, patientCommunicationOptout } from "@doktori/db";
import { eq, and, inArray, gte, lte, gt, sql } from "drizzle-orm";
import { requireClinic } from "@/lib/clinic-auth";

// ── Validation ────────────────────────────────────────────────────────────────

const FilterSchema = z.object({
  doctorIds: z.array(z.string().uuid()).optional(),
  lastVisitFrom: z.string().datetime({ offset: true }).optional(),
  lastVisitTo: z.string().datetime({ offset: true }).optional(),
  motif: z.string().optional(),
  hasFutureRdv: z.boolean().optional(),
});

export type CommunicationFilter = z.infer<typeof FilterSchema>;

// ── Shared recipient resolver ─────────────────────────────────────────────────

export async function resolveRecipients(clinicId: string, filter: CommunicationFilter) {
  // 1. Get all doctor ids belonging to this clinic
  const clinicDoctorRows = await db
    .select({ doctorId: clinicDoctors.doctorId })
    .from(clinicDoctors)
    .where(eq(clinicDoctors.clinicId, clinicId));

  const allClinicDoctorIds = clinicDoctorRows.map((r) => r.doctorId);
  if (allClinicDoctorIds.length === 0) return [];

  const targetDoctorIds =
    filter.doctorIds && filter.doctorIds.length > 0
      ? filter.doctorIds.filter((id) => allClinicDoctorIds.includes(id))
      : allClinicDoctorIds;

  if (targetDoctorIds.length === 0) return [];

  // 2. Get opted-out patient ids
  const optOutRows = await db
    .select({ patientId: patientCommunicationOptout.patientId })
    .from(patientCommunicationOptout);
  const optOutIds = optOutRows.map((r) => r.patientId);

  // 3. Build appointment filter conditions
  const conditions = [inArray(appointments.doctorId, targetDoctorIds)];

  if (filter.lastVisitFrom) {
    conditions.push(gte(appointments.startsAt, new Date(filter.lastVisitFrom)));
  }
  if (filter.lastVisitTo) {
    conditions.push(lte(appointments.startsAt, new Date(filter.lastVisitTo)));
  }
  if (filter.motif) {
    conditions.push(sql`${appointments.reason} ILIKE ${"%" + filter.motif + "%"}`);
  }

  // hasFutureRdv: patient must have at least one future confirmed appointment
  if (filter.hasFutureRdv === true) {
    // We'll filter in memory after the main query for simplicity
  }

  // 4. Query distinct patients who had appointments with clinic doctors
  const apptRows = await db
    .select({
      patientId: appointments.patientId,
      patientName: patients.name,
      patientPhone: patients.phone,
      startsAt: appointments.startsAt,
    })
    .from(appointments)
    .innerJoin(patients, eq(appointments.patientId, patients.id))
    .where(and(...conditions));

  // 5. Deduplicate by patientId
  const byPatient = new Map<
    string,
    { patientId: string; name: string; phone: string }
  >();
  for (const row of apptRows) {
    if (!byPatient.has(row.patientId)) {
      byPatient.set(row.patientId, {
        patientId: row.patientId,
        name: row.patientName,
        phone: row.patientPhone,
      });
    }
  }

  let recipients = Array.from(byPatient.values());

  // 6. Filter opted-out patients
  if (optOutIds.length > 0) {
    recipients = recipients.filter((r) => !optOutIds.includes(r.patientId));
  }

  // 7. Apply hasFutureRdv filter
  if (filter.hasFutureRdv === true) {
    const now = new Date();
    const futurePatientsRows = await db
      .select({ patientId: appointments.patientId })
      .from(appointments)
      .where(
        and(
          inArray(appointments.doctorId, targetDoctorIds),
          gt(appointments.startsAt, now),
          sql`${appointments.status} IN ('confirmed', 'pending')`,
        )
      );
    const futurePatientsSet = new Set(futurePatientsRows.map((r) => r.patientId));
    recipients = recipients.filter((r) => futurePatientsSet.has(r.patientId));
  }

  return recipients;
}

// ── POST /api/clinique/communication/recipients ───────────────────────────────

export async function POST(req: Request) {
  const clinic = await requireClinic();
  if (clinic instanceof NextResponse) return clinic;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const parsed = FilterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const recipients = await resolveRecipients(clinic.id, parsed.data);

  // Shuffle for a random sample of 10
  const shuffled = [...recipients].sort(() => Math.random() - 0.5);
  const sample = shuffled.slice(0, 10).map((r) => ({
    patientId: r.patientId,
    name: r.name,
    phone: r.phone.replace(/\d(?=\d{4})/g, "*"), // mask middle digits for privacy
  }));

  return NextResponse.json({ count: recipients.length, sample });
}
