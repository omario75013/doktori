import { NextRequest, NextResponse } from "next/server";
import { db, labConversations, labMessages } from "@doktori/db";
import { eq, and } from "drizzle-orm";
import { requireLabContext } from "@/lib/lab-auth";
import { sql } from "drizzle-orm";

// POST /api/laboratoire/conversations/[id]/messages — send a message
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireLabContext();
  if (ctx instanceof NextResponse) return ctx;
  const { labId } = ctx;

  const { id } = await params;

  const [conversation] = await db
    .select()
    .from(labConversations)
    .where(and(eq(labConversations.id, id), eq(labConversations.labId, labId)))
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
      senderType: "lab",
      senderId: labId,
      body: body.body ?? null,
      attachmentUrl: body.attachment?.url ?? null,
      attachmentName: body.attachment?.name ?? null,
      attachmentMime: body.attachment?.mime ?? null,
      attachmentSize: body.attachment?.size ?? null,
    })
    .returning();

  // Update conversation metadata: bump counterpart unread, update preview
  await db
    .update(labConversations)
    .set({
      lastMessageAt: new Date(),
      lastMessagePreview: preview,
      unreadCountCounterpart: sql`${labConversations.unreadCountCounterpart} + 1`,
    })
    .where(eq(labConversations.id, id));

  return NextResponse.json({ message: msg }, { status: 201 });
}
