import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { logAudit, extractRequestMeta } from "@/lib/admin-audit";
import { db, adminUsers, adminAuditLogs, type AdminRole } from "@doktori/db";
import { eq, desc } from "drizzle-orm";

const VALID_ROLES: AdminRole[] = [
  "super_admin",
  "moderator",
  "finance",
  "support",
  "marketing",
];

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin(["super_admin"]);
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;

  const [user] = await db
    .select({
      id: adminUsers.id,
      email: adminUsers.email,
      name: adminUsers.name,
      role: adminUsers.role,
      isActive: adminUsers.isActive,
      lastLoginAt: adminUsers.lastLoginAt,
      createdAt: adminUsers.createdAt,
      updatedAt: adminUsers.updatedAt,
    })
    .from(adminUsers)
    .where(eq(adminUsers.id, id))
    .limit(1);

  if (!user) {
    return NextResponse.json({ error: "Administrateur introuvable" }, { status: 404 });
  }

  const recentAudit = await db
    .select({
      id: adminAuditLogs.id,
      action: adminAuditLogs.action,
      resourceType: adminAuditLogs.resourceType,
      resourceId: adminAuditLogs.resourceId,
      reason: adminAuditLogs.reason,
      ip: adminAuditLogs.ip,
      createdAt: adminAuditLogs.createdAt,
    })
    .from(adminAuditLogs)
    .where(eq(adminAuditLogs.actorId, id))
    .orderBy(desc(adminAuditLogs.createdAt))
    .limit(20);

  return NextResponse.json({ user, recentAudit });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin(["super_admin"]);
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;

  const [existing] = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.id, id))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "Administrateur introuvable" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const updates: Partial<typeof adminUsers.$inferInsert> = {};
  const { role, name, isActive } = body as Record<string, unknown>;

  if (role !== undefined) {
    if (typeof role !== "string" || !VALID_ROLES.includes(role as AdminRole)) {
      return NextResponse.json({ error: "Rôle invalide" }, { status: 422 });
    }
    updates.role = role as AdminRole;
  }

  if (name !== undefined) {
    if (typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json({ error: "Nom invalide" }, { status: 422 });
    }
    updates.name = name.trim();
  }

  if (isActive !== undefined) {
    if (typeof isActive !== "boolean") {
      return NextResponse.json({ error: "isActive doit être un booléen" }, { status: 422 });
    }
    updates.isActive = isActive;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Aucune modification" }, { status: 400 });
  }

  updates.updatedAt = new Date();

  const [updated] = await db
    .update(adminUsers)
    .set(updates)
    .where(eq(adminUsers.id, id))
    .returning();

  const meta = extractRequestMeta(req);
  await logAudit({
    actor: admin,
    action: "access.users.update",
    resourceType: "admin_users",
    resourceId: id,
    before: {
      role: existing.role,
      name: existing.name,
      isActive: existing.isActive,
    },
    after: updates,
    ip: meta.ip,
    userAgent: meta.userAgent,
  });

  return NextResponse.json({
    user: {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      role: updated.role,
      isActive: updated.isActive,
      lastLoginAt: updated.lastLoginAt,
      createdAt: updated.createdAt,
    },
  });
}
