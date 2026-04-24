import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getStaffFromRequest } from "@/lib/staff-auth";
import { db, doctorBells, doctorNotifications, secretaries } from "@doktori/db";
import { and, eq } from "drizzle-orm";

const bodySchema = z.object({
  message: z.string().trim().max(500).optional().nullable(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const staff = getStaffFromRequest(req);
  if (!staff || staff.role !== "secretary") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const [sec] = await db
    .select({ name: secretaries.name })
    .from(secretaries)
    .where(eq(secretaries.id, staff.id))
    .limit(1);

  let body: unknown = {};
  try {
    body = await req.json();
  } catch { /* empty body ok */ }

  const parsed = bodySchema.safeParse(body);
  const message = parsed.success ? (parsed.data.message ?? null) : null;

  const { id } = await params;

  await db
    .update(doctorBells)
    .set({
      acknowledgedAt: new Date(),
      acknowledgedBy: staff.id,
      acknowledgmentMessage: message,
    })
    .where(
      and(eq(doctorBells.id, id), eq(doctorBells.doctorId, staff.doctorId)),
    );

  // Notify doctor of acknowledgment
  await db.insert(doctorNotifications).values({
    doctorId: staff.doctorId,
    type: "bell_ack",
    payload: {
      bellId: id,
      secretaryId: staff.id,
      secretaryName: sec?.name ?? "Secrétaire",
      message,
    },
  });

  return NextResponse.json({ ok: true });
}
