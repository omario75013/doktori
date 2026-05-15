import { NextRequest, NextResponse } from "next/server";
import { db, labAnalysisTypes } from "@doktori/db";
import { and, eq } from "drizzle-orm";
import { requireLabUser } from "@/lib/lab-auth";

// Helper: verify ownership and require admin
async function guardAdmin(id: string) {
  const user = await requireLabUser();
  if (user instanceof NextResponse) return { error: user };
  if (user.labUserRole !== "admin") {
    return { error: NextResponse.json({ error: "Réservé aux administrateurs" }, { status: 403 }) };
  }
  const [row] = await db
    .select({ id: labAnalysisTypes.id })
    .from(labAnalysisTypes)
    .where(and(eq(labAnalysisTypes.id, id), eq(labAnalysisTypes.labId, user.labId)))
    .limit(1);
  if (!row) {
    return { error: NextResponse.json({ error: "Analyse introuvable" }, { status: 404 }) };
  }
  return { labId: user.labId };
}

// PATCH /api/laboratoire/analyses/[id] (admin-only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const guard = await guardAdmin(id);
  if ("error" in guard) return guard.error;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (typeof body.code === "string" && body.code.trim()) updates.code = body.code.trim().toUpperCase();
  if (typeof body.name === "string" && body.name.trim()) updates.name = body.name.trim();
  if ("category" in body) updates.category = typeof body.category === "string" ? body.category.trim() || null : null;
  if ("priceMillimes" in body) updates.priceMillimes = typeof body.priceMillimes === "number" ? body.priceMillimes : null;
  if ("durationHours" in body) updates.durationHours = typeof body.durationHours === "number" ? body.durationHours : null;
  if (typeof body.isActive === "boolean") updates.isActive = body.isActive;

  const [updated] = await db
    .update(labAnalysisTypes)
    .set(updates)
    .where(eq(labAnalysisTypes.id, id))
    .returning();

  return NextResponse.json({ analysis: updated });
}

// DELETE /api/laboratoire/analyses/[id] (admin-only) — soft delete
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const guard = await guardAdmin(id);
  if ("error" in guard) return guard.error;

  await db
    .update(labAnalysisTypes)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(labAnalysisTypes.id, id));

  return NextResponse.json({ ok: true });
}
