import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/admin";
import { db, doctors } from "@doktori/db";
import { eq } from "drizzle-orm";

async function requireAdmin() {
  const session = await auth();
  if (!session || !isSuperAdmin(session.user?.email)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  return null;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauth = await requireAdmin();
  if (unauth) return unauth;

  const { id } = await params;
  const body = await req.json();

  const updates: Record<string, unknown> = {};
  if (typeof body.isActive === "boolean") updates.isActive = body.isActive;
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Aucune modification" }, { status: 400 });
  }

  updates.updatedAt = new Date();
  await db.update(doctors).set(updates).where(eq(doctors.id, id));
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauth = await requireAdmin();
  if (unauth) return unauth;

  const { id } = await params;
  await db.delete(doctors).where(eq(doctors.id, id));
  return NextResponse.json({ ok: true });
}
