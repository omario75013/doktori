import { NextRequest, NextResponse } from "next/server";
import { db, labConversations, labMessages } from "@doktori/db";
import { eq, and } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { requireDoctorOrSecretary } from "@/lib/secretary-auth";

// POST /api/medecin/lab-conversations/[id]/messages
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await requireDoctorOrSecretary();
  if (actor instanceof NextResponse) return actor;
  const { doctorId } = actor;

  const { id } = await params;

  const [conversation] = await db
    .select()
    .from(labConversations)
    .where(and(eq(labConversations.id, id), eq(labConversations.counterpartDoctorId, doctorId)))
    .limit(1);

  if (!conversation) {
    return NextResponse.json({ error: "Conversation introuvable" }, { status: 404 });
  }

  const body = await req.json() as {
    body?: string;
    attachment?: { url: string; name: string; mime: string; size: number };
  };

  if (!body.body && !body.attachment) {
    return NextResponse.json({ error: "body ou attachment requis" }, { status: 400 });
  }

  const preview = (body.body ?? body.attachment?.name ?? "").slice(0, 120);

  const [msg] = await db
    .insert(labMessages)
    .values({
      conversationId: id,
      senderType: "doctor",
      senderId: doctorId,
      body: body.body ?? null,
      attachmentUrl: body.attachment?.url ?? null,
      attachmentName: body.attachment?.name ?? null,
      attachmentMime: body.attachment?.mime ?? null,
      attachmentSize: body.attachment?.size ?? null,
    })
    .returning();

  // Bump lab's unread count
  await db
    .update(labConversations)
    .set({
      lastMessageAt: new Date(),
      lastMessagePreview: preview,
      unreadCountLab: sql`${labConversations.unreadCountLab} + 1`,
    })
    .where(eq(labConversations.id, id));

  return NextResponse.json({ message: msg }, { status: 201 });
}
