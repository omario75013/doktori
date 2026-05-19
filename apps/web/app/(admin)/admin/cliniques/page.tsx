import { db, clinics } from "@doktori/db";
import { desc, sql } from "drizzle-orm";
import { ClinicsTable } from "./clinics-table";
import { AdminPagination } from "@/components/admin/pagination";
import { parsePageParams } from "@/lib/admin-pagination";

export const dynamic = "force-dynamic";

export default async function AdminCliniquesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const { page, pageSize, offset } = parsePageParams(sp);

  const [{ count: total }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(clinics);

  const list = await db
    .select({
      id: clinics.id,
      name: clinics.name,
      city: clinics.city,
      phone: clinics.phone,
      email: clinics.email,
      plan: clinics.plan,
      logoUrl: clinics.logoUrl,
      createdAt: clinics.createdAt,
      doctorCount: sql<number>`(select count(*) from clinic_doctors where clinic_doctors.clinic_id = ${clinics.id})::int`,
    })
    .from(clinics)
    .orderBy(desc(clinics.createdAt))
    .limit(pageSize)
    .offset(offset);

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Cliniques</h1>
        <p className="text-slate-500 mt-1">
          {total} clinique{total > 1 ? "s" : ""} sur la plateforme
        </p>
      </div>
      <ClinicsTable
        clinics={list.map((c) => ({
          ...c,
          createdAt: c.createdAt.toISOString(),
          doctorCount: Number(c.doctorCount ?? 0),
        }))}
      />
      <div className="bg-white rounded-b-xl border-x border-b border-slate-200 -mt-px">
        <AdminPagination page={page} pageSize={pageSize} total={Number(total ?? 0)} />
      </div>
    </div>
  );
}
