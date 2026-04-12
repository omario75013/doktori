import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, conversations, messages } from "@doktori/db";
import { eq, and, isNull, count } from "drizzle-orm";
import { getPatientFromRequest } from "@/lib/patient-auth";

/**
 * GET /api/messages/unread
 * Returns { count: number } — total unread messages for the authenticated caller.
 *
 * For doctors: counts unread messages of senderType = 'patient' in their conversations.
 * For patients: counts unread messages of senderType = 'doctor' in their conversations.
 */
export async function GET(req: NextRequest) {
  // Patient JWT
  const patient = getPatientFromRequest(req);
  if (patient) {
    const [row] = await db
      .select({ count: count() })
      .from(messages)
      .innerJoin(conversations, eq(messages.conversationId, conversations.id))
      .where(
        and(
          eq(conversations.patientId, patient.id),
          eq(messages.senderType, "doctor"),
          isNull(messages.readAt)
        )
      );

    return NextResponse.json({ count: row?.count ?? 0 });
  }

  // Doctor session
  const session = await auth();
  if (!session?.user?.id || (session.user as any).role !== "doctor") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const [row] = await db
    .select({ count: count() })
    .from(messages)
    .innerJoin(conversations, eq(messages.conversationId, conversations.id))
    .where(
      and(
        eq(conversations.doctorId, session.user.id),
        eq(messages.senderType, "patient"),
        isNull(messages.readAt)
      )
    );

  return NextResponse.json({ count: row?.count ?? 0 });
}
