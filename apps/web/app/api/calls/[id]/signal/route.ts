import { NextResponse, NextRequest } from "next/server";
import { z } from "zod";
import { db, callSessions, callSignals } from "@doktori/db";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { resolveCaller } from "@/lib/call-auth";

async function authorizeSession(sessionId: string, me: { type: string; id: string }) {
  const [s] = await db.select().from(callSessions).where(eq(callSessions.id, sessionId)).limit(1);
  if (!s) return null;
  const ok =
    (s.callerType === me.type && s.callerId === me.id) ||
    (s.calleeType === me.type && s.calleeId === me.id);
  return ok ? s : null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const me = await resolveCaller(req);
  if ("err" in me) return me.err;
  const { id } = await params;
  const sess = await authorizeSession(id, me);
  if (!sess) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  // Return unconsumed signals not sent by me, then mark consumed
  const rows = await db
    .select()
    .from(callSignals)
    .where(
      and(
        eq(callSignals.sessionId, id),
        isNull(callSignals.consumedAt),
        sql`NOT (${callSignals.senderType} = ${me.type} AND ${callSignals.senderId} = ${me.id})`
      )
    );

  if (rows.length > 0) {
    await db
      .update(callSignals)
      .set({ consumedAt: new Date() })
      .where(
        and(
          eq(callSignals.sessionId, id),
          isNull(callSignals.consumedAt),
          sql`NOT (${callSignals.senderType} = ${me.type} AND ${callSignals.senderId} = ${me.id})`
        )
      );
  }

  return NextResponse.json(rows);
}

const postSchema = z.object({
  kind: z.enum(["offer", "answer", "ice"]),
  payload: z.record(z.string(), z.any()).or(z.any()),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const me = await resolveCaller(req);
  if ("err" in me) return me.err;
  const { id } = await params;
  const sess = await authorizeSession(id, me);
  if (!sess) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Signal invalide" }, { status: 400 });
  }

  await db.insert(callSignals).values({
    sessionId: id,
    senderType: me.type,
    senderId: me.id,
    kind: parsed.data.kind,
    payload: parsed.data.payload,
  });
  return NextResponse.json({ ok: true });
}
