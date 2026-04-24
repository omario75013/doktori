import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/require-auth";
import { db, doctorQuickActions } from "@doktori/db";
import { and, asc, eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user || user.role !== "doctor") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const rows = await db
    .select()
    .from(doctorQuickActions)
    .where(and(eq(doctorQuickActions.doctorId, user.id), eq(doctorQuickActions.isActive, true)))
    .orderBy(asc(doctorQuickActions.position));
  return NextResponse.json(rows);
}

const createSchema = z.object({
  label: z.string().trim().min(1).max(100),
  message: z.string().trim().max(500).optional().nullable(),
  icon: z.string().trim().max(30).optional().nullable(),
  sound: z.string().trim().max(20).optional().nullable(),
  position: z.number().int().min(0).max(99).optional(),
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
  const [created] = await db
    .insert(doctorQuickActions)
    .values({
      doctorId: user.id,
      label: parsed.data.label,
      message: parsed.data.message ?? null,
      icon: parsed.data.icon ?? null,
      sound: parsed.data.sound ?? null,
      position: parsed.data.position ?? 0,
    })
    .returning();
  return NextResponse.json(created, { status: 201 });
}
