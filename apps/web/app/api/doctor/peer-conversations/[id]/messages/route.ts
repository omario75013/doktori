import { NextResponse, NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/require-auth";
import { db, doctorConversations, doctorMessages, doctorNotifications } from "@doktori/db";
import { and, eq, or, asc, isNull, ne } from "drizzle-orm";

async function authorizeConversation(conversationId: string, userId: string) {
  const [conv] = await db
    .select()
    .from(doctorConversations)
    .where(
      and(
        eq(doctorConversations.id, conversationId),
        or(
          eq(doctorConversations.doctorAId, userId),
          eq(doctorConversations.doctorBId, userId)
        )
      )
    )
    .limit(1);
  return conv ?? null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth(req);
  if (!user || user.role !== "doctor") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const { id } = await params;
  const conv = await authorizeConversation(id, user.id);
  if (!conv) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const rows = await db
    .select()
    .from(doctorMessages)
    .where(eq(doctorMessages.conversationId, id))
    .orderBy(asc(doctorMessages.createdAt));

  await db
    .update(doctorMessages)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(doctorMessages.conversationId, id),
        ne(doctorMessages.senderId, user.id),
        isNull(doctorMessages.readAt)
      )
    );

  return NextResponse.json(rows);
}

const postSchema = z.object({ body: z.string().trim().min(1).max(4000) });

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth(req);
  if (!user || user.role !== "doctor") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const { id } = await params;
  const conv = await authorizeConversation(id, user.id);
  if (!conv) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Message invalide" }, { status: 400 });
  }

  const [msg] = await db
    .insert(doctorMessages)
    .values({
      conversationId: id,
      senderId: user.id,
      body: parsed.data.body,
    })
    .returning();

  await db
    .update(doctorConversations)
    .set({ lastMessageAt: new Date() })
    .where(eq(doctorConversations.id, id));

  const peerId = conv.doctorAId === user.id ? conv.doctorBId : conv.doctorAId;
  await db.insert(doctorNotifications).values({
    doctorId: peerId,
    type: "peer_message",
    payload: { conversationId: id, senderId: user.id },
  });

  return NextResponse.json({ ok: true, message: msg }, { status: 201 });
}
