import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { withAdminAudit } from "@/lib/admin-audit-wrapper";
import { db, adminUsers, adminAuditLogs, type AdminRole } from "@doktori/db";
import { eq, desc } from "drizzle-orm";

const VALID_ROLES: AdminRole[] = [
  "super_admin",
  "moderator",
  "finance",
  "support",
  "marketing",
];

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteContext) {
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

export const PATCH = withAdminAudit<
  {
    user: {
      id: string;
      email: string;
      name: string;
      role: AdminRole;
      isActive: boolean;
      lastLoginAt: Date | null;
      createdAt: Date;
    };
  },
  RouteContext
>({
  action: "access.users.update",
  resourceType: "admin_users",
  allowedRoles: ["super_admin"],
  getResourceId: async (_req, ctx) => (await ctx.params).id,
  getBefore: async ({ tx, resourceId }) => {
    const [row] = await tx
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.id, resourceId))
      .limit(1);
    if (!row) return null;
    return { role: row.role, name: row.name, isActive: row.isActive };
  },
  handler: async ({ tx, resourceId, body }) => {
    const [existing] = await tx
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.id, resourceId))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Administrateur introuvable" }, { status: 404 });
    }

    const updates: Partial<typeof adminUsers.$inferInsert> = {};
    const b = (body ?? {}) as Record<string, unknown>;
    const { role, name, isActive } = b;

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

    const [updated] = await tx
      .update(adminUsers)
      .set(updates)
      .where(eq(adminUsers.id, resourceId))
      .returning();

    return {
      user: {
        id: updated.id,
        email: updated.email,
        name: updated.name,
        role: updated.role,
        isActive: updated.isActive,
        lastLoginAt: updated.lastLoginAt,
        createdAt: updated.createdAt,
      },
    };
  },
});
