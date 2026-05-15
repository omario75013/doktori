import { NextRequest, NextResponse } from "next/server";
import { db, labOrders, patientDocuments, labPatientNotes } from "@doktori/db";
import { and, eq, or, sql } from "drizzle-orm";
import { requireLabUser } from "@/lib/lab-auth";

// POST /api/laboratoire/patients/[id]/notes — create a lab-internal note about a patient
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireLabUser();
  if (ctx instanceof NextResponse) return ctx;
  const { labId, labUserId } = ctx;
  const { id: patientId } = await params;

  // Access guard: this lab must have at least one order or document for the patient
  const access = await db
    .select({ exists: sql<number>`1` })
    .from(labOrders)
    .where(and(eq(labOrders.patientId, patientId), or(eq(labOrders.labId, labId), eq(labOrders.completedByLabId, labId))))
    .limit(1);
  if (access.length === 0) {
    const docAccess = await db
      .select({ exists: sql<number>`1` })
      .from(patientDocuments)
      .where(and(eq(patientDocuments.patientId, patientId), eq(patientDocuments.uploadedByLabId, labId)))
      .limit(1);
    if (docAccess.length === 0) {
      return NextResponse.json({ error: "Patient introuvable" }, { status: 404 });
    }
  }

  let body: { body?: string; pinned?: boolean };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 });
  }
  if (!body.body?.trim()) {
    return NextResponse.json({ error: "Texte de note requis" }, { status: 400 });
  }

  const [note] = await db
    .insert(labPatientNotes)
    .values({
      labId,
      patientId,
      authorLabUserId: labUserId,
      body: body.body.trim(),
      pinned: !!body.pinned,
    })
    .returning();

  return NextResponse.json({ note }, { status: 201 });
}
