import { NextResponse, NextRequest } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { db, doctors } from "@doktori/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user || user.role !== "doctor") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const session = { user };

  const body = (await req.json().catch(() => null)) as
    | { currentPassword?: string; newPassword?: string }
    | null;

  const current = body?.currentPassword;
  const next = body?.newPassword;

  if (!current || !next) {
    return NextResponse.json({ error: "Champs obligatoires" }, { status: 400 });
  }
  if (next.length < 8) {
    return NextResponse.json(
      { error: "Le nouveau mot de passe doit faire au moins 8 caractères" },
      { status: 400 }
    );
  }

  const [doctor] = await db
    .select({ id: doctors.id, passwordHash: doctors.passwordHash })
    .from(doctors)
    .where(eq(doctors.id, session.user.id))
    .limit(1);

  if (!doctor) {
    return NextResponse.json({ error: "Médecin introuvable" }, { status: 404 });
  }

  const ok = await bcrypt.compare(current, doctor.passwordHash);
  if (!ok) {
    return NextResponse.json(
      { error: "Mot de passe actuel incorrect" },
      { status: 400 }
    );
  }

  const hash = await bcrypt.hash(next, 10);
  await db.update(doctors).set({ passwordHash: hash }).where(eq(doctors.id, doctor.id));

  return NextResponse.json({ ok: true });
}
