import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { db, adminUsers, adminAuditLogs } from "@doktori/db";
import { eq, desc } from "drizzle-orm";
import { AdminUserDetailClient } from "./detail-client";

export const dynamic = "force-dynamic";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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

  if (!user) notFound();

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

  const serialized = {
    ...user,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };

  const serializedAudit = recentAudit.map((log) => ({
    ...log,
    createdAt: log.createdAt.toISOString(),
  }));

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <Link
        href="/admin/acces/utilisateurs"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Retour aux administrateurs
      </Link>

      <AdminUserDetailClient user={serialized} recentAudit={serializedAudit} />
    </div>
  );
}
