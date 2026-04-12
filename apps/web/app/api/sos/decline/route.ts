import { NextResponse } from "next/server";
import { requireDoctor } from "@/lib/doctor-auth";
import { db, sosDeclines } from "@doktori/db";

export async function POST(req: Request) {
  const doctor = await requireDoctor();
  if (doctor instanceof NextResponse) return doctor;

  const body = await req.json();
  const { sessionId, reason } = body;

  if (!sessionId) {
    return NextResponse.json({ error: "sessionId requis" }, { status: 400 });
  }

  try {
    await db.insert(sosDeclines).values({
      sessionId,
      doctorId: doctor.id,
      reason: reason || null,
    });
  } catch (e: unknown) {
    // Unique constraint violation (23505) — idempotent, already declined
    const pgError = e as { code?: string };
    if (pgError?.code === "23505") {
      return NextResponse.json({ success: true, duplicate: true });
    }
    throw e;
  }

  return NextResponse.json({ success: true });
}
