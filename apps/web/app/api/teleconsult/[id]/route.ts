import { NextResponse } from "next/server";
import { db, teleconsultations } from "@doktori/db";
import { eq } from "drizzle-orm";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [tc] = await db.select().from(teleconsultations)
    .where(eq(teleconsultations.appointmentId, id))
    .limit(1);

  if (!tc) return NextResponse.json({ error: "Téléconsultation introuvable" }, { status: 404 });
  return NextResponse.json({
    roomName: tc.roomName,
    roomUrl: `https://meet.jit.si/${tc.roomName}`,
    startedAt: tc.startedAt,
    endedAt: tc.endedAt,
  });
}
