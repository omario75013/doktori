import { NextResponse, NextRequest } from "next/server";
import { z } from "zod";
import { db, callSessions, doctors, secretaries } from "@doktori/db";
import { eq } from "drizzle-orm";
import { resolveCaller } from "@/lib/call-auth";
import { sendPush } from "@/lib/push-fcm";

const createSchema = z.object({
  calleeType: z.enum(["doctor", "secretary"]),
  calleeId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  const caller = await resolveCaller(req);
  if ("err" in caller) return caller.err;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
  }
  if (parsed.data.calleeType === caller.type && parsed.data.calleeId === caller.id) {
    return NextResponse.json({ error: "Impossible" }, { status: 400 });
  }

  const [session] = await db
    .insert(callSessions)
    .values({
      callerType: caller.type,
      callerId: caller.id,
      calleeType: parsed.data.calleeType,
      calleeId: parsed.data.calleeId,
      status: "ringing",
    })
    .returning();

  // Resolve caller display name for the push notification
  let callerName = "Appel entrant";
  try {
    if (caller.type === "doctor") {
      const [d] = await db.select({ name: doctors.name }).from(doctors).where(eq(doctors.id, caller.id)).limit(1);
      if (d) callerName = d.name;
    } else if (caller.type === "secretary") {
      const [s] = await db.select({ name: secretaries.name }).from(secretaries).where(eq(secretaries.id, caller.id)).limit(1);
      if (s) callerName = s.name;
    }
  } catch { /* non-blocking */ }

  // Notify callee of incoming call (fire-and-forget)
  sendPush(parsed.data.calleeType, parsed.data.calleeId, {
    title: "Appel entrant",
    body: `${callerName} vous appelle`,
    sound: "default",
    data: {
      type: "call",
      sessionId: session.id,
      callerName,
      callerType: caller.type,
      callerId: caller.id,
    },
  }).catch(console.error);

  return NextResponse.json({ ok: true, session }, { status: 201 });
}
