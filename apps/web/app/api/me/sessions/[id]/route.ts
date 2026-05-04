import { NextRequest, NextResponse } from "next/server";
import { db, patientSessions } from "@doktori/db";
import { eq, and, isNull } from "drizzle-orm";
import { getPatientFromRequest } from "@/lib/patient-auth";

// DELETE /api/me/sessions/[id] — revoke a specific session
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getPatientFromRequest(req);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;

  const [existing] = await db
    .select()
    .from(patientSessions)
    .where(
      and(
        eq(patientSessions.id, id),
        eq(patientSessions.patientId, session.id),
        isNull(patientSessions.revokedAt)
      )
    )
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "Session introuvable" }, { status: 404 });
  }

  await db
    .update(patientSessions)
    .set({ revokedAt: new Date() })
    .where(eq(patientSessions.id, id));

  return NextResponse.json({ success: true });
}
