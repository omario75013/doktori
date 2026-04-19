import { NextResponse } from "next/server";
import { requireDoctor } from "@/lib/doctor-auth";
import { db } from "@doktori/db";
import { sql } from "drizzle-orm";
import { verifySosToken } from "@/lib/sos-hmac";
import { finalizeSosSession } from "@/lib/sos-lifecycle";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { sessionId, cancelledBy, cancelReason, token } = body;

    if (!sessionId || !cancelledBy) {
      return NextResponse.json({ error: "sessionId et cancelledBy requis" }, { status: 400 });
    }

    if (cancelledBy !== "doctor" && cancelledBy !== "patient") {
      return NextResponse.json({ error: "cancelledBy doit être 'doctor' ou 'patient'" }, { status: 400 });
    }

    let doctorId: string | null = null;

    if (cancelledBy === "doctor") {
      const doctor = await requireDoctor();
      if (doctor instanceof NextResponse) return doctor;
      doctorId = doctor.id;
    } else if (!token || !verifySosToken(sessionId, token)) {
      return NextResponse.json({ error: "Token invalide" }, { status: 401 });
    }

    const doctorGuard = doctorId ? sql`AND doctor_id = ${doctorId}` : sql``;

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

    finalizeSosSession(sessionId, "cancelled");

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[POST /api//sos/cancel]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
