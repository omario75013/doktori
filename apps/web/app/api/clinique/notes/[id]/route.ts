import { NextResponse } from "next/server";
import { z } from "zod";
import { db, clinicNotes } from "@doktori/db";
import { eq, and } from "drizzle-orm";
import { requireClinic } from "@/lib/clinic-auth";
import { logClinicAudit } from "@/lib/audit";

const patchSchema = z.object({
  title: z.string().max(255).optional(),
  body: z.string().min(1).optional(),
  pinned: z.boolean().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const clinic = await requireClinic();
  if (clinic instanceof NextResponse) return clinic;

  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides", details: parsed.error.flatten() }, { status: 400 });
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.data.title !== undefined) updates.title = parsed.data.title;
  if (parsed.data.body !== undefined) updates.body = parsed.data.body;
  if (parsed.data.pinned !== undefined) updates.pinned = parsed.data.pinned;

  const [note] = await db
    .update(clinicNotes)
    .set(updates)
    .where(and(eq(clinicNotes.id, id), eq(clinicNotes.clinicId, clinic.id)))
    .returning();

  if (!note) {
    return NextResponse.json({ error: "Note introuvable" }, { status: 404 });
  }

  void logClinicAudit({
    clinicId: clinic.id,
    actorType: "clinic",
    actorId: clinic.id,
    action: "note.update",
    targetType: "note",
    targetId: id,
  });

  return NextResponse.json({ note });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const clinic = await requireClinic();
  if (clinic instanceof NextResponse) return clinic;

  const { id } = await params;

  const [deleted] = await db
    .delete(clinicNotes)
    .where(and(eq(clinicNotes.id, id), eq(clinicNotes.clinicId, clinic.id)))
    .returning({ id: clinicNotes.id });

  if (!deleted) {
    return NextResponse.json({ error: "Note introuvable" }, { status: 404 });
  }

  void logClinicAudit({
    clinicId: clinic.id,
    actorType: "clinic",
    actorId: clinic.id,
    action: "note.delete",
    targetType: "note",
    targetId: id,
  });

  return NextResponse.json({ success: true });
}
