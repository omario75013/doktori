import { auth } from "@/lib/auth";
import { db, adminUsers, type AdminRole } from "@doktori/db";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";

export type AdminSession = {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
};

/**
 * Read the NextAuth session, confirm the user is an active admin row,
 * and return the admin's id/role. Returns null if not authenticated as admin.
 */
export async function getAdminSession(): Promise<AdminSession | null> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return null;
  const sessionRole = (session.user as { role?: string }).role;
  if (sessionRole !== "admin") return null;

  const [row] = await db
    .select({
      id: adminUsers.id,
      email: adminUsers.email,
      name: adminUsers.name,
      role: adminUsers.role,
    })
    .from(adminUsers)
    .where(and(eq(adminUsers.email, email.toLowerCase()), eq(adminUsers.isActive, true)))
    .limit(1);

  if (!row) return null;
  return row as AdminSession;
}

/**
 * Guard an API route handler. If unauthenticated or role not permitted,
 * returns a NextResponse to short-circuit. Otherwise returns the admin.
 *
 * Usage:
 *   const admin = await requireAdmin(["super_admin", "finance"]);
 *   if (admin instanceof NextResponse) return admin;
 *   // …use admin.id, admin.role here
 */
export async function requireAdmin(
  allowedRoles: AdminRole[] = []
): Promise<AdminSession | NextResponse> {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  if (allowedRoles.length > 0 && !allowedRoles.includes(admin.role)) {
    return NextResponse.json(
      { error: "Permissions insuffisantes" },
      { status: 403 }
    );
  }
  return admin;
}

/**
 * Super-admin role shortcut.
 */
export function isSuperRole(role: AdminRole): boolean {
  return role === "super_admin";
}
