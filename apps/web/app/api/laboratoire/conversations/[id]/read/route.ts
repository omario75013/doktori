import { NextRequest, NextResponse } from "next/server";
import { db, labConversations } from "@doktori/db";
import { eq, and } from "drizzle-orm";
import { requireLabContext } from "@/lib/lab-auth";

// POST /api/laboratoire/conversations/[id]/read — zero out lab unread count
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireLabContext();
  if (ctx instanceof NextResponse) return ctx;
  const { labId } = ctx;

  const { id } = await params;

  await db
    .update(labConversations)
    .set({ unreadCountLab: 0 })
    .where(and(eq(labConversations.id, id), eq(labConversations.labId, labId)));

  return NextResponse.json({ ok: true });
}
