import { NextRequest, NextResponse } from "next/server";
import { db, patientSessions } from "@doktori/db";
import { eq, isNull, and, ne } from "drizzle-orm";
import { getPatientFromRequest } from "@/lib/patient-auth";

// GET /api/me/sessions — list active sessions, mark current via Authorization token
export async function GET(req: NextRequest) {
  const session = getPatientFromRequest(req);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  // Extract the raw token to identify the current session
  const authHeader = req.headers.get("authorization") ?? "";
  const currentToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  const sessions = await db
    .select()
    .from(patientSessions)
    .where(
      and(
        eq(patientSessions.patientId, session.id),
        isNull(patientSessions.revokedAt)
      )
    );

  const result = sessions.map((s) => ({
    ...s,
    isCurrent: currentToken ? s.sessionToken === currentToken : false,
    createdAt: s.createdAt?.toISOString(),
    lastActiveAt: s.lastActiveAt?.toISOString(),
  }));

  return NextResponse.json({ sessions: result });
}

// DELETE /api/me/sessions — revoke all sessions except current
export async function DELETE(req: NextRequest) {
  const session = getPatientFromRequest(req);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const authHeader = req.headers.get("authorization") ?? "";
  const currentToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  const now = new Date();

  if (currentToken) {
    // Revoke all except current
    await db
      .update(patientSessions)
      .set({ revokedAt: now })
      .where(
        and(
          eq(patientSessions.patientId, session.id),
          isNull(patientSessions.revokedAt),
          ne(patientSessions.sessionToken, currentToken)
        )
      );
  } else {
    // No current token context — revoke all
    await db
      .update(patientSessions)
      .set({ revokedAt: now })
      .where(
        and(
          eq(patientSessions.patientId, session.id),
          isNull(patientSessions.revokedAt)
        )
      );
  }

  return NextResponse.json({ success: true });
}
