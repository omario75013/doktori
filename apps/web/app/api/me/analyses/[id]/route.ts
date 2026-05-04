import { NextRequest, NextResponse } from "next/server";
import { db, patientAnalyses } from "@doktori/db";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getPatientFromRequest } from "@/lib/patient-auth";
import { deleteFromR2 } from "@/lib/r2";

const patchSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  labName: z.string().trim().max(160).optional().nullable(),
  testDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
}).strict();

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const patient = getPatientFromRequest(req);
  if (!patient) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { id } = await params;

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation échouée", details: parsed.error.flatten() }, { status: 400 });
  }
  const update: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(parsed.data)) {
    if (v !== undefined) update[k] = v;
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Aucune donnée à mettre à jour" }, { status: 400 });
  }

  const [updated] = await db
    .update(patientAnalyses)
    .set(update)
    .where(and(eq(patientAnalyses.id, id), eq(patientAnalyses.patientId, patient.id)))
    .returning();

  if (!updated) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json({ analysis: updated });
}

function extractKeyFromUrl(url: string | null): string | null {
  if (!url) return null;
  const publicBase = process.env.R2_PUBLIC_URL || "";
  if (publicBase && url.startsWith(publicBase + "/")) {
    return url.slice(publicBase.length + 1);
  }
  // dev fallback URLs (/uploads/doktori/...) — translate to doktori/...
  const m = url.match(/\/uploads\/(doktori\/.+)$/);
  if (m) return m[1];
  return null;
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const patient = getPatientFromRequest(req);
  if (!patient) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { id } = await params;

  const [existing] = await db
    .select({ id: patientAnalyses.id, fileUrl: patientAnalyses.fileUrl })
    .from(patientAnalyses)
    .where(and(eq(patientAnalyses.id, id), eq(patientAnalyses.patientId, patient.id)))
    .limit(1);

  if (!existing) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const key = extractKeyFromUrl(existing.fileUrl);
  if (key) {
    try { await deleteFromR2(key); } catch { /* best-effort */ }
  }

  await db
    .delete(patientAnalyses)
    .where(and(eq(patientAnalyses.id, id), eq(patientAnalyses.patientId, patient.id)));

  return new NextResponse(null, { status: 204 });
}
