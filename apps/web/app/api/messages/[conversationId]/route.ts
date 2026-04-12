import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, conversations, messages } from "@doktori/db";
import { eq, and, lt, desc, isNull } from "drizzle-orm";
import { getPatientFromRequest } from "@/lib/patient-auth";

type Caller = { role: "doctor" | "patient"; id: string };

async function resolveCaller(req: NextRequest): Promise<Caller | null> {
  const patient = getPatientFromRequest(req);
  if (patient) return { role: "patient", id: patient.id };

  const session = await auth();
  if (session?.user?.id && (session.user as any).role === "doctor") {
    return { role: "doctor", id: session.user.id };
  }

  return null;
}

/**
 * Verify the caller is a participant of the conversation.
 * Returns the conversation row or null.
 */
async function getConversationForCaller(conversationId: string, caller: Caller) {
  const condition =
    caller.role === "doctor"
      ? and(eq(conversations.id, conversationId), eq(conversations.doctorId, caller.id))
      : and(eq(conversations.id, conversationId), eq(conversations.patientId, caller.id));

  const [conv] = await db.select().from(conversations).where(condition).limit(1);
  return conv ?? null;
}

/**
 * GET /api/messages/[conversationId]
 * List messages (paginated, newest first, then reversed for display).
 * Marks unread messages from the other party as read.
 * Query params: before=<ISO date> for cursor pagination.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const caller = await resolveCaller(req);
  if (!caller) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { conversationId } = await params;
  const conv = await getConversationForCaller(conversationId, caller);
  if (!conv) return NextResponse.json({ error: "Conversation introuvable" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const before = searchParams.get("before");

  const conditions = [eq(messages.conversationId, conversationId)];
  if (before) conditions.push(lt(messages.createdAt, new Date(before)));

  const rows = await db
    .select()
    .from(messages)
    .where(and(...conditions))
    .orderBy(desc(messages.createdAt))
    .limit(50);

  // Mark messages sent by the other party (unread) as read
  const otherSenderType = caller.role === "doctor" ? "patient" : "doctor";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const unreadIds = (rows as any[])
    .filter((m) => m.senderType === otherSenderType && !m.readAt)
    .map((m) => m.id as string);

  if (unreadIds.length > 0) {
    const now = new Date();
    // Update in batches to avoid large IN clauses
    for (const id of unreadIds) {
      await db
        .update(messages)
        .set({ readAt: now })
        .where(and(eq(messages.id, id), isNull(messages.readAt)));
    }
  }

  return NextResponse.json(rows.reverse());
}

/**
 * POST /api/messages/[conversationId]
 * Body: { content }
 * Send a message and update conversation lastMessageAt.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const caller = await resolveCaller(req);
  if (!caller) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { conversationId } = await params;
  const conv = await getConversationForCaller(conversationId, caller);
  if (!conv) return NextResponse.json({ error: "Conversation introuvable" }, { status: 404 });

  const body = await req.json();
  const { content } = body;

  if (!content || typeof content !== "string" || content.trim().length === 0) {
    return NextResponse.json({ error: "Message vide" }, { status: 400 });
  }
  if (content.length > 5000) {
    return NextResponse.json({ error: "Message trop long (max 5000 caractères)" }, { status: 400 });
  }

  const now = new Date();
  const trimmedContent = content.trim();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await db.transaction(async (tx: any) => {
    await tx
      .update(conversations)
      .set({ lastMessageAt: now })
      .where(eq(conversations.id, conversationId));

    const [msg] = await tx
      .insert(messages)
      .values({
        conversationId,
        senderType: caller.role,
        senderId: caller.id,
        content: trimmedContent,
        createdAt: now,
      })
      .returning();

    return msg;
  });

  return NextResponse.json({ message: result }, { status: 201 });
}
