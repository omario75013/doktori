import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/require-auth";
import { db, doctorMessages, doctorConversations } from "@doktori/db";
import { and, eq, isNull, or } from "drizzle-orm";
import { broadcastPeerMessage } from "@/lib/peer-message-broadcast";

async function loadOwnedMessage(
  conversationId: string,
  messageId: string,
  userId: string,
) {
  // Authorize: conversation must include the caller AND the message must
  // be theirs to edit/delete. One query joins the two checks.
  const [row] = await db
    .select({
      id: doctorMessages.id,
      conversationId: doctorMessages.conversationId,
      senderId: doctorMessages.senderId,
      body: doctorMessages.body,
      imageUrl: doctorMessages.imageUrl,
      deletedAt: doctorMessages.deletedAt,
    })
    .from(doctorMessages)
    .innerJoin(doctorConversations, eq(doctorConversations.id, doctorMessages.conversationId))
    .where(
      and(
        eq(doctorMessages.id, messageId),
        eq(doctorMessages.conversationId, conversationId),
        eq(doctorMessages.senderId, userId),
        or(
          eq(doctorConversations.doctorAId, userId),
          eq(doctorConversations.doctorBId, userId),
        ),
      ),
    )
    .limit(1);
  return row ?? null;
}

const patchSchema = z.object({ body: z.string().trim().min(1).max(4000) });

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> },
) {
  const user = await requireAuth(req);
  if (!user || user.role !== "doctor") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const { id, messageId } = await params;

  const owned = await loadOwnedMessage(id, messageId, user.id);
  if (!owned) {
    return NextResponse.json({ error: "Message introuvable" }, { status: 404 });
  }
  if (owned.deletedAt) {
    return NextResponse.json({ error: "Message supprimé" }, { status: 410 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }

  const [updated] = await db
    .update(doctorMessages)
    .set({ body: parsed.data.body, editedAt: new Date() })
    .where(eq(doctorMessages.id, messageId))
    .returning();

  void broadcastPeerMessage(id, "message:updated", updated);

  return NextResponse.json({ ok: true, message: updated });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> },
) {
  const user = await requireAuth(req);
  if (!user || user.role !== "doctor") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const { id, messageId } = await params;

  const owned = await loadOwnedMessage(id, messageId, user.id);
  if (!owned) {
    return NextResponse.json({ error: "Message introuvable" }, { status: 404 });
  }

  // Soft-delete keeps the row for thread continuity; UI renders a tombstone.
  const [updated] = await db
    .update(doctorMessages)
    .set({ deletedAt: new Date(), body: "", imageUrl: null })
    .where(
      and(eq(doctorMessages.id, messageId), isNull(doctorMessages.deletedAt)),
    )
    .returning();

  void broadcastPeerMessage(id, "message:deleted", updated ?? { id: messageId });

  return NextResponse.json({ ok: true });
}
