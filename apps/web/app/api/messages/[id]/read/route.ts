import { NextRequest, NextResponse } from "next/server";
import { db, messages, conversations } from "@doktori/db";
import { eq, and } from "drizzle-orm";
import { getPatientFromRequest } from "@/lib/patient-auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const patient = getPatientFromRequest(req);
    if (!patient) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const { id: messageId } = await params;

    // Fetch message with its conversation
    const [msg] = await db
      .select({
        id: messages.id,
        senderType: messages.senderType,
        senderId: messages.senderId,
        readAt: messages.readAt,
        conversationId: messages.conversationId,
      })
      .from(messages)
      .where(eq(messages.id, messageId))
      .limit(1);

    if (!msg) return NextResponse.json({ error: "Message introuvable" }, { status: 404 });

    // Verify the conversation belongs to this patient
    const [conv] = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(and(eq(conversations.id, msg.conversationId), eq(conversations.patientId, patient.id)))
      .limit(1);

    if (!conv) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

    // Only the recipient (not the sender) can mark as read
    // For patient: they can only mark doctor messages as read
    if (msg.senderType === "patient") {
      return NextResponse.json({ error: "Seul le destinataire peut marquer comme lu" }, { status: 403 });
    }

    if (msg.readAt) {
      return NextResponse.json({ id: msg.id, readAt: msg.readAt });
    }

    const [updated] = await db
      .update(messages)
      .set({ readAt: new Date() })
      .where(eq(messages.id, messageId))
      .returning({ id: messages.id, readAt: messages.readAt });

    return NextResponse.json(updated);
  } catch (e) {
    console.error("[PATCH /api//messages/[id]/read]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
