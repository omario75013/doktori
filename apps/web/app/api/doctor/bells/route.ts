import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/require-auth";
import { db, doctorBells, secretaries, secretaryNotifications } from "@doktori/db";
import { and, eq } from "drizzle-orm";
import { sendPushToActors } from "@/lib/push";

const createSchema = z.object({
  label: z.string().trim().min(1).max(100),
  message: z.string().trim().max(500).optional().nullable(),
  icon: z.string().trim().max(30).optional().nullable(),
  sound: z.string().trim().max(20).optional().nullable(),
  secretaryId: z.string().uuid().optional().nullable(),
});

export async function POST(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user || user.role !== "doctor") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation échouée" }, { status: 400 });
  }

  // Validate secretary belongs to doctor if specified
  if (parsed.data.secretaryId) {
    const [s] = await db
      .select({ id: secretaries.id })
      .from(secretaries)
      .where(
        and(eq(secretaries.id, parsed.data.secretaryId), eq(secretaries.doctorId, user.id))
      )
      .limit(1);
    if (!s) return NextResponse.json({ error: "Secrétaire inconnue" }, { status: 403 });
  }

  const [created] = await db
    .insert(doctorBells)
    .values({
      doctorId: user.id,
      secretaryId: parsed.data.secretaryId ?? null,
      label: parsed.data.label,
      message: parsed.data.message ?? null,
      icon: parsed.data.icon ?? null,
      sound: parsed.data.sound ?? null,
    })
    .returning();

  // Create a secretary notification (per targeted secretary)
  let targets: string[] = [];
  if (parsed.data.secretaryId) {
    targets = [parsed.data.secretaryId];
  } else {
    const rows = await db
      .select({ id: secretaries.id })
      .from(secretaries)
      .where(and(eq(secretaries.doctorId, user.id), eq(secretaries.isActive, true)));
    targets = rows.map((r) => r.id);
  }
  if (targets.length > 0) {
    await db.insert(secretaryNotifications).values(
      targets.map((id) => ({
        secretaryId: id,
        type: "bell",
        title: parsed.data.label,
        body: parsed.data.message ?? null,
        payload: { bellId: created.id, icon: parsed.data.icon, sound: parsed.data.sound },
      }))
    );

    // Fire-and-forget push to mobile secretary devices
    void sendPushToActors(
      targets,
      "secretary",
      `🔔 ${parsed.data.label}`,
      parsed.data.message ?? "Le médecin vous sollicite",
      { type: "bell", bellId: created.id, icon: parsed.data.icon ?? null },
    );
  }

  return NextResponse.json({ ok: true, bell: created }, { status: 201 });
}
