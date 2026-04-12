import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@doktori/db";
import { sql } from "drizzle-orm";
import { verifySosToken } from "@/lib/sos-hmac";
import { finalizeSosSession } from "@/lib/sos-lifecycle";

export async function POST(req: Request) {
  const body = await req.json();
  const { sessionId, cancelledBy, cancelReason, token } = body;

  if (!sessionId || !cancelledBy) {
    return NextResponse.json({ error: "sessionId et cancelledBy requis" }, { status: 400 });
  }

  if (cancelledBy !== "doctor" && cancelledBy !== "patient") {
    return NextResponse.json({ error: "cancelledBy doit être 'doctor' ou 'patient'" }, { status: 400 });
  }

  // Auth: doctor uses session, patient uses HMAC token
  if (cancelledBy === "doctor") {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
  } else if (!token || !verifySosToken(sessionId, token)) {
    return NextResponse.json({ error: "Token invalide" }, { status: 401 });
  }

  // Single UPDATE for both cases — doctor branch adds doctor_id guard
  const doctorGuard = cancelledBy === "doctor"
    ? sql`AND doctor_id = ${(await auth())!.user!.id}`
    : sql``;

  const result = await db.execute(sql`
    UPDATE sos_sessions
    SET status = 'cancelled', cancelled_at = NOW(),
        cancel_reason = ${cancelReason || null},
        cancelled_by = ${cancelledBy},
        resolution = ${"cancelled_by_" + cancelledBy}
    WHERE id = ${sessionId}
      AND status IN ('pending', 'accepted')
      ${doctorGuard}
    RETURNING id
  `);

  const updated = (result as unknown as Array<{ id: string }>)[0];
  if (!updated) {
    return NextResponse.json({ error: "Session introuvable ou déjà terminée" }, { status: 409 });
  }

  // Parallel proxy cleanup + broadcast (fire-and-forget)
  finalizeSosSession(sessionId, "cancelled");

  return NextResponse.json({ success: true });
}
