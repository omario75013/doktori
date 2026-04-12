import { db, secretaries, doctors } from "@doktori/db";
import { eq } from "drizzle-orm";
import { SecretariesTable } from "./secretaries-table";

export const dynamic = "force-dynamic";

export default async function AdminSecretairesPage() {
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
    .orderBy(secretaries.createdAt);

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Secrétaires</h1>
        <p className="text-slate-500 mt-1">
          {list.length} secrétaire{list.length > 1 ? "s" : ""} sur la plateforme
        </p>
      </div>
      <SecretariesTable
        secretaries={list.map((s) => ({
          ...s,
          createdAt: s.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
