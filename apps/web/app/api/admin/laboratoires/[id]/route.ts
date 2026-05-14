import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin-auth";
import { db, labs } from "@doktori/db";

type RouteContext = { params: Promise<{ id: string }> };

type PatchBody = { verificationStatus: "verified" | "rejected" };

export async function PATCH(req: Request, { params }: RouteContext) {
  const admin = await requireAdmin(["super_admin", "moderator"]);
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;

  let body: PatchBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }

  const { verificationStatus } = body;
  if (!["verified", "rejected"].includes(verificationStatus)) {
    return NextResponse.json(
      { error: "verificationStatus doit être 'verified' ou 'rejected'" },
      { status: 400 }
    );
  }

  const [existing] = await db.select({ id: labs.id }).from(labs).where(eq(labs.id, id)).limit(1);
  if (!existing) {
    return NextResponse.json({ error: "Laboratoire introuvable" }, { status: 404 });
  }

  const [updated] = await db
    .update(labs)
    .set({ verificationStatus })
    .where(eq(labs.id, id))
    .returning();

  return NextResponse.json({ lab: updated });
}
