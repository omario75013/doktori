import { NextRequest, NextResponse } from "next/server";
import {
  db,
  patientAllergies,
  patientVaccinations,
  patientAnalyses,
  appointments,
} from "@doktori/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "@/lib/require-auth";

const TABLES = {
  allergy: patientAllergies,
  vaccination: patientVaccinations,
  analysis: patientAnalyses,
} as const;

type DossierType = keyof typeof TABLES;

async function hasAccess(doctorId: string, patientId: string): Promise<boolean> {
  const [link] = await db
    .select({ id: appointments.id })
    .from(appointments)
    .where(and(eq(appointments.doctorId, doctorId), eq(appointments.patientId, patientId)))
    .limit(1);
  return !!link;
}

// PATCH ?type=allergy|vaccination|analysis
// Body: partial fields (allergen, severity, reaction, …)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  const user = await requireAuth(req);
  if (!user || user.role !== "doctor") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const { id: patientId, itemId } = await params;
  if (!(await hasAccess(user.id, patientId))) {
    return NextResponse.json({ error: "Patient introuvable" }, { status: 404 });
  }
  const type = new URL(req.url).searchParams.get("type") as DossierType | null;
  if (!type || !TABLES[type]) {
    return NextResponse.json({ error: "type requis" }, { status: 400 });
  }
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Corps invalide" }, { status: 400 });

  const table = TABLES[type];
  const allowed: Record<DossierType, string[]> = {
    allergy: ["allergen", "severity", "reaction", "diagnosedAt"],
    vaccination: ["vaccineName", "dateReceived", "batchNumber", "givenBy", "notes"],
    analysis: ["title", "labName", "testDate", "fileUrl", "notes"],
  };
  const updates: Record<string, unknown> = {};
  for (const k of allowed[type]) {
    if (k in body) updates[k] = body[k];
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Aucun champ à modifier" }, { status: 400 });
  }
  await db
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update(table as any)
    .set(updates)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .where(and(eq((table as any).id, itemId), eq((table as any).patientId, patientId)));
  return NextResponse.json({ ok: true });
}

// DELETE ?type=allergy|vaccination|analysis
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  const user = await requireAuth(req);
  if (!user || user.role !== "doctor") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const { id: patientId, itemId } = await params;
  if (!(await hasAccess(user.id, patientId))) {
    return NextResponse.json({ error: "Patient introuvable" }, { status: 404 });
  }
  const type = new URL(req.url).searchParams.get("type") as DossierType | null;
  if (!type || !TABLES[type]) {
    return NextResponse.json({ error: "type requis" }, { status: 400 });
  }
  const table = TABLES[type];
  await db
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .delete(table as any)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .where(and(eq((table as any).id, itemId), eq((table as any).patientId, patientId)));
  return NextResponse.json({ ok: true });
}
