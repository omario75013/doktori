import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { db, labOrders, patientDocuments } from "@doktori/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/require-auth";
import { uploadToR2 } from "@/lib/r2";

const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const MAX_BYTES = 15 * 1024 * 1024;

// POST — lab fulfills an order by uploading the result file.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireAuth(req);
  if (!user || user.role !== "lab") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id: orderId } = await params;

  // 1. Fetch and validate the order.
  const [order] = await db
    .select()
    .from(labOrders)
    .where(eq(labOrders.id, orderId))
    .limit(1);

  if (!order) {
    return NextResponse.json({ error: "Demande introuvable" }, { status: 404 });
  }
  if (order.status === "completed" || order.status === "cancelled") {
    return NextResponse.json(
      { error: "Cette demande est déjà clôturée" },
      { status: 422 },
    );
  }
  // The lab must be the assigned lab OR the order has no assigned lab (walk-in).
  if (order.labId !== null && order.labId !== user.id) {
    return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
  }

  // 2. Parse multipart form.
  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Corps de la requête invalide" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json({ error: "Format non supporté (PDF, JPEG, PNG, WebP)" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Fichier trop volumineux (max 15 Mo)" }, { status: 400 });
  }

  const category = (form.get("category") as string | null) ?? "analyse";
  const title = (form.get("title") as string | null) ?? file.name;
  const note = (form.get("note") as string | null) ?? null;

  // 3. Upload to R2.
  const buf = Buffer.from(await file.arrayBuffer());
  const ext = (file.name.split(".").pop() ?? "bin").toLowerCase().slice(0, 8);
  const key = `lab-results/${user.id}/${randomUUID()}.${ext}`;
  const fileUrl = await uploadToR2(buf, key, file.type);

  // 4. Insert patient_documents row shared with the prescribing doctor.
  const [doc] = await db
    .insert(patientDocuments)
    .values({
      patientId: order.patientId,
      uploadedBy: "lab",
      uploadedByLabId: user.id,
      labOrderId: order.id,
      sharedWithDoctorIds: [order.doctorId],
      fileUrl,
      fileName: file.name.slice(0, 255),
      mimeType: file.type,
      sizeBytes: file.size,
      category,
      title: title.slice(0, 255),
      note,
    })
    .returning();

  // 5. Mark the order as completed.
  await db
    .update(labOrders)
    .set({
      status: "completed",
      completedAt: new Date(),
      completedByLabId: user.id,
      updatedAt: new Date(),
    })
    .where(eq(labOrders.id, order.id));

  return NextResponse.json({ ok: true, document: doc }, { status: 201 });
}
