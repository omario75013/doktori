import { NextRequest, NextResponse } from "next/server";
import { db, labs, labUsers } from "@doktori/db";
import { eq, and, isNotNull } from "drizzle-orm";
import { requireClinic } from "@/lib/clinic-auth";
import { logClinicAudit } from "@/lib/audit";
import bcrypt from "bcryptjs";

type RouteContext = { params: Promise<{ labId: string }> };

// ── GET /api/clinique/labs/[labId]/users ────────────────────────────────────
// List all lab_users for the given in-house lab.

export async function GET(_req: NextRequest, ctx: RouteContext) {
  const clinic = await requireClinic();
  if (clinic instanceof NextResponse) return clinic;

  const { labId } = await ctx.params;

  // Verify lab belongs to this clinic
  const [lab] = await db
    .select({ id: labs.id, name: labs.name, kind: labs.kind })
    .from(labs)
    .where(and(eq(labs.id, labId), isNotNull(labs.clinicId), eq(labs.clinicId, clinic.id)));

  if (!lab) {
    return NextResponse.json({ error: "Labo introuvable ou accès refusé" }, { status: 404 });
  }

  const rows = await db
    .select({
      id: labUsers.id,
      firstName: labUsers.firstName,
      lastName: labUsers.lastName,
      email: labUsers.email,
      role: labUsers.role,
      isActive: labUsers.isActive,
      lastLoginAt: labUsers.lastLoginAt,
      createdAt: labUsers.createdAt,
    })
    .from(labUsers)
    .where(eq(labUsers.labId, labId))
    .orderBy(labUsers.createdAt);

  return NextResponse.json({ lab, users: rows });
}

// ── POST /api/clinique/labs/[labId]/users ───────────────────────────────────
// Create a lab user. Returns the temporary password in the response body (and
// logs it to console). Body: { firstName, lastName, email, role }

export async function POST(req: NextRequest, ctx: RouteContext) {
  const clinic = await requireClinic();
  if (clinic instanceof NextResponse) return clinic;

  const { labId } = await ctx.params;

  // Verify lab belongs to this clinic
  const [lab] = await db
    .select({ id: labs.id, name: labs.name })
    .from(labs)
    .where(and(eq(labs.id, labId), isNotNull(labs.clinicId), eq(labs.clinicId, clinic.id)));

  if (!lab) {
    return NextResponse.json({ error: "Labo introuvable ou accès refusé" }, { status: 404 });
  }

  let body: {
    firstName?: string;
    lastName?: string;
    email?: string;
    role?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 });
  }

  const { firstName, lastName, email, role } = body;

  if (!firstName?.trim()) return NextResponse.json({ error: "Prénom requis" }, { status: 400 });
  if (!lastName?.trim()) return NextResponse.json({ error: "Nom requis" }, { status: 400 });
  if (!email?.trim()) return NextResponse.json({ error: "Email requis" }, { status: 400 });
  if (role !== "admin" && role !== "technician") {
    return NextResponse.json({ error: "Rôle invalide (admin ou technician)" }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Check email uniqueness
  const [existing] = await db
    .select({ id: labUsers.id })
    .from(labUsers)
    .where(eq(labUsers.email, normalizedEmail));
  if (existing) {
    return NextResponse.json({ error: "Un utilisateur avec cet email existe déjà" }, { status: 409 });
  }

  // Generate temporary password
  const tempPassword =
    Math.random().toString(36).slice(2, 10) +
    Math.random().toString(36).slice(2, 6).toUpperCase() +
    "!";
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  const [newUser] = await db
    .insert(labUsers)
    .values({
      labId,
      email: normalizedEmail,
      passwordHash,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      role: role as "admin" | "technician",
    })
    .returning({ id: labUsers.id, firstName: labUsers.firstName, lastName: labUsers.lastName });

  console.log(
    `[clinic-lab-users] Created lab user "${newUser?.firstName} ${newUser?.lastName}" (id=${newUser?.id}) ` +
    `for lab ${labId} (clinic ${clinic.id}). Temp password: ${tempPassword}`
  );

  await logClinicAudit({
    clinicId: clinic.id,
    actorType: "clinic",
    actorId: clinic.id,
    action: "lab_user_create",
    targetType: "lab_user",
    targetId: newUser?.id,
    metadata: { labId, email: normalizedEmail, role, labName: lab.name },
  });

  return NextResponse.json(
    { userId: newUser?.id, tempPassword },
    { status: 201 }
  );
}
