import { NextRequest, NextResponse } from "next/server";
import { db, labConversations } from "@doktori/db";
import { eq, gt, sum } from "drizzle-orm";
import { requireLabContext } from "@/lib/lab-auth";
import { sql } from "drizzle-orm";

// GET /api/laboratoire/conversations/unread-count
export async function GET(req: NextRequest) {
  const ctx = await requireLabContext();
  if (ctx instanceof NextResponse) return ctx;
  const { labId } = ctx;

  const [row] = await db
    .select({ total: sql<number>`COALESCE(SUM(${labConversations.unreadCountLab}), 0)` })
    .from(labConversations)
    .where(eq(labConversations.labId, labId));

  return NextResponse.json({ unread: Number(row?.total ?? 0) });
}
