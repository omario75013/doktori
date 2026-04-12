import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, conversations, messages } from "@doktori/db";
import { eq, and } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "doctor") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await req.json();
  const { patientId, content } = body;

  if (!patientId || typeof patientId !== "string") {
    return NextResponse.json({ error: "patientId requis" }, { status: 400 });
  }
  if (!content || typeof content !== "string" || content.trim().length === 0) {
    return NextResponse.json({ error: "Message vide" }, { status: 400 });
  }
  if (content.length > 5000) {
    return NextResponse.json({ error: "Message trop long (max 5000 caractères)" }, { status: 400 });
  }

  const trimmedContent = content.trim();
  const now = new Date();

  const result = await db.transaction(async (tx) => {
    let [conv] = await tx
      .select()
      .from(conversations)
      .where(and(eq(conversations.doctorId, session.user.id), eq(conversations.patientId, patientId)))
      .limit(1);

    if (!conv) {
      [conv] = await tx
        .insert(conversations)
        .values({ doctorId: session.user.id, patientId, lastMessageAt: now })
        .returning();
    } else {
      await tx
        .update(conversations)
        .set({ lastMessageAt: now })
        .where(eq(conversations.id, conv.id));
    }

    const [msg] = await tx
      .insert(messages)
      .values({
        conversationId: conv.id,
        senderType: "doctor",
        senderId: session.user.id,
        content: trimmedContent,
        createdAt: now,
      })
      .returning();

    return { conversation: conv, message: msg };
  });

  return NextResponse.json(result, { status: 201 });
}
