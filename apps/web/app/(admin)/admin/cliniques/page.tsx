import { db, clinics } from "@doktori/db";
import { sql } from "drizzle-orm";
import { ClinicsTable } from "./clinics-table";

export const dynamic = "force-dynamic";

export default async function AdminCliniquesPage() {
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
    .orderBy(clinics.createdAt);

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Cliniques</h1>
        <p className="text-slate-500 mt-1">
          {list.length} clinique{list.length > 1 ? "s" : ""} sur la plateforme
        </p>
      </div>
      <ClinicsTable
        clinics={list.map((c) => ({
          ...c,
          createdAt: c.createdAt.toISOString(),
          doctorCount: Number(c.doctorCount ?? 0),
        }))}
      />
    </div>
  );
}
