import { NextRequest, NextResponse } from "next/server";
import { db, labConversations, labMessages } from "@doktori/db";
import { eq, and, asc } from "drizzle-orm";
import { requireLabContext } from "@/lib/lab-auth";

// GET /api/laboratoire/conversations/[id] — conversation + messages
export async function GET(
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

  const messages = await db
    .select()
    .from(labMessages)
    .where(eq(labMessages.conversationId, id))
    .orderBy(asc(labMessages.createdAt))
    .limit(100);

  return NextResponse.json({ conversation, messages });
}
