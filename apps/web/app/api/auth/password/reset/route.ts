import { NextRequest, NextResponse } from "next/server";
import { db, patients, passwordResetTokens } from "@doktori/db";
import { eq, isNull, gt } from "drizzle-orm";
import { createHash } from "crypto";
import { hash } from "bcryptjs";

function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

// GET /api/auth/password/reset?token=... — validate token
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawToken = searchParams.get("token");

  if (!rawToken) {
    return NextResponse.json({ valid: false, error: "Token manquant" }, { status: 400 });
  }

  const tokenHash = hashToken(rawToken);
  const now = new Date();

  const [record] = await db
    .select()
    .from(passwordResetTokens)
    .where(eq(passwordResetTokens.tokenHash, tokenHash))
    .limit(1);

  if (!record) {
    return NextResponse.json({ valid: false, error: "Token invalide" }, { status: 400 });
  }
  if (record.usedAt) {
    return NextResponse.json({ valid: false, error: "Token déjà utilisé" }, { status: 400 });
  }
  if (record.expiresAt < now) {
    return NextResponse.json({ valid: false, error: "Token expiré" }, { status: 400 });
  }

  return NextResponse.json({ valid: true });
}

// POST /api/auth/password/reset — apply new password
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Body invalide" }, { status: 400 });

  const { token: rawToken, newPassword } = body;

  if (!rawToken || typeof rawToken !== "string") {
    return NextResponse.json({ error: "Token manquant" }, { status: 400 });
  }
  if (!newPassword || typeof newPassword !== "string" || newPassword.length < 8) {
    return NextResponse.json({ error: "Le mot de passe doit contenir au moins 8 caractères" }, { status: 400 });
  }

  const tokenHash = hashToken(rawToken);
  const now = new Date();

  const [record] = await db
    .select()
    .from(passwordResetTokens)
    .where(eq(passwordResetTokens.tokenHash, tokenHash))
    .limit(1);

  if (!record) {
    return NextResponse.json({ error: "Token invalide" }, { status: 400 });
  }
  if (record.usedAt) {
    return NextResponse.json({ error: "Token déjà utilisé" }, { status: 400 });
  }
  if (record.expiresAt < now) {
    return NextResponse.json({ error: "Token expiré" }, { status: 400 });
  }

  const passwordHash = await hash(newPassword, 12);

  await db
    .update(patients)
    .set({ passwordHash })
    .where(eq(patients.id, record.patientId));

  await db
    .update(passwordResetTokens)
    .set({ usedAt: now })
    .where(eq(passwordResetTokens.tokenHash, tokenHash));

  return NextResponse.json({ success: true });
}
