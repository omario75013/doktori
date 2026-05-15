import { NextRequest, NextResponse } from "next/server";
import { db, labPatientNotes } from "@doktori/db";
import { and, eq } from "drizzle-orm";
import { requireLabUser } from "@/lib/lab-auth";

// PATCH /api/laboratoire/patients/[id]/notes/[noteId] — author or admin only
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> },
) {
  const ctx = await requireLabUser();
  if (ctx instanceof NextResponse) return ctx;
  const { labId, labUserId, labUserRole } = ctx;
  const { id: patientId, noteId } = await params;

  const [existing] = await db
    .select()
    .from(labPatientNotes)
    .where(and(eq(labPatientNotes.id, noteId), eq(labPatientNotes.labId, labId), eq(labPatientNotes.patientId, patientId)))
    .limit(1);
  if (!existing) return NextResponse.json({ error: "Note introuvable" }, { status: 404 });

  if (existing.authorLabUserId !== labUserId && labUserRole !== "admin") {
    return NextResponse.json({ error: "Réservé à l'auteur ou aux administrateurs" }, { status: 403 });
  }

  let body: { body?: string; pinned?: boolean };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 });
  }

  const updates: Partial<{ body: string; pinned: boolean; updatedAt: Date }> = { updatedAt: new Date() };
  if (typeof body.body === "string" && body.body.trim()) updates.body = body.body.trim();
  if (typeof body.pinned === "boolean") updates.pinned = body.pinned;

  await db.update(labPatientNotes).set(updates).where(eq(labPatientNotes.id, noteId));
  return NextResponse.json({ ok: true });
}

// DELETE /api/laboratoire/patients/[id]/notes/[noteId] — author or admin only
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> },
) {
  const ctx = await requireLabUser();
  if (ctx instanceof NextResponse) return ctx;
  const { labId, labUserId, labUserRole } = ctx;
  const { id: patientId, noteId } = await params;

  const [existing] = await db
    .select()
    .from(labPatientNotes)
    .where(and(eq(labPatientNotes.id, noteId), eq(labPatientNotes.labId, labId), eq(labPatientNotes.patientId, patientId)))
    .limit(1);
  if (!existing) return NextResponse.json({ error: "Note introuvable" }, { status: 404 });

  if (existing.authorLabUserId !== labUserId && labUserRole !== "admin") {
    return NextResponse.json({ error: "Réservé à l'auteur ou aux administrateurs" }, { status: 403 });
  }

  await db.delete(labPatientNotes).where(eq(labPatientNotes.id, noteId));
  return NextResponse.json({ ok: true });
}
