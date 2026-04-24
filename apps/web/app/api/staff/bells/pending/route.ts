import { NextRequest, NextResponse } from "next/server";
import { getStaffFromRequest } from "@/lib/staff-auth";
import { db, doctorBells } from "@doktori/db";
import { and, desc, eq, isNull, or, gte } from "drizzle-orm";

// Returns pending (unacknowledged) bells for the authenticated secretary via Bearer JWT.
export async function GET(req: NextRequest) {
  const staff = getStaffFromRequest(req);
  if (!staff || staff.role !== "secretary") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const since = new Date(Date.now() - 30 * 60 * 1000);

  const rows = await db
    .select()
    .from(doctorBells)
    .where(
      and(
        eq(doctorBells.doctorId, staff.doctorId),
        isNull(doctorBells.acknowledgedAt),
        gte(doctorBells.createdAt, since),
        or(isNull(doctorBells.secretaryId), eq(doctorBells.secretaryId, staff.id)),
      ),
    )
    .orderBy(desc(doctorBells.createdAt));

  return NextResponse.json(rows);
}
