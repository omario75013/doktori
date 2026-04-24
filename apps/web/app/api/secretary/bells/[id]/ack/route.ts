import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import {
  db,
  doctorBells,
  secretaries,
  doctorNotifications,
  staffConversations,
  staffMessages,
} from "@doktori/db";
import { and, eq } from "drizzle-orm";

const bodySchema = z.object({
  message: z.string().trim().max(500).optional().nullable(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "secretary") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const [sec] = await db
    .select({ doctorId: secretaries.doctorId, name: secretaries.name })
    .from(secretaries)
    .where(eq(secretaries.id, session.user.id))
    .limit(1);
  if (!sec) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    /* tolerate empty body */
  }
  const parsed = bodySchema.safeParse(body);
  const message = parsed.success ? parsed.data.message ?? null : null;

  const { id } = await params;
  await db
    .update(doctorBells)
    .set({
      acknowledgedAt: new Date(),
      acknowledgedBy: session.user.id,
      acknowledgmentMessage: message,
    })
    .where(and(eq(doctorBells.id, id), eq(doctorBells.doctorId, sec.doctorId)));

  // Notify the doctor so they see the reply
  await db.insert(doctorNotifications).values({
    doctorId: sec.doctorId,
    type: "bell_ack",
    payload: {
      bellId: id,
      secretaryId: session.user.id,
      secretaryName: sec.name,
      message,
    },
  });

  return NextResponse.json({ ok: true });
}
