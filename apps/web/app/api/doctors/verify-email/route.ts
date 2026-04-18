import { NextResponse } from "next/server";
import { db, doctors } from "@doktori/db";
import { eq, and, isNotNull } from "drizzle-orm";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token || token.length !== 64) {
    return NextResponse.json({ error: "Token invalide" }, { status: 400 });
  }

  const [doctor] = await db
    .select({ id: doctors.id, emailVerified: doctors.emailVerified })
    .from(doctors)
    .where(
      and(
        eq(doctors.emailVerificationToken, token),
        isNotNull(doctors.emailVerificationToken)
      )
    )
    .limit(1);

  if (!doctor) {
    return NextResponse.json(
      { error: "Lien invalide ou expiré" },
      { status: 404 }
    );
  }

  if (doctor.emailVerified) {
    // Already verified — redirect to login
    return NextResponse.redirect(new URL("/connexion?verified=already", req.url));
  }

  await db
    .update(doctors)
    .set({
      emailVerified: true,
      emailVerifiedAt: new Date(),
      emailVerificationToken: null,
    })
    .where(eq(doctors.id, doctor.id));

  return NextResponse.redirect(new URL("/connexion?verified=success", req.url));
}
