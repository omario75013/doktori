import { db, adminUsers } from "@doktori/db";
import { desc } from "drizzle-orm";
import { AdminUsersTable } from "./users-table";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
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

  const serialized = list.map((u) => ({
    ...u,
    lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
    createdAt: u.createdAt.toISOString(),
  }));

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Administrateurs</h1>
        <p className="text-slate-500 mt-1">
          {list.length} admin{list.length > 1 ? "s" : ""} sur la plateforme
        </p>
      </div>
      <AdminUsersTable users={serialized} />
    </div>
  );
}
