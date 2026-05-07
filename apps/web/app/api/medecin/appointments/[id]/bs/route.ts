/**
 * V1 Bulletin de Soins (BS1) — generate / read / status update.
 *
 * Auth: doctor or secretary, must own the appointment.
 *
 * POST   /api/medecin/appointments/{id}/bs
 *   Generates the PDF, uploads to R2 under "bs/{appointmentId}.pdf",
 *   stamps appointments.bsPdfUrl + bsStatus='generated' + bsGeneratedAt=NOW.
 *   Returns { url }.
 *
 * GET    /api/medecin/appointments/{id}/bs
 *   Returns { url, status, generatedAt } if a BS has been generated, else 404.
 *
 * PATCH  /api/medecin/appointments/{id}/bs
 *   Body: { status: "sent_to_cnam" | "reimbursed" | "rejected", rejectionReason?: string }
 *   Stamps the matching timestamp column and (for "rejected") the rejection
 *   reason. No automatic CNAM transmission — see docs/cnam-integration.md.
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "@/lib/require-auth";
import { db, appointments, patients, doctors, doctorPractices } from "@doktori/db";
import { uploadToR2 } from "@/lib/r2";
import { generateBulletinSoins, type BulletinSoinsData } from "@/lib/cnam-bs-generator";

async function requireDoctorContext(req: NextRequest, appointmentId: string) {
  const user = await requireAuth(req);
  if (!user) {
    return { error: NextResponse.json({ error: "Non autorisé" }, { status: 401 }) };
  }
  const doctorId =
    user.role === "doctor"
      ? user.id
      : user.role === "secretary"
        ? user.doctorId
        : null;
  if (!doctorId) {
    return {
      error: NextResponse.json({ error: "Accès non autorisé" }, { status: 403 }),
    };
  }
  // Ensure the appointment belongs to this doctor.
  const [appt] = await db
    .select({ id: appointments.id })
    .from(appointments)
    .where(and(eq(appointments.id, appointmentId), eq(appointments.doctorId, doctorId)))
    .limit(1);
  if (!appt) {
    return {
      error: NextResponse.json(
        { error: "RDV introuvable ou accès non autorisé" },
        { status: 404 },
      ),
    };
  }
  return { doctorId };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ctx = await requireDoctorContext(req, id);
  if ("error" in ctx) return ctx.error;

  const [row] = await db
    .select({
      url: appointments.bsPdfUrl,
      status: appointments.bsStatus,
      generatedAt: appointments.bsGeneratedAt,
      sentAt: appointments.bsSentAt,
      reimbursedAt: appointments.bsReimbursedAt,
      rejectionReason: appointments.bsRejectionReason,
    })
    .from(appointments)
    .where(eq(appointments.id, id))
    .limit(1);

  if (!row || !row.url) {
    return NextResponse.json({ error: "Aucun BS généré" }, { status: 404 });
  }

  return NextResponse.json(row);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ctx = await requireDoctorContext(req, id);
  if ("error" in ctx) return ctx.error;

  // Pull the data we need to fill the form.
  const [appt] = await db
    .select({
      id: appointments.id,
      startsAt: appointments.startsAt,
      reason: appointments.reason,
      doctorId: appointments.doctorId,
      patientId: appointments.patientId,
      practiceId: appointments.practiceId,
    })
    .from(appointments)
    .where(eq(appointments.id, id))
    .limit(1);

  if (!appt) {
    return NextResponse.json({ error: "RDV introuvable" }, { status: 404 });
  }

  const [[patient], [doctor], practiceRow] = await Promise.all([
    db
      .select({
        name: patients.name,
        cnamNumber: patients.cnamNumber,
        cnssNumber: patients.cnssNumber,
        cnamRegime: patients.cnamRegime,
        dateOfBirth: patients.dateOfBirth,
        cin: patients.cin,
      })
      .from(patients)
      .where(eq(patients.id, appt.patientId))
      .limit(1),
    db
      .select({
        name: doctors.name,
        specialty: doctors.specialty,
        address: doctors.address,
        phone: doctors.phone,
        consultationFee: doctors.consultationFee,
      })
      .from(doctors)
      .where(eq(doctors.id, appt.doctorId))
      .limit(1),
    appt.practiceId
      ? db
          .select({
            name: doctorPractices.name,
            address: doctorPractices.address,
            phone: doctorPractices.phone,
          })
          .from(doctorPractices)
          .where(eq(doctorPractices.id, appt.practiceId))
          .limit(1)
      : Promise.resolve([] as Array<{ name: string; address: string; phone: string | null }>),
  ]);

  if (!patient || !doctor) {
    return NextResponse.json({ error: "Données incomplètes" }, { status: 422 });
  }

  const practice = practiceRow[0];

  const data: BulletinSoinsData = {
    patient: {
      cnamNumber: patient.cnamNumber,
      cnssNumber: patient.cnssNumber,
      cnamRegime: patient.cnamRegime,
      name: patient.name,
      dateOfBirth: patient.dateOfBirth ? new Date(patient.dateOfBirth) : null,
      cin: patient.cin,
    },
    doctor: {
      name: doctor.name,
      specialty: doctor.specialty,
      address: practice?.address ?? doctor.address,
      cnomCode: null, // not stored on the doctor row in V1
      cnamConventionCode: null, // idem
    },
    appointment: {
      id: appt.id,
      date: appt.startsAt,
      diagnosis: appt.reason,
      consultationFee: doctor.consultationFee ?? 0,
      treatments: null,
    },
    practice: practice
      ? {
          name: practice.name,
          address: practice.address,
          phone: practice.phone ?? doctor.phone ?? null,
        }
      : undefined,
  };

  let pdfBytes: Uint8Array;
  try {
    pdfBytes = await generateBulletinSoins(data);
  } catch (err) {
    console.error("[bs] PDF generation failed:", err);
    return NextResponse.json({ error: "Échec de génération du PDF" }, { status: 500 });
  }

  const key = `bs/${id}.pdf`;
  const url = await uploadToR2(Buffer.from(pdfBytes), key, "application/pdf");

  await db
    .update(appointments)
    .set({
      bsPdfUrl: url,
      bsStatus: "generated",
      bsGeneratedAt: new Date(),
      // Re-generation clears the previous "sent / reimbursed" flags so the
      // doctor restarts the lifecycle cleanly. Keep the rejection reason
      // alone — the doctor may want to keep it for context.
      bsSentAt: null,
      bsReimbursedAt: null,
    })
    .where(eq(appointments.id, id));

  return NextResponse.json({ url });
}

const patchSchema = z
  .object({
    status: z.enum(["sent_to_cnam", "reimbursed", "rejected"]),
    rejectionReason: z.string().trim().max(500).optional().nullable(),
  })
  .strict();

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ctx = await requireDoctorContext(req, id);
  if ("error" in ctx) return ctx.error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation échouée", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // Must have a generated PDF before we can mark it sent / reimbursed / rejected.
  const [current] = await db
    .select({ url: appointments.bsPdfUrl })
    .from(appointments)
    .where(eq(appointments.id, id))
    .limit(1);
  if (!current?.url) {
    return NextResponse.json(
      { error: "Aucun BS généré — générez le PDF avant de changer le statut" },
      { status: 409 },
    );
  }

  const update: Record<string, unknown> = { bsStatus: parsed.data.status };
  const now = new Date();
  if (parsed.data.status === "sent_to_cnam") update.bsSentAt = now;
  if (parsed.data.status === "reimbursed") update.bsReimbursedAt = now;
  if (parsed.data.status === "rejected") {
    update.bsRejectionReason = parsed.data.rejectionReason ?? null;
  } else {
    // Clear any prior rejection reason if the doctor moves to a non-rejected state.
    update.bsRejectionReason = null;
  }

  await db.update(appointments).set(update).where(eq(appointments.id, id));

  return NextResponse.json({ ok: true, status: parsed.data.status });
}
