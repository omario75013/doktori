import { NextResponse } from "next/server";
import { db, doctorPractices } from "@doktori/db";
import { eq, and, desc, asc } from "drizzle-orm";

// Public endpoint — no auth required.
// Returns active practices for a doctor ordered by primary first.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const practices = await db
    .select()
    .from(doctorPractices)
    .where(and(eq(doctorPractices.doctorId, id), eq(doctorPractices.isActive, true)))
    .orderBy(desc(doctorPractices.isPrimary), asc(doctorPractices.createdAt));

  return NextResponse.json(practices);
}
