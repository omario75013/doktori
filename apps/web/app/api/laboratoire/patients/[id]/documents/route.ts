import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import {
  db,
  patientDocuments,
  labOrders,
  labConversations,
  labMessages,
  labs,
} from "@doktori/db";
import { and, eq, or, sql } from "drizzle-orm";
import { requireLabUser } from "@/lib/lab-auth";
import { uploadToR2 } from "@/lib/r2";

const MAX_BYTES = 20 * 1024 * 1024;

// POST /api/laboratoire/patients/[patientId]/documents
// Accepts multipart (file upload) or JSON { file: { url, name, mime, size }, title, ... }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireLabUser();
  if (ctx instanceof NextResponse) return ctx;
  const { labId, labUserRole } = ctx;

  // Only admin or technician (both roles) can upload
  if (labUserRole !== "admin" && labUserRole !== "technician") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const { id: patientId } = await params;

  // Access check
  const [accessRow] = await db
    .select({ one: sql<number>`1` })
    .from(labOrders)
    .where(
      and(
        eq(labOrders.patientId, patientId),
        or(eq(labOrders.labId, labId), eq(labOrders.completedByLabId, labId))
      )
    )
    .limit(1);

  let hasAccess = !!accessRow;
  if (!hasAccess) {
    const [docRow] = await db
      .select({ one: sql<number>`1` })
      .from(patientDocuments)
      .where(
        and(
          eq(patientDocuments.patientId, patientId),
          eq(patientDocuments.uploadedByLabId, labId)
        )
      )
      .limit(1);
    hasAccess = !!docRow;
  }
  if (!hasAccess) {
    return NextResponse.json({ error: "Patient introuvable" }, { status: 404 });
  }

  const contentType = req.headers.get("content-type") ?? "";
  let fileUrl: string;
  let fileName: string;
  let mimeType: string;
  let sizeBytes: number | null = null;
  let title: string | null = null;
  let note: string | null = null;
  let category: string | null = null;
  let shareWithDoctorIds: string[] = [];
  let labOrderId: string | null = null;

  if (contentType.startsWith("multipart/form-data")) {
    const form = await req.formData().catch(() => null);
    if (!form) return NextResponse.json({ error: "Corps invalide" }, { status: 400 });

    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Fichier trop volumineux (max 20 Mo)" }, { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const ext = (file.name.split(".").pop() ?? "bin").toLowerCase().slice(0, 8);
    const key = `lab-results/${labId}/${randomUUID()}.${ext}`;
    fileUrl = await uploadToR2(buf, key, file.type || "application/octet-stream");
    fileName = file.name;
    mimeType = file.type || "application/octet-stream";
    sizeBytes = file.size;

    title = (form.get("title") as string | null) ?? null;
    note = (form.get("note") as string | null) ?? null;
    category = (form.get("category") as string | null) ?? null;
    const rawDoctorIds = form.get("shareWithDoctorIds");
    if (rawDoctorIds) {
      try { shareWithDoctorIds = JSON.parse(rawDoctorIds as string); } catch { /* ignore */ }
    }
    const rawOrderId = form.get("labOrderId");
    if (rawOrderId) labOrderId = rawOrderId as string;
  } else {
    // JSON body with pre-uploaded file reference
    const body = await req.json();
    const f = body.file ?? {};
    fileUrl = f.url;
    fileName = f.name ?? "document";
    mimeType = f.mime ?? "application/octet-stream";
    sizeBytes = f.size ?? null;
    title = body.title ?? null;
    note = body.note ?? null;
    category = body.category ?? null;
    shareWithDoctorIds = Array.isArray(body.shareWithDoctorIds) ? body.shareWithDoctorIds : [];
    labOrderId = body.labOrderId ?? null;
  }

  if (!fileUrl) return NextResponse.json({ error: "fileUrl requis" }, { status: 400 });

  // Get lab info for category default
  const [labRow] = await db
    .select({ kind: labs.kind })
    .from(labs)
    .where(eq(labs.id, labId))
    .limit(1);
  const defaultCategory = labRow?.kind === "radiology" ? "imagerie" : "analyse";
  const finalCategory = category ?? defaultCategory;

  const [doc] = await db
    .insert(patientDocuments)
    .values({
      patientId,
      uploadedBy: "lab",
      uploadedByLabId: labId,
      labOrderId: labOrderId ?? undefined,
      fileUrl,
      fileName,
      mimeType,
      sizeBytes: sizeBytes ?? undefined,
      title: title ?? undefined,
      note: note ?? undefined,
      category: finalCategory,
      sharedWithDoctorIds: shareWithDoctorIds,
    })
    .returning();

  // If linked to an order, update status to result_ready
  if (labOrderId) {
    await db
      .update(labOrders)
      .set({
        status: "result_ready",
        resultUploadedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(labOrders.id, labOrderId), eq(labOrders.labId, labId)));
  }

  // Fail-soft: create lab_messages row if sharing with exactly one doctor
  if (shareWithDoctorIds.length === 1) {
    try {
      const doctorId = shareWithDoctorIds[0];
      // find or create lab conversation
      let [conv] = await db
        .select({ id: labConversations.id })
        .from(labConversations)
        .where(
          and(
            eq(labConversations.labId, labId),
            eq(labConversations.counterpartDoctorId, doctorId)
          )
        )
        .limit(1);

      if (!conv) {
        const [newConv] = await db
          .insert(labConversations)
          .values({ labId, counterpartDoctorId: doctorId, subject: "Résultats patient" })
          .returning({ id: labConversations.id });
        conv = newConv;
      }

      if (conv) {
        await db.insert(labMessages).values({
          conversationId: conv.id,
          senderType: "lab",
          senderId: labId,
          body: `Résultat partagé : ${title ?? fileName}`,
          attachmentUrl: fileUrl,
          attachmentName: fileName,
          attachmentMime: mimeType,
          attachmentSize: sizeBytes ?? undefined,
        });
      }
    } catch {
      // fail-soft — don't block the response
    }
  }

  return NextResponse.json({ document: doc });
}
