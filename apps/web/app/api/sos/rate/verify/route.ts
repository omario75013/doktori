import { NextResponse } from "next/server";
import { db } from "@doktori/db";
import { sql } from "drizzle-orm";
import { verifySosToken } from "@/lib/sos-hmac";

/**
 * GET /api/sos/rate/verify?sessionId=X&sig=Y
 *
 * Lightweight endpoint called on page load to verify the HMAC signature
 * and check that the session is valid before showing the review form.
 * This prevents users from viewing the form with a fake/expired token.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");
  const sig = searchParams.get("sig");

  if (!sessionId || !sig) {
    return NextResponse.json(
      { valid: false, error: "sessionId et sig requis" },
      { status: 400 }
    );
  }

  if (!verifySosToken(sessionId, sig)) {
    return NextResponse.json(
      { valid: false, error: "Token invalide ou lien expiré" },
      { status: 401 }
    );
  }

  // Verify session exists and is completed
  const sessionResult = await db.execute(sql`
    SELECT s.id, s.status, d.name AS doctor_name
    FROM sos_sessions s
    LEFT JOIN doctors d ON d.id = s.doctor_id
    WHERE s.id = ${sessionId} AND s.status = 'completed'
    LIMIT 1
  `);

  const sosSession = (sessionResult as unknown as Array<{
    id: string;
    status: string;
    doctor_name: string | null;
  }>)[0];

  if (!sosSession) {
    return NextResponse.json(
      { valid: false, error: "Session introuvable ou non terminée" },
      { status: 404 }
    );
  }

  // Check if a review already exists for this session
  const existingResult = await db.execute(sql`
    SELECT id FROM reviews WHERE sos_session_id = ${sessionId} LIMIT 1
  `);
  const existing = (existingResult as unknown as Array<{ id: string }>)[0];

  if (existing) {
    return NextResponse.json(
      { valid: false, error: "Avis déjà soumis pour cette session" },
      { status: 409 }
    );
  }

  return NextResponse.json({
    valid: true,
    doctorName: sosSession.doctor_name ?? undefined,
  });
}
