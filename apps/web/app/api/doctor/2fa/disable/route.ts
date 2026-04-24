import { NextResponse, NextRequest } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { db, doctors, doctorBackupCodes } from "@doktori/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user || user.role !== "doctor") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const session = { user };

  const body = (await req.json().catch(() => null)) as { password?: string } | null;
  const password = body?.password;
  if (!password) {
    return NextResponse.json({ error: "Mot de passe requis" }, { status: 400 });
  }

  const [doctor] = await db
    .select({ id: doctors.id, passwordHash: doctors.passwordHash })
    .from(doctors)
    .where(eq(doctors.id, session.user.id))
    .limit(1);

  if (!doctor || !(await bcrypt.compare(password, doctor.passwordHash))) {
    return NextResponse.json({ error: "Mot de passe incorrect" }, { status: 400 });
  }

  await db.transaction(async (tx) => {
    await tx
      .update(doctors)
      .set({ totpEnabled: false, totpSecret: null, totpEnrolledAt: null })
      .where(eq(doctors.id, doctor.id));
    await tx.delete(doctorBackupCodes).where(eq(doctorBackupCodes.doctorId, doctor.id));
  });

  return NextResponse.json({ ok: true });
}
