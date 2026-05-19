import { db, secretaries, doctors } from "@doktori/db";
import { desc, eq, sql } from "drizzle-orm";
import { SecretariesTable } from "./secretaries-table";
import { AdminPagination } from "@/components/admin/pagination";
import { parsePageParams } from "@/lib/admin-pagination";

export const dynamic = "force-dynamic";

export default async function AdminSecretairesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const { page, pageSize, offset } = parsePageParams(sp);

  const [{ count: total }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(secretaries);

  const list = await db
    .select({
      id: secretaries.id,
      name: secretaries.name,
      email: secretaries.email,
      isActive: secretaries.isActive,
      createdAt: secretaries.createdAt,
      doctorId: doctors.id,
      doctorName: doctors.name,
    })
    .from(secretaries)
    .innerJoin(doctors, eq(secretaries.doctorId, doctors.id))
    .orderBy(desc(secretaries.createdAt))
    .limit(pageSize)
    .offset(offset);

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Secrétaires</h1>
        <p className="text-slate-500 mt-1">
          {total} secrétaire{total > 1 ? "s" : ""} sur la plateforme
        </p>
      </div>
      <SecretariesTable
        secretaries={list.map((s) => ({
          ...s,
          createdAt: s.createdAt.toISOString(),
        }))}
      />
      <div className="bg-white rounded-b-xl border-x border-b border-slate-200 -mt-px">
        <AdminPagination page={page} pageSize={pageSize} total={Number(total ?? 0)} />
      </div>
    </div>
  );
}
