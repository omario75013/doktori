import { NextRequest, NextResponse } from "next/server";
import { db, patientAttachments } from "@doktori/db";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { deleteFromR2 } from "@/lib/r2";
import { getPatientFromRequest } from "@/lib/patient-auth";

const VALID_CATEGORIES = ["rx", "lab", "xr", "rep", "ins", "autre"] as const;

const patchSchema = z.object({
  category: z.enum(VALID_CATEGORIES).optional(),
  title: z.string().trim().min(1).max(200).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const patient = getPatientFromRequest(req);
  if (!patient) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation échouée" }, { status: 400 });
  }
  if (Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: "Aucun changement" }, { status: 400 });
  }

  const [updated] = await db
    .update(patientAttachments)
    .set(parsed.data)
    .where(and(eq(patientAttachments.id, id), eq(patientAttachments.patientId, patient.id)))
    .returning();

  if (!updated) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  return NextResponse.json({ ok: true, item: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const patient = getPatientFromRequest(req);
  if (!patient) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;

  const [row] = await db
    .select({ id: patientAttachments.id, fileKey: patientAttachments.fileKey })
    .from(patientAttachments)
    .where(and(eq(patientAttachments.id, id), eq(patientAttachments.patientId, patient.id)))
    .limit(1);

  if (!row) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  if (row.fileKey) deleteFromR2(row.fileKey).catch(() => {});
  await db.delete(patientAttachments).where(eq(patientAttachments.id, id));

  return NextResponse.json({ ok: true });
}
