import { NextResponse, NextRequest } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { db, doctors } from "@doktori/db";
import { eq } from "drizzle-orm";
import { generateSecret, totpUri } from "@/lib/totp";

export async function POST(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user || user.role !== "doctor") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const session = { user };

  const [doctor] = await db
    .select({ id: doctors.id, email: doctors.email, totpEnabled: doctors.totpEnabled })
    .from(doctors)
    .where(eq(doctors.id, session.user.id))
    .limit(1);

  if (!doctor) {
    return NextResponse.json({ error: "Médecin introuvable" }, { status: 404 });
  }
  if (doctor.totpEnabled) {
    return NextResponse.json(
      { error: "Le 2FA est déjà activé" },
      { status: 400 }
    );
  }

  const secret = generateSecret();
  const uri = totpUri(doctor.email, secret);

  // Store the secret but don't mark it enabled until verified
  await db
    .update(doctors)
    .set({ totpSecret: secret, totpEnabled: false })
    .where(eq(doctors.id, doctor.id));

  return NextResponse.json({ secret, uri });
}
