import { NextResponse, NextRequest } from "next/server";
import { db, callSessions } from "@doktori/db";
import { eq } from "drizzle-orm";
import { resolveCaller } from "@/lib/call-auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const me = await resolveCaller(req);
  if ("err" in me) return me.err;

  const { id } = await params;
  const [sess] = await db.select().from(callSessions).where(eq(callSessions.id, id)).limit(1);
  if (!sess) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const isMember =
    (sess.callerType === me.type && sess.callerId === me.id) ||
    (sess.calleeType === me.type && sess.calleeId === me.id);
  if (!isMember) return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });

  return NextResponse.json({ id: sess.id, status: sess.status });
}
