import { NextResponse } from "next/server";
import { sign } from "jsonwebtoken";
import { compare } from "bcryptjs";
import { db, doctors, secretaries } from "@doktori/db";
import { eq } from "drizzle-orm";

/**
 * POST /api/auth/staff-login
 * Body: { email: string, password: string, role: 'doctor' | 'secretary' }
 *
 * Issues a long-lived Bearer JWT for native clients (mobile apps) that can't
 * use NextAuth's cookie flow. Mirrors `apps/web/lib/patient-auth.ts` — same
 * secret, same `{ id, role, ... }` payload shape.
 *
 * Web continues to authenticate via NextAuth credentials providers; this endpoint
 * is purely for Bearer consumers.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as
      | { email?: string; password?: string; role?: string }
      | null;

    const email = body?.email?.trim().toLowerCase();
    const password = body?.password;
    const role = body?.role;

    if (!email || !password || (role !== "doctor" && role !== "secretary")) {
      return NextResponse.json(
        { error: "email, password et role (doctor|secretary) requis" },
        { status: 400 }
      );
    }

    if (role === "doctor") {
      const [doctor] = await db
        .select({
          id: doctors.id,
          name: doctors.name,
          email: doctors.email,
          passwordHash: doctors.passwordHash,
          verificationStatus: doctors.verificationStatus,
          photoUrl: doctors.photoUrl,
        })
        .from(doctors)
        .where(eq(doctors.email, email))
        .limit(1);
      if (!doctor || !doctor.passwordHash || !(await compare(password, doctor.passwordHash))) {
        return NextResponse.json({ error: "Email ou mot de passe incorrect" }, { status: 401 });
      }
      if (doctor.verificationStatus !== "approved") {
        return NextResponse.json(
          { error: "Votre compte est en cours de vérification par notre équipe. Vous recevrez une confirmation par email." },
          { status: 403 }
        );
      }
      const token = sign(
        { id: doctor.id, role: "doctor", name: doctor.name },
        process.env.NEXTAUTH_SECRET!,
        { expiresIn: "30d" }
      );
      return NextResponse.json({
        token,
        user: {
          id: doctor.id,
          name: doctor.name,
          email: doctor.email,
          role: "doctor",
          photoUrl: doctor.photoUrl,
        },
      });
    }

    // secretary — select only the original schema columns (0004_secretaries.sql) so that
    // missing columns from later migrations don't cause a 500 on outdated prod DBs.
    const [secretary] = await db
      .select({
        id: secretaries.id,
        name: secretaries.name,
        email: secretaries.email,
        passwordHash: secretaries.passwordHash,
        isActive: secretaries.isActive,
        doctorId: secretaries.doctorId,
      })
      .from(secretaries)
      .where(eq(secretaries.email, email))
      .limit(1);

    if (!secretary || !secretary.passwordHash || !(await compare(password, secretary.passwordHash))) {
      return NextResponse.json({ error: "Email ou mot de passe incorrect" }, { status: 401 });
    }

    if (secretary.isActive === false) {
      return NextResponse.json({ error: "Ce compte secrétaire est désactivé." }, { status: 403 });
    }

    const token = sign(
      {
        id: secretary.id,
        role: "secretary",
        name: secretary.name,
        doctorId: secretary.doctorId,
      },
      process.env.NEXTAUTH_SECRET!,
      { expiresIn: "30d" }
    );
    return NextResponse.json({
      token,
      user: {
        id: secretary.id,
        name: secretary.name,
        email: secretary.email,
        role: "secretary",
        doctorId: secretary.doctorId,
      },
    });
  } catch (err) {
    console.error("[staff-login] Unexpected error:", err);
    return NextResponse.json(
      { error: "Erreur serveur interne" },
      { status: 500 }
    );
  }
}
