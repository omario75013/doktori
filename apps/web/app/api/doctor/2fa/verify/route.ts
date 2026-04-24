import { NextResponse, NextRequest } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { db, doctors, doctorBackupCodes } from "@doktori/db";
import { eq } from "drizzle-orm";
import { verifyTotp, generateBackupCodes } from "@/lib/totp";

export async function POST(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user || user.role !== "doctor") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const session = { user };

  const body = (await req.json().catch(() => null)) as { code?: string } | null;
  const code = body?.code?.trim();
  if (!code || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: "Code à 6 chiffres requis" }, { status: 400 });
  }

  const [doctor] = await db
    .select({ id: doctors.id, totpSecret: doctors.totpSecret })
    .from(doctors)
    .where(eq(doctors.id, session.user.id))
    .limit(1);

  if (!doctor?.totpSecret) {
    return NextResponse.json(
      { error: "Aucun secret 2FA — relancez l'activation" },
      { status: 400 }
    );
  }

  if (!verifyTotp(code, doctor.totpSecret)) {
    return NextResponse.json({ error: "Code incorrect" }, { status: 400 });
  }

  const { plain, hashed } = await generateBackupCodes();

  await db.transaction(async (tx) => {
    await tx
      .update(doctors)
      .set({ totpEnabled: true, totpEnrolledAt: new Date() })
      .where(eq(doctors.id, doctor.id));

    // Clear any previous unused codes then insert fresh ones
    await tx.delete(doctorBackupCodes).where(eq(doctorBackupCodes.doctorId, doctor.id));
    await tx.insert(doctorBackupCodes).values(
      hashed.map((h) => ({ doctorId: doctor.id, codeHash: h }))
    );
  });

  // Return plaintext codes ONCE — doctor must save them
  return NextResponse.json({ ok: true, backupCodes: plain });
}
