import { NextResponse, NextRequest } from "next/server";
import { z } from "zod";
import { db, staffConversations, staffMessages, secretaryNotifications } from "@doktori/db";
import { and, eq, asc, isNull, sql } from "drizzle-orm";
import { requireStaff } from "@/lib/staff-context";
import { sendPush } from "@/lib/push-fcm";

async function authorize(convId: string, ctx: { doctorId: string; selfType: "doctor" | "secretary"; selfId: string }) {
  const [conv] = await db
    .select()
    .from(staffConversations)
    .where(eq(staffConversations.id, convId))
    .limit(1);
  if (!conv) return null;
  if (conv.doctorId !== ctx.doctorId) return null;
  const isMemberA = conv.memberAType === ctx.selfType && conv.memberAId === ctx.selfId;
  const isMemberB = conv.memberBType === ctx.selfType && conv.memberBId === ctx.selfId;
  if (!isMemberA && !isMemberB) return null;
  return conv;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireStaff(_req);
  if ("err" in ctx) return ctx.err;
  const { id } = await params;
  const conv = await authorize(id, ctx);
  if (!conv) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const rows = await db
    .select()
    .from(staffMessages)
    .where(eq(staffMessages.conversationId, id))
    .orderBy(asc(staffMessages.createdAt));

  // Mark peer messages as read (using raw SQL for the "sender is not me" tuple)
  await db.execute(sql`
    UPDATE staff_messages
    SET read_at = now()
    WHERE conversation_id = ${id}
      AND read_at IS NULL
      AND NOT (sender_type = ${ctx.selfType} AND sender_id = ${ctx.selfId})
  `);

  return NextResponse.json(rows);
}

const postSchema = z.object({ body: z.string().trim().min(1).max(4000) });

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireStaff(req);
  if ("err" in ctx) return ctx.err;
  const { id } = await params;
  const conv = await authorize(id, ctx);
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
    .insert(staffMessages)
    .values({
      conversationId: id,
      senderType: ctx.selfType,
      senderId: ctx.selfId,
      body: parsed.data.body,
    })
    .returning();

  await db
    .update(staffConversations)
    .set({ lastMessageAt: new Date() })
    .where(eq(staffConversations.id, id));

  // Notify peer if they're a secretary
  const peerIsA = !(conv.memberAType === ctx.selfType && conv.memberAId === ctx.selfId);
  const peerType = peerIsA ? conv.memberAType : conv.memberBType;
  const peerId = peerIsA ? conv.memberAId : conv.memberBId;
  if (peerType === "secretary") {
    await db.insert(secretaryNotifications).values({
      secretaryId: peerId,
      type: "message",
      title: "Nouveau message",
      body: parsed.data.body.slice(0, 200),
      payload: { conversationId: id },
    });
  }

  // Push notification to peer (fire-and-forget)
  sendPush(peerType, peerId, {
    title: "Nouveau message",
    body: parsed.data.body.slice(0, 120),
    sound: "default",
    data: { type: "message", conversationId: id, kind: "team", peerName: "" },
  }).catch(console.error);

  return NextResponse.json({ ok: true, message: msg }, { status: 201 });
}
