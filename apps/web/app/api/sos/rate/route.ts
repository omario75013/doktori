import { NextResponse } from "next/server";
import { db, reviews } from "@doktori/db";
import { sql } from "drizzle-orm";
import { verifySosToken } from "@/lib/sos-hmac";
import { recomputeDoctorRating } from "@/lib/doctor-rating";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { sessionId, sig, rating, comment } = body;

    if (!sessionId || !sig) {
      return NextResponse.json({ error: "sessionId et sig requis" }, { status: 400 });
    }

    if (!verifySosToken(sessionId, sig)) {
      return NextResponse.json({ error: "Token invalide" }, { status: 401 });
    }

    if (typeof rating !== "number" || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "La note doit être entre 1 et 5" }, { status: 400 });
    }

    if (comment && comment.length > 1000) {
      return NextResponse.json({ error: "Le commentaire ne peut pas dépasser 1000 caractères" }, { status: 400 });
    }

    // Verify session is completed
    const sessionResult = await db.execute(sql`
      SELECT id, doctor_id, patient_id, status
      FROM sos_sessions
      WHERE id = ${sessionId} AND status = 'completed'
      LIMIT 1
    `);

    const sosSession = (sessionResult as unknown as Array<{
      id: string;
      doctor_id: string;
      patient_id: string;
      status: string;
    }>)[0];

    if (!sosSession) {
      return NextResponse.json({ error: "Session introuvable ou non terminée" }, { status: 404 });
    }

    // Check no existing review for this sos_session_id
    const existingResult = await db.execute(sql`
      SELECT id FROM reviews WHERE sos_session_id = ${sessionId} LIMIT 1
    `);
    const existing = (existingResult as unknown as Array<{ id: string }>)[0];

    if (existing) {
      return NextResponse.json({ error: "Avis déjà soumis pour cette session" }, { status: 409 });
    }

    await db.insert(reviews).values({
      doctorId: sosSession.doctor_id,
      patientId: sosSession.patient_id,
      sosSessionId: sessionId,
      // appointmentId is intentionally omitted (nullable after migration)
      rating,
      comment: comment || null,
      status: "published",
      verified: true,
    });

    // Fire-and-forget: recompute doctor's average rating without blocking the response
    recomputeDoctorRating(sosSession.doctor_id).catch(console.error);

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[POST /api//sos/rate]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
