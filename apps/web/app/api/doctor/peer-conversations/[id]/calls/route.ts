import { NextResponse, NextRequest } from "next/server";
import { db, doctorConversations, callSessions } from "@doktori/db";
import { and, eq, or, asc, sql } from "drizzle-orm";
import { requireAuth } from "@/lib/require-auth";

// GET /api/doctor/peer-conversations/[id]/calls
// All call sessions between the two doctors that this conversation links,
// in chronological order. The chat UI merges these into the message
// timeline as centered system bubbles ("Appel — 3 min 14, 14:32").
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireAuth(req);
  if (!user || user.role !== "doctor") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const { id } = await params;

  // Authorize + read the two doctor IDs.
  const [conv] = await db
    .select({
      doctorAId: doctorConversations.doctorAId,
      doctorBId: doctorConversations.doctorBId,
    })
    .from(doctorConversations)
    .where(
      and(
        eq(doctorConversations.id, id),
        or(
          eq(doctorConversations.doctorAId, user.id),
          eq(doctorConversations.doctorBId, user.id),
        ),
      ),
    )
    .limit(1);
  if (!conv) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const rows = await db
    .select({
      id: callSessions.id,
      callerType: callSessions.callerType,
      callerId: callSessions.callerId,
      calleeType: callSessions.calleeType,
      calleeId: callSessions.calleeId,
      status: callSessions.status,
      createdAt: callSessions.createdAt,
      answeredAt: callSessions.answeredAt,
      endedAt: callSessions.endedAt,
    })
    .from(callSessions)
    .where(
      and(
        eq(callSessions.callerType, "doctor"),
        eq(callSessions.calleeType, "doctor"),
        // Either direction between the two doctors.
        sql`((${callSessions.callerId} = ${conv.doctorAId} AND ${callSessions.calleeId} = ${conv.doctorBId})
          OR (${callSessions.callerId} = ${conv.doctorBId} AND ${callSessions.calleeId} = ${conv.doctorAId}))`,
      ),
    )
    .orderBy(asc(callSessions.createdAt));

  return NextResponse.json(rows);
}
