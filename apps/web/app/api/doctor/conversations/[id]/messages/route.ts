import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { db, conversations, messages } from "@doktori/db";
import { eq, and, lt, desc } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth(req);
  if (!user || user.role !== "doctor") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id: conversationId } = await params;

  // Verify doctor owns this conversation
  const [conv] = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(and(eq(conversations.id, conversationId), eq(conversations.doctorId, user.id)))
    .limit(1);

  if (!conv) return NextResponse.json({ error: "Conversation introuvable" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const before = searchParams.get("before");

  const conditions = [eq(messages.conversationId, conversationId)];
  if (before) {
    conditions.push(lt(messages.createdAt, new Date(before)));
  }

  const rows = await db
    .select()
    .from(messages)
    .where(and(...conditions))
    .orderBy(desc(messages.createdAt))
    .limit(50);

  return NextResponse.json(rows.reverse());
}
