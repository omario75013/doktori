import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/admin";
import { db, reviews } from "@doktori/db";
import { eq } from "drizzle-orm";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session || !isSuperAdmin(session.user?.email)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;
  const { status } = await req.json().catch(() => ({}));

  if (!["published", "rejected"].includes(status)) {
    return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
  }

  const [updated] = await db
    .update(reviews)
    .set({ status })
    .where(eq(reviews.id, id))
    .returning();

  if (!updated) return NextResponse.json({ error: "Avis introuvable" }, { status: 404 });
  return NextResponse.json(updated);
}
