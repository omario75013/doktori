import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@doktori/db";
import { sql } from "drizzle-orm";
import { broadcastSos } from "@/lib/sos-broadcast";
import { closePhoneProxy } from "@/lib/phone-proxy";
import { verifySosToken } from "@/lib/sos-hmac";

export async function POST(req: Request) {
  const body = await req.json();
  const { sessionId, cancelledBy, cancelReason, token } = body;

  if (!sessionId || !cancelledBy) {
    return NextResponse.json({ error: "sessionId et cancelledBy requis" }, { status: 400 });
  }

  if (cancelledBy !== "doctor" && cancelledBy !== "patient") {
    return NextResponse.json({ error: "cancelledBy doit être 'doctor' ou 'patient'" }, { status: 400 });
  }

  if (cancelledBy === "doctor") {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Atomic update — only succeeds if session is pending or accepted and belongs to this doctor
    const result = await db.execute(sql`
      UPDATE sos_sessions
      SET status = 'cancelled',
          cancelled_at = NOW(),
          cancel_reason = ${cancelReason || null},
          cancelled_by = 'doctor',
          resolution = 'cancelled_by_doctor'
      WHERE id = ${sessionId}
        AND doctor_id = ${session.user.id}
        AND status IN ('pending', 'accepted')
      RETURNING id, status
    `);

    const updated = (result as unknown as Array<{ id: string; status: string }>)[0];
    if (!updated) {
      return NextResponse.json({ error: "Session introuvable ou déjà terminée" }, { status: 409 });
    }
  } else {
    // Patient cancel — verify HMAC token
    if (!token || !verifySosToken(sessionId, token)) {
      return NextResponse.json({ error: "Token invalide" }, { status: 401 });
    }

    const result = await db.execute(sql`
      UPDATE sos_sessions
      SET status = 'cancelled',
          cancelled_at = NOW(),
          cancel_reason = ${cancelReason || null},
          cancelled_by = 'patient',
          resolution = 'cancelled_by_patient'
      WHERE id = ${sessionId}
        AND status IN ('pending', 'accepted')
      RETURNING id, status
    `);

    const updated = (result as unknown as Array<{ id: string; status: string }>)[0];
    if (!updated) {
      return NextResponse.json({ error: "Session introuvable ou déjà terminée" }, { status: 409 });
    }
  }

  // Close phone proxy (best effort)
  try {
    await closePhoneProxy(sessionId);
  } catch (e) {
    console.error("[SOS-CANCEL] closePhoneProxy failed:", e);
  }

  // Broadcast cancellation
  await broadcastSos(`session:${sessionId}`, "session-update", {
    status: "cancelled",
  });

  return NextResponse.json({ success: true });
}
