import { db, patients } from "@doktori/db";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SuspensionsTable } from "./suspensions-table";

export const dynamic = "force-dynamic";

export default async function AdminPatientSuspensionsPage() {
  const suspended = await db
    .select({
      id: patients.id,
      name: patients.name,
      phone: patients.phone,
      suspensionReason: patients.suspensionReason,
      suspendedAt: patients.suspendedAt,
    })
    .from(patients)
    .where(eq(patients.isSuspended, true))
    .orderBy(desc(patients.suspendedAt));

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <Link
        href="/admin/patients"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Retour aux patients
      </Link>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Patients suspendus</h1>
        <p className="text-slate-500 mt-1">
          {suspended.length} patient{suspended.length > 1 ? "s" : ""} suspendu{suspended.length > 1 ? "s" : ""}
        </p>
      </div>

      <SuspensionsTable
        patients={suspended.map((p) => ({
          id: p.id,
          name: p.name,
          phone: p.phone,
          suspensionReason: p.suspensionReason ?? null,
          suspendedAt: p.suspendedAt?.toISOString() ?? null,
        }))}
      />
    </div>
  );
}
