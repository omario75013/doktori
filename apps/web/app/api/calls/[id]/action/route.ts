import { NextResponse, NextRequest } from "next/server";
import { z } from "zod";
import { db, callSessions } from "@doktori/db";
import { and, eq } from "drizzle-orm";
import { resolveCaller } from "@/lib/call-auth";

const bodySchema = z.object({ action: z.enum(["accept", "reject", "end"]) });

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const me = await resolveCaller(req);
  if ("err" in me) return me.err;

  const { id } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "action requis" }, { status: 400 });
  }

  const [sess] = await db
    .select()
    .from(callSessions)
    .where(eq(callSessions.id, id))
    .limit(1);
  if (!sess) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const isCaller = sess.callerType === me.type && sess.callerId === me.id;
  const isCallee = sess.calleeType === me.type && sess.calleeId === me.id;
  if (!isCaller && !isCallee) {
    return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
  }

  if (parsed.data.action === "accept") {
    if (!isCallee) return NextResponse.json({ error: "Seul le destinataire peut accepter" }, { status: 403 });
    await db
      .update(callSessions)
      .set({ status: "active", answeredAt: new Date() })
      .where(eq(callSessions.id, id));
  } else if (parsed.data.action === "reject") {
    await db
      .update(callSessions)
      .set({ status: "declined", endedAt: new Date() })
      .where(eq(callSessions.id, id));
  } else if (parsed.data.action === "end") {
    await db
      .update(callSessions)
      .set({ status: "ended", endedAt: new Date() })
      .where(eq(callSessions.id, id));
  }
  return NextResponse.json({ ok: true });
}
