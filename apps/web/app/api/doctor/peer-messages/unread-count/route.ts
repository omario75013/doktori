import { NextRequest, NextResponse } from "next/server";
import { db, doctorMessages, doctorConversations } from "@doktori/db";
import { and, eq, isNull, or, ne, sql } from "drizzle-orm";
import { requireAuth } from "@/lib/require-auth";

// GET /api/doctor/peer-messages/unread-count
// Total unread peer-doctor messages across every conversation the doctor
// is part of — drives the red bubble on the sidebar Messagerie entry.
export async function GET(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user || user.role !== "doctor") {
    return NextResponse.json({ count: 0 });
  }

  const [row] = await db
    .select({ n: sql<number>`COUNT(*)::int` })
    .from(doctorMessages)
    .innerJoin(
      doctorConversations,
      eq(doctorConversations.id, doctorMessages.conversationId),
    )
    .where(
      and(
        ne(doctorMessages.senderId, user.id),
        isNull(doctorMessages.readAt),
        isNull(doctorMessages.deletedAt),
        or(
          eq(doctorConversations.doctorAId, user.id),
          eq(doctorConversations.doctorBId, user.id),
        ),
      ),
    );

  return NextResponse.json({ count: row?.n ?? 0 });
}
