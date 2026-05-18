import { NextRequest, NextResponse } from "next/server";
import { db, patientAllergies, patientVaccinations, patientAnalyses, appointments } from "@doktori/db";
import { eq, and, inArray } from "drizzle-orm";
import { requireAuth } from "@/lib/require-auth";

const TABLES = {
  allergy: patientAllergies,
  vaccination: patientVaccinations,
  analysis: patientAnalyses,
} as const;

type DossierType = keyof typeof TABLES;

// PATCH /api/doctor/patient-approvals
// Body: { type: 'allergy'|'vaccination'|'analysis', itemId: uuid, action: 'approve'|'reject', reason?: string }
export async function PATCH(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user || user.role !== "doctor") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const doctorId = user.id;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Corps invalide" }, { status: 400 });

  const type = body.type as DossierType;
  const itemId = typeof body.itemId === "string" ? body.itemId : "";
  const action = body.action as "approve" | "reject";
  const reason = typeof body.reason === "string" ? body.reason : null;

  if (!TABLES[type] || !itemId || (action !== "approve" && action !== "reject")) {
    return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
  }

  const table = TABLES[type];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [row] = await db.select().from(table as any).where(eq((table as any).id, itemId)).limit(1);
  if (!row) return NextResponse.json({ error: "Item introuvable" }, { status: 404 });

  // Authorization: the doctor must have at least one appointment with this patient.
  const [link] = await db
    .select({ id: appointments.id })
    .from(appointments)
    .where(
      and(
        eq(appointments.doctorId, doctorId),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        eq(appointments.patientId, (row as any).patientId),
        inArray(appointments.status, ["completed", "confirmed", "pending"]),
      ),
    )
    .limit(1);
  if (!link) {
    return NextResponse.json({ error: "Pas de lien clinique avec ce patient" }, { status: 403 });
  }

  const now = new Date();
  if (action === "approve") {
    await db
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update(table as any)
      .set({
        approvalStatus: "approved",
        approvedByDoctorId: doctorId,
        approvedAt: now,
        rejectionReason: null,
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .where(eq((table as any).id, itemId));
  } else {
    await db
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update(table as any)
      .set({
        approvalStatus: "rejected",
        approvedByDoctorId: doctorId,
        approvedAt: now,
        rejectionReason: reason,
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .where(eq((table as any).id, itemId));
  }

  return NextResponse.json({ ok: true });
}

// GET /api/doctor/patient-approvals?patientId=...
// Returns pending allergies + vaccinations + analyses for the patient (if doctor has access).
export async function GET(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user || user.role !== "doctor") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const url = new URL(req.url);
  const patientId = url.searchParams.get("patientId");
  if (!patientId) return NextResponse.json({ error: "patientId requis" }, { status: 400 });

  // Auth check: doctor must have at least one appointment with the patient.
  const [link] = await db
    .select({ id: appointments.id })
    .from(appointments)
    .where(and(eq(appointments.doctorId, user.id), eq(appointments.patientId, patientId)))
    .limit(1);
  if (!link) {
    return NextResponse.json({ allergies: [], vaccinations: [], analyses: [] });
  }

  const [allergies, vaccinations, analyses] = await Promise.all([
    db.select().from(patientAllergies).where(
      and(eq(patientAllergies.patientId, patientId), eq(patientAllergies.approvalStatus, "pending")),
    ),
    db.select().from(patientVaccinations).where(
      and(eq(patientVaccinations.patientId, patientId), eq(patientVaccinations.approvalStatus, "pending")),
    ),
    db.select().from(patientAnalyses).where(
      and(eq(patientAnalyses.patientId, patientId), eq(patientAnalyses.approvalStatus, "pending")),
    ),
  ]);

  return NextResponse.json({ allergies, vaccinations, analyses });
}
