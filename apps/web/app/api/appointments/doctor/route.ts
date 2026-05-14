import { NextResponse, NextRequest } from "next/server";
import { z } from "zod";
import { db, appointments, patients, doctorPractices, clinics } from "@doktori/db";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { requireDoctorOrSecretaryUnified } from "@/lib/require-auth";

export async function GET(req: NextRequest) {
  const authz = await requireDoctorOrSecretaryUnified(req);
  if (authz instanceof Response) return authz;
  const doctorId = authz.doctorId;

  const { searchParams } = new URL(req.url);
  const dateFrom = searchParams.get("from");
  const dateTo = searchParams.get("to");
  const practiceId = searchParams.get("practiceId");

  const conditions = [eq(appointments.doctorId, doctorId)];
  if (dateFrom) conditions.push(gte(appointments.startsAt, new Date(dateFrom)));
  if (dateTo) conditions.push(lte(appointments.startsAt, new Date(dateTo)));
  if (practiceId && practiceId !== "all") {
    conditions.push(eq(appointments.practiceId, practiceId));
  }

  const results = await db
    .select({
      id: appointments.id,
      startsAt: appointments.startsAt,
      endsAt: appointments.endsAt,
      status: appointments.status,
      type: appointments.type,
      reason: appointments.reason,
      checkedInAt: appointments.checkedInAt,
      practiceId: appointments.practiceId,
      patientName: patients.name,
      patientPhone: patients.phone,
      patientNoShowCount: patients.noShowCount,
      patientLastMinuteCancelCount: patients.lastMinuteCancelCount,
      clinicName: clinics.name,
    })
    .from(appointments)
    .innerJoin(patients, eq(appointments.patientId, patients.id))
    .leftJoin(doctorPractices, eq(appointments.practiceId, doctorPractices.id))
    .leftJoin(clinics, eq(doctorPractices.clinicId, clinics.id))
    .where(and(...conditions))
    .orderBy(desc(appointments.startsAt))
    .limit(100);

  return NextResponse.json(results);
}

const createSchema = z.object({
  patientId: z.string().uuid(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  type: z.enum(["cabinet", "teleconsult", "domicile"]).default("cabinet"),
  reason: z.string().trim().max(500).optional().nullable(),
  practiceId: z.string().uuid().optional().nullable(),
});

export async function POST(req: NextRequest) {
  const authz = await requireDoctorOrSecretaryUnified(req);
  if (authz instanceof Response) return authz;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation échouée", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { patientId, startsAt, endsAt, type, reason, practiceId } = parsed.data;
  const doctorId = authz.doctorId;

  const start = new Date(startsAt);
  const end = new Date(endsAt);
  if (start >= end) {
    return NextResponse.json({ error: "L'heure de fin doit être postérieure au début" }, { status: 400 });
  }

  // Validate patient exists
  const [patient] = await db.select({ id: patients.id }).from(patients).where(eq(patients.id, patientId)).limit(1);
  if (!patient) {
    return NextResponse.json({ error: "Patient introuvable" }, { status: 404 });
  }

  // Resolve practice: use provided → validate ownership; else use primary
  let resolvedPracticeId: string;
  if (practiceId) {
    const [p] = await db
      .select({ id: doctorPractices.id })
      .from(doctorPractices)
      .where(and(eq(doctorPractices.id, practiceId), eq(doctorPractices.doctorId, doctorId), eq(doctorPractices.isActive, true)))
      .limit(1);
    if (!p) return NextResponse.json({ error: "Cabinet introuvable" }, { status: 400 });
    resolvedPracticeId = p.id;
  } else {
    const [primary] = await db
      .select({ id: doctorPractices.id })
      .from(doctorPractices)
      .where(and(eq(doctorPractices.doctorId, doctorId), eq(doctorPractices.isPrimary, true), eq(doctorPractices.isActive, true)))
      .limit(1);
    const [any] = primary ? [] : await db
      .select({ id: doctorPractices.id })
      .from(doctorPractices)
      .where(and(eq(doctorPractices.doctorId, doctorId), eq(doctorPractices.isActive, true)))
      .limit(1);
    const found = primary ?? any;
    if (!found) return NextResponse.json({ error: "Aucun cabinet actif" }, { status: 400 });
    resolvedPracticeId = found.id;
  }

  const [created] = await db
    .insert(appointments)
    .values({
      doctorId,
      patientId,
      startsAt: start,
      endsAt: end,
      status: "confirmed",
      type,
      reason: reason ?? null,
      practiceId: resolvedPracticeId,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
