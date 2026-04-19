import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, messages, conversations } from "@doktori/db";
import { eq, and } from "drizzle-orm";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "doctor") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { id: messageId } = await params;

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

    // Verify conversation belongs to this doctor
    const [conv] = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(and(eq(conversations.id, msg.conversationId), eq(conversations.doctorId, session.user.id)))
      .limit(1);

    if (!conv) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

    // Only recipient (doctor) can mark patient messages as read
    if (msg.senderType === "doctor") {
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
    console.error("[PATCH /api//doctor/messages/[id]/read]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
