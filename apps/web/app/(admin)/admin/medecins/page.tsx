import { db, doctors } from "@doktori/db";
import { desc } from "drizzle-orm";
import { DoctorsTable } from "./doctors-table";

export const dynamic = "force-dynamic";

export default async function AdminDoctorsPage() {
  const list = await db
    .select({
      id: doctors.id,
      name: doctors.name,
      email: doctors.email,
      phone: doctors.phone,
      specialty: doctors.specialty,
      city: doctors.city,
      isActive: doctors.isActive,
      createdAt: doctors.createdAt,
    })
    .from(doctors)
    .orderBy(desc(doctors.createdAt));

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Médecins</h1>
        <p className="text-slate-500 mt-1">
          {list.length} médecin{list.length > 1 ? "s" : ""} sur la plateforme
        </p>
      </div>
      <DoctorsTable doctors={list.map((d) => ({ ...d, createdAt: d.createdAt.toISOString() }))} />
    </div>
  );
}
