import { db, patients, appointments, reviews } from "@doktori/db";
import { desc, sql } from "drizzle-orm";
import { PatientsTable } from "./patients-table";
import { AdminPagination } from "@/components/admin/pagination";
import { parsePageParams } from "@/lib/admin-pagination";

export const dynamic = "force-dynamic";

export default async function AdminPatientsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const { page, pageSize, offset } = parsePageParams(sp);

  const [{ count: total }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(patients);

  const list = await db
    .select({
      id: patients.id,
      name: patients.name,
      phone: patients.phone,
      email: patients.email,
      noShowCount: patients.noShowCount,
      lastMinuteCancelCount: patients.lastMinuteCancelCount,
      isSuspended: patients.isSuspended,
      createdAt: patients.createdAt,
      apptCount: sql<number>`(select count(*) from ${appointments} where ${appointments.patientId} = ${patients.id})::int`,
      reviewCount: sql<number>`(select count(*) from ${reviews} where ${reviews.patientId} = ${patients.id})::int`,
    })
    .from(patients)
    .orderBy(desc(patients.createdAt))
    .limit(pageSize)
    .offset(offset);

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Patients</h1>
        <p className="text-slate-500 mt-1">
          {total} patient{total > 1 ? "s" : ""} sur la plateforme
        </p>
      </div>
      <PatientsTable
        patients={list.map((p) => ({
          ...p,
          createdAt: p.createdAt.toISOString(),
          apptCount: Number(p.apptCount ?? 0),
          reviewCount: Number(p.reviewCount ?? 0),
        }))}
      />
      <div className="mt-0 bg-white rounded-b-xl border-x border-b border-slate-200 -mt-px">
        <AdminPagination page={page} pageSize={pageSize} total={Number(total ?? 0)} />
      </div>
    </div>
  );
}
