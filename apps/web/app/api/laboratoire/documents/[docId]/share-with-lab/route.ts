import { NextRequest, NextResponse } from "next/server";
import { db, labs, patientDocuments } from "@doktori/db";
import { and, eq, sql } from "drizzle-orm";
import { requireLabContext } from "@/lib/lab-auth";

/**
 * POST /api/laboratoire/documents/[docId]/share-with-lab
 * Body: { targetLabId: string; share: boolean }
 *
 * Adds or removes targetLabId from patient_documents.shared_with_lab_ids.
 * Guards:
 *   - Requesting lab must own the document (uploaded_by_lab_id = current lab).
 *   - Target lab must be verified.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ docId: string }> }
) {
  const ctx = await requireLabContext();
  if (ctx instanceof NextResponse) return ctx;
  const { labId } = ctx;

  const { docId } = await params;

  let body: { targetLabId?: unknown; share?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 });
  }

  const { targetLabId, share } = body;
  if (typeof targetLabId !== "string" || !targetLabId) {
    return NextResponse.json({ error: "targetLabId requis" }, { status: 400 });
  }
  if (typeof share !== "boolean") {
    return NextResponse.json({ error: "share (boolean) requis" }, { status: 400 });
  }

  // Fetch the document and verify ownership.
  const [doc] = await db
    .select({
      id: patientDocuments.id,
      uploadedByLabId: patientDocuments.uploadedByLabId,
    })
    .from(patientDocuments)
    .where(eq(patientDocuments.id, docId))
    .limit(1);

  if (!doc) {
    return NextResponse.json({ error: "Document introuvable" }, { status: 404 });
  }
  if (doc.uploadedByLabId !== labId) {
    return NextResponse.json(
      { error: "Ce document n'appartient pas à votre laboratoire" },
      { status: 403 }
    );
  }

  // Verify target lab is verified.
  const [targetLab] = await db
    .select({ id: labs.id, clinicId: labs.clinicId })
    .from(labs)
    .where(
      and(
        eq(labs.id, targetLabId),
        eq(labs.verificationStatus, "verified")
      )
    )
    .limit(1);

  if (!targetLab) {
    return NextResponse.json(
      { error: "Laboratoire cible introuvable ou non vérifié" },
      { status: 400 }
    );
  }

  // Update shared_with_lab_ids.
  if (share) {
    await db.execute(sql`
      UPDATE patient_documents
      SET shared_with_lab_ids = array_append(
        array_remove(shared_with_lab_ids, ${targetLabId}::uuid),
        ${targetLabId}::uuid
      )
      WHERE id = ${docId}
    `);
  } else {
    await db.execute(sql`
      UPDATE patient_documents
      SET shared_with_lab_ids = array_remove(shared_with_lab_ids, ${targetLabId}::uuid)
      WHERE id = ${docId}
    `);
  }

  // Audit — logClinicAudit requires a clinicId; fall back to console if not available.
  const clinicId = targetLab.clinicId;
  if (clinicId) {
    try {
      const { logClinicAudit } = await import("@/lib/audit");
      await logClinicAudit({
        clinicId,
        actorType: "doctor", // closest available actor type; audit schema is clinic-centric
        actorId: labId,
        action: "doc_share_inter_lab",
        targetType: "patient_document",
        targetId: docId,
        metadata: { targetLabId, share },
      });
    } catch (e) {
      console.error("[audit] doc_share_inter_lab failed", e);
    }
  } else {
    console.log("[audit] doc_share_inter_lab", {
      actorLabId: labId,
      targetLabId,
      docId,
      share,
    });
  }

  return NextResponse.json({ ok: true });
}
