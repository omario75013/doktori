import { NextRequest, NextResponse } from "next/server";
import { db, patientDocuments } from "@doktori/db";
import { and, eq } from "drizzle-orm";
import { requireLabUser, requireLabContext } from "@/lib/lab-auth";

// DELETE /api/laboratoire/documents/[id] (admin-only)
// Only allowed if uploaded by this lab. Soft-fail on R2.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ docId: string }> }
) {
  const { docId: id } = await params;

  // Try lab_user (admin) first, fall back to legacy lab role
  let labId: string;
  const userResult = await requireLabUser();
  if (userResult instanceof NextResponse) {
    // Maybe legacy lab role
    const ctx = await requireLabContext();
    if (ctx instanceof NextResponse) return ctx;
    labId = ctx.labId;
  } else {
    if (userResult.labUserRole !== "admin") {
      return NextResponse.json({ error: "Réservé aux administrateurs" }, { status: 403 });
    }
    labId = userResult.labId;
  }

  const [doc] = await db
    .select({ id: patientDocuments.id, fileUrl: patientDocuments.fileUrl, uploadedByLabId: patientDocuments.uploadedByLabId })
    .from(patientDocuments)
    .where(and(eq(patientDocuments.id, id), eq(patientDocuments.uploadedByLabId, labId)))
    .limit(1);

  if (!doc) {
    return NextResponse.json({ error: "Document introuvable ou non autorisé" }, { status: 404 });
  }

  // Attempt R2 deletion (fail-soft)
  try {
    const { deleteFromR2 } = await import("@/lib/r2");
    // Extract key from URL
    const url = new URL(doc.fileUrl);
    const key = url.pathname.replace(/^\//, "");
    await deleteFromR2(key);
  } catch (e) {
    console.warn("[r2] soft-fail on delete:", e);
  }

  await db.delete(patientDocuments).where(eq(patientDocuments.id, id));

  return NextResponse.json({ ok: true });
}
