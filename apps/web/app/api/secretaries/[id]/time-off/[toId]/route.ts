import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db, secretaries, secretaryTimeOff } from "@doktori/db";
import { and, eq } from "drizzle-orm";

const bodySchema = z.object({
  status: z.enum(["approved", "denied", "pending"]).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; toId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "doctor") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const { id, toId } = await params;

  const [sec] = await db
    .select({ id: secretaries.id })
    .from(secretaries)
    .where(and(eq(secretaries.id, id), eq(secretaries.doctorId, session.user.id)))
    .limit(1);
  if (!sec) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success || !parsed.data.status) {
    return NextResponse.json({ error: "status requis" }, { status: 400 });
  }

  await db
    .update(secretaryTimeOff)
    .set({ status: parsed.data.status, decidedAt: new Date() })
    .where(and(eq(secretaryTimeOff.id, toId), eq(secretaryTimeOff.secretaryId, id)));

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; toId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "doctor") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const { id, toId } = await params;
  const [sec] = await db
    .select({ id: secretaries.id })
    .from(secretaries)
    .where(and(eq(secretaries.id, id), eq(secretaries.doctorId, session.user.id)))
    .limit(1);
  if (!sec) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  await db
    .delete(secretaryTimeOff)
    .where(and(eq(secretaryTimeOff.id, toId), eq(secretaryTimeOff.secretaryId, id)));

  return NextResponse.json({ ok: true });
}
