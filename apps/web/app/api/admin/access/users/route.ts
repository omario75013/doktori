import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireAdmin } from "@/lib/admin-auth";
import { logAudit, extractRequestMeta } from "@/lib/admin-audit";
import { db, adminUsers, type AdminRole } from "@doktori/db";
import { desc } from "drizzle-orm";

const VALID_ROLES: AdminRole[] = [
  "super_admin",
  "moderator",
  "finance",
  "support",
  "marketing",
];

export async function GET(req: Request) {
  const admin = await requireAdmin(["super_admin"]);
  if (admin instanceof NextResponse) return admin;

  const list = await db
    .select({
      id: adminUsers.id,
      email: adminUsers.email,
      name: adminUsers.name,
      role: adminUsers.role,
      isActive: adminUsers.isActive,
      lastLoginAt: adminUsers.lastLoginAt,
      createdAt: adminUsers.createdAt,
    })
    .from(adminUsers)
    .orderBy(desc(adminUsers.createdAt));

  return NextResponse.json({ users: list });
}

export async function POST(req: Request) {
  const admin = await requireAdmin(["super_admin"]);
  if (admin instanceof NextResponse) return admin;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const { name, email, role, password } = body as Record<string, unknown>;

  // Validate inputs
  if (typeof name !== "string" || name.trim().length < 2) {
    return NextResponse.json({ error: "Nom requis (min 2 caractères)" }, { status: 422 });
  }
  if (typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ error: "Email invalide" }, { status: 422 });
  }
  if (typeof role !== "string" || !VALID_ROLES.includes(role as AdminRole)) {
    return NextResponse.json({ error: "Rôle invalide" }, { status: 422 });
  }
  if (typeof password !== "string" || password.length < 8) {
    return NextResponse.json({ error: "Mot de passe requis (min 8 caractères)" }, { status: 422 });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(password, 12);

  let newUser: typeof adminUsers.$inferSelect;
  try {
    const [row] = await db
      .insert(adminUsers)
      .values({
        email: normalizedEmail,
        name: name.trim(),
        role: role as AdminRole,
        passwordHash,
        isActive: true,
      })
      .returning();
    newUser = row;
  } catch (e: unknown) {
    const pg = e as { code?: string };
    if (pg?.code === "23505") {
      return NextResponse.json({ error: "Cet email est déjà utilisé" }, { status: 409 });
    }
    throw e;
  }

  const meta = extractRequestMeta(req);
  await logAudit({
    actor: admin,
    action: "access.users.create",
    resourceType: "admin_users",
    resourceId: newUser.id,
    after: { email: normalizedEmail, name: name.trim(), role },
    ip: meta.ip,
    userAgent: meta.userAgent,
  });

  return NextResponse.json(
    {
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        isActive: newUser.isActive,
        createdAt: newUser.createdAt,
      },
    },
    { status: 201 }
  );
}
