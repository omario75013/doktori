import { type NextRequest, NextResponse } from "next/server";
import { db, doctors } from "@doktori/db";
import { eq } from "drizzle-orm";

// GET /api/doctors/[id]/status — public: returns only the visible status (no awayMessage)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const [doc] = await db
    .select({
      statusMessage: doctors.statusMessage,
      statusActiveUntil: doctors.statusActiveUntil,
    })
    .from(doctors)
    .where(eq(doctors.id, id))
    .limit(1);

  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isActive =
    !!doc.statusMessage &&
    (!doc.statusActiveUntil || new Date(doc.statusActiveUntil) > new Date());

  return NextResponse.json({
    statusMessage: isActive ? doc.statusMessage : null,
    isActive,
  });
}
