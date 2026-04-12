import { db, patients, appointments, reviews } from "@doktori/db";
import { desc, sql } from "drizzle-orm";
import { PatientsTable } from "./patients-table";

export const dynamic = "force-dynamic";

export default async function AdminPatientsPage() {
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
    .orderBy(desc(patients.createdAt));

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Patients</h1>
        <p className="text-slate-500 mt-1">
          {list.length} patient{list.length > 1 ? "s" : ""} sur la plateforme
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
    </div>
  );
}
