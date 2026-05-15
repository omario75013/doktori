import { NextRequest, NextResponse } from "next/server";
import { db, labConversations, labMessages } from "@doktori/db";
import { eq, and, asc } from "drizzle-orm";
import { requireDoctorOrSecretary } from "@/lib/secretary-auth";

// GET /api/medecin/lab-conversations/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await requireDoctorOrSecretary();
  if (actor instanceof NextResponse) return actor;
  const { doctorId } = actor;

  const { id } = await params;

  const [conversation] = await db
    .select()
    .from(labConversations)
    .where(and(eq(labConversations.id, id), eq(labConversations.counterpartDoctorId, doctorId)))
    .limit(1);

  if (!conversation) {
    return NextResponse.json({ error: "Conversation introuvable" }, { status: 404 });
  }

  const messages = await db
    .select()
    .from(labMessages)
    .where(eq(labMessages.conversationId, id))
    .orderBy(asc(labMessages.createdAt))
    .limit(100);

  return NextResponse.json({ conversation, messages });
}
