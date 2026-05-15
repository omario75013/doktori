import { NextRequest, NextResponse } from "next/server";
import { db, labs, labOrders, labConversations, labMessages, patientDocuments } from "@doktori/db";
import { eq, and, or } from "drizzle-orm";
import { requireLabContext } from "@/lib/lab-auth";
import { sql } from "drizzle-orm";

// POST /api/laboratoire/send-to-doctor
// Creates patient_documents row shared with doctor.
// Fail-soft: also creates a lab_message in the lab↔doctor conversation.
export async function POST(req: NextRequest) {
  const ctx = await requireLabContext();
  if (ctx instanceof NextResponse) return ctx;
  const { labId } = ctx;

  const body = await req.json() as {
    doctorId?: string | null;
    patientId: string;
    orderId?: string | null;
    file: { url: string; name: string; mime: string; size: number };
    note?: string;
  };

  // Resolve doctorId: use provided or look up from order
  let doctorId = body.doctorId ?? null;
  if (!doctorId && body.orderId) {
    const [ord] = await db
      .select({ doctorId: labOrders.doctorId })
      .from(labOrders)
      .where(eq(labOrders.id, body.orderId))
      .limit(1);
    doctorId = ord?.doctorId ?? null;
  }

  if (!doctorId) {
    return NextResponse.json({ error: "doctorId introuvable" }, { status: 400 });
  }
  if (!body.patientId || !body.file?.url) {
    return NextResponse.json({ error: "patientId + file requis" }, { status: 400 });
  }

  // Lab kind for category
  const [labRow] = await db
    .select({ kind: labs.kind })
    .from(labs)
    .where(eq(labs.id, labId))
    .limit(1);
  const category = labRow?.kind === "radiology" ? "imagerie" : "analyse";

  // 1. Create patient_documents row
  const [doc] = await db
    .insert(patientDocuments)
    .values({
      patientId: body.patientId,
      uploadedBy: "lab",
      uploadedByLabId: labId,
      sharedWithDoctorIds: [doctorId],
      fileUrl: body.file.url,
      fileName: body.file.name.slice(0, 255),
      mimeType: body.file.mime,
      sizeBytes: body.file.size,
      category,
      note: body.note ?? null,
    })
    .returning({ id: patientDocuments.id });

  // 2. Fail-soft: find or create conversation and insert message
  try {
    let conversationId: string | null = null;

    const [existing] = await db
      .select({ id: labConversations.id })
      .from(labConversations)
      .where(
        and(
          eq(labConversations.labId, labId),
          eq(labConversations.counterpartDoctorId, doctorId)
        )
      )
      .limit(1);

    if (existing) {
      conversationId = existing.id;
    } else {
      const [created] = await db
        .insert(labConversations)
        .values({
          labId,
          counterpartDoctorId: doctorId,
        })
        .returning({ id: labConversations.id });
      conversationId = created.id;
    }

    if (conversationId) {
      await db.insert(labMessages).values({
        conversationId,
        senderType: "lab",
        senderId: labId,
        body: body.note ?? null,
        attachmentUrl: body.file.url,
        attachmentName: body.file.name,
        attachmentMime: body.file.mime,
        attachmentSize: body.file.size,
      });

      await db
        .update(labConversations)
        .set({
          lastMessageAt: new Date(),
          lastMessagePreview: body.file.name,
          unreadCountCounterpart: sql`${labConversations.unreadCountCounterpart} + 1`,
        })
        .where(eq(labConversations.id, conversationId));
    }
  } catch {
    // Fail-soft — document was already created successfully
  }

  return NextResponse.json({ ok: true, documentId: doc?.id }, { status: 201 });
}
