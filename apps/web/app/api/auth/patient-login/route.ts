import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { sign } from "jsonwebtoken";
import { compare } from "bcryptjs";
import { db, patients, patientSessions } from "@doktori/db";
import { eq, or } from "drizzle-orm";

function parseDeviceLabel(ua: string | null): string {
  if (!ua) return "Navigateur inconnu";
  if (/iPhone|iPad/i.test(ua)) return /Safari/i.test(ua) ? "Safari sur iPhone/iPad" : "Application iOS";
  if (/Android/i.test(ua)) return /Chrome/i.test(ua) ? "Chrome sur Android" : "Navigateur Android";
  if (/Windows/i.test(ua)) {
    if (/Chrome/i.test(ua)) return "Chrome sur Windows";
    if (/Firefox/i.test(ua)) return "Firefox sur Windows";
    if (/Edge/i.test(ua)) return "Edge sur Windows";
    return "Navigateur Windows";
  }
  if (/Macintosh|Mac OS/i.test(ua)) {
    if (/Chrome/i.test(ua)) return "Chrome sur Mac";
    if (/Firefox/i.test(ua)) return "Firefox sur Mac";
    if (/Safari/i.test(ua)) return "Safari sur Mac";
    return "Navigateur Mac";
  }
  return "Navigateur";
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as
    | { identifier?: string; password?: string }
    | null;

  const identifier = body?.identifier?.trim();
  const password = body?.password;

  if (!identifier || !password) {
    return NextResponse.json(
      { error: "identifier et password requis" },
      { status: 400 }
    );
  }

  const [patient] = await db
    .select()
    .from(patients)
    .where(or(eq(patients.phone, identifier), eq(patients.email, identifier)))
    .limit(1);

  if (!patient) {
    return NextResponse.json({ error: "Identifiant ou mot de passe incorrect" }, { status: 401 });
  }

  if (!patient.passwordHash) {
    return NextResponse.json({ error: "Ce compte n'a pas de mot de passe configuré" }, { status: 401 });
  }

  const valid = await compare(password, patient.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Identifiant ou mot de passe incorrect" }, { status: 401 });
  }

  const token = sign(
    { id: patient.id, phone: patient.phone, name: patient.name ?? undefined, role: "patient" },
    process.env.NEXTAUTH_SECRET!,
    { expiresIn: "30d" }
  );

  // Record session in patient_sessions (fire and forget — don't fail login if this errors)
  const ua = req.headers.get("user-agent");
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    null;

  db.insert(patientSessions)
    .values({
      patientId: patient.id,
      sessionToken: token,
      ip,
      userAgent: ua,
      deviceLabel: parseDeviceLabel(ua),
    })
    .catch((e) => console.error("[patient-login] session record failed:", e));

  return NextResponse.json({
    token,
    user: {
      id: patient.id,
      name: patient.name,
      phone: patient.phone,
      email: patient.email ?? null,
      role: "patient",
    },
  });
}
