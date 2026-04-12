import { NextResponse } from "next/server";
import { db, teleconsultations, appointments } from "@doktori/db";
import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Verify payment for teleconsult appointments
  const paymentCheck = await db.execute(sql`
    SELECT type, payment_status FROM appointments WHERE id = ${id} LIMIT 1
  `);
  const appt = (paymentCheck as unknown as Array<{ type: string; payment_status: string | null }>)[0];

  if (appt?.type === "teleconsult" && appt.payment_status !== "paid") {
    return NextResponse.json(
      { error: "Paiement requis pour accéder à la téléconsultation" },
      { status: 402 }
    );
  }

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
