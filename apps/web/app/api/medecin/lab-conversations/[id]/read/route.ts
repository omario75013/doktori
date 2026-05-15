import { NextRequest, NextResponse } from "next/server";
import { db, labConversations } from "@doktori/db";
import { eq, and } from "drizzle-orm";
import { requireDoctorOrSecretary } from "@/lib/secretary-auth";

// POST /api/medecin/lab-conversations/[id]/read — zero out counterpart unread count for doctor
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await requireDoctorOrSecretary();
  if (actor instanceof NextResponse) return actor;
  const { doctorId } = actor;

  const { id } = await params;

  await db
    .update(labConversations)
    .set({ unreadCountCounterpart: 0 })
    .where(and(eq(labConversations.id, id), eq(labConversations.counterpartDoctorId, doctorId)));

  return NextResponse.json({ ok: true });
}
