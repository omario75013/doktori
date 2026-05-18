import { NextRequest, NextResponse } from "next/server";
import {
  db,
  doctors,
  clinics,
  labs,
  labUsers,
  secretaries,
  staffPasswordResetTokens,
} from "@doktori/db";
import { eq } from "drizzle-orm";
import { createHash } from "node:crypto";
import { hash } from "bcryptjs";

type ActorType = "doctor" | "clinic" | "lab" | "lab_user" | "secretary";

function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

async function loadValidToken(rawToken: string) {
  const tokenHash = hashToken(rawToken);
  const [record] = await db
    .select()
    .from(staffPasswordResetTokens)
    .where(eq(staffPasswordResetTokens.tokenHash, tokenHash))
    .limit(1);
  if (!record) return { ok: false as const, error: "Token invalide" };
  if (record.usedAt) return { ok: false as const, error: "Token déjà utilisé" };
  if (record.expiresAt < new Date()) return { ok: false as const, error: "Token expiré" };
  return { ok: true as const, record, tokenHash };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawToken = searchParams.get("token");
  if (!rawToken) {
    return NextResponse.json({ valid: false, error: "Token manquant" }, { status: 400 });
  }
  const result = await loadValidToken(rawToken);
  if (!result.ok) {
    return NextResponse.json({ valid: false, error: result.error }, { status: 400 });
  }
  return NextResponse.json({ valid: true, actorType: result.record.actorType });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Body invalide" }, { status: 400 });

  const rawToken: string | undefined = body.token;
  const newPassword: string | undefined = body.newPassword;

  if (!rawToken || typeof rawToken !== "string") {
    return NextResponse.json({ error: "Token manquant" }, { status: 400 });
  }
  if (!newPassword || typeof newPassword !== "string" || newPassword.length < 8) {
    return NextResponse.json(
      { error: "Le mot de passe doit contenir au moins 8 caractères" },
      { status: 400 },
    );
  }

  const result = await loadValidToken(rawToken);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const passwordHash = await hash(newPassword, 12);
  const actorType = result.record.actorType as ActorType;
  const actorId = result.record.actorId;

  switch (actorType) {
    case "doctor":
      await db.update(doctors).set({ passwordHash }).where(eq(doctors.id, actorId));
      break;
    case "clinic":
      await db.update(clinics).set({ passwordHash }).where(eq(clinics.id, actorId));
      break;
    case "lab":
      await db.update(labs).set({ passwordHash }).where(eq(labs.id, actorId));
      break;
    case "lab_user":
      await db.update(labUsers).set({ passwordHash }).where(eq(labUsers.id, actorId));
      break;
    case "secretary":
      await db.update(secretaries).set({ passwordHash }).where(eq(secretaries.id, actorId));
      break;
    default:
      return NextResponse.json({ error: "Type d'acteur inconnu" }, { status: 400 });
  }

  await db
    .update(staffPasswordResetTokens)
    .set({ usedAt: new Date() })
    .where(eq(staffPasswordResetTokens.tokenHash, result.tokenHash));

  // Login URL per actor type — helps the success screen route back correctly
  const loginPath =
    actorType === "doctor"
      ? "/connexion"
      : actorType === "clinic"
        ? "/clinique-login"
        : actorType === "lab" || actorType === "lab_user"
          ? "/laboratoire-login"
          : "/secretaire-login";

  return NextResponse.json({ success: true, loginPath, actorType });
}
