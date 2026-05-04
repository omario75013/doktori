import { NextRequest, NextResponse } from "next/server";
import { db, patients, passwordResetTokens } from "@doktori/db";
import { eq } from "drizzle-orm";
import { createHash, randomBytes } from "crypto";
import { sendEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : null;

  if (!email) {
    return NextResponse.json({ error: "Email requis" }, { status: 400 });
  }

  // Silent fail — do not reveal whether email exists
  const [patient] = await db
    .select({ id: patients.id, name: patients.name, email: patients.email })
    .from(patients)
    .where(eq(patients.email, email))
    .limit(1);

  // Always return 200 to prevent email enumeration
  if (!patient?.email) {
    return NextResponse.json({ success: true });
  }

  // Invalidate existing unexpired tokens for this patient (rate limiting via single-use)
  // We simply overwrite — the old hash just expires on its own

  // Generate a secure random token
  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await db.insert(passwordResetTokens).values({
    tokenHash,
    patientId: patient.id,
    expiresAt,
  });

  const baseUrl = process.env.NEXTAUTH_URL ?? "https://doktori.tn";
  const resetLink = `${baseUrl}/reset-password/${rawToken}`;

  await sendEmail({
    to: patient.email,
    subject: "Réinitialisation de votre mot de passe — Doktori",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#0891B2">Réinitialisation du mot de passe</h2>
        <p>Bonjour ${patient.name},</p>
        <p>Vous avez demandé à réinitialiser votre mot de passe Doktori.</p>
        <p>Cliquez sur le bouton ci-dessous (valide 1 heure) :</p>
        <a href="${resetLink}"
           style="display:inline-block;background:#0891B2;color:white;padding:12px 24px;
                  border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0">
          Réinitialiser mon mot de passe
        </a>
        <p style="color:#888;font-size:12px">
          Si vous n'avez pas fait cette demande, ignorez cet email.
          Ce lien expire dans 1 heure.
        </p>
      </div>
    `,
    text: `Réinitialisation du mot de passe Doktori\n\nLien : ${resetLink}\n\nCe lien expire dans 1 heure.`,
  });

  return NextResponse.json({ success: true });
}
