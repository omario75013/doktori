import { db, doctors } from "@doktori/db";
import { eq, desc } from "drizzle-orm";
import { DoctorsTable } from "../medecins/doctors-table";
import { Clock } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminValidationPage() {
  const pending = await db
    .select({
      id: doctors.id,
      name: doctors.name,
      email: doctors.email,
      phone: doctors.phone,
      specialty: doctors.specialty,
      city: doctors.city,
      isActive: doctors.isActive,
      createdAt: doctors.createdAt,
      yearsOfExperience: doctors.yearsOfExperience,
      consultationFee: doctors.consultationFee,
      consultationMode: doctors.consultationMode,
    })
    .from(doctors)
    .where(eq(doctors.isActive, false))
    .orderBy(desc(doctors.createdAt));

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto overflow-x-hidden">
      <div className="mb-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
          <Clock className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Validation</h1>
          <p className="text-slate-500 mt-1">
            {pending.length} médecin{pending.length > 1 ? "s" : ""} en attente
            d&apos;approbation
          </p>
        </div>
      </div>
      {pending.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <p className="text-slate-500">
            ✨ Aucun médecin en attente. Tout est à jour.
          </p>
        </div>
      ) : (
        <DoctorsTable
          doctors={pending.map((d) => ({
            ...d,
            createdAt: d.createdAt.toISOString(),
            apptCount: 0,
            reviewCount: 0,
            avgRating: null,
            yearsOfExperience: d.yearsOfExperience,
            consultationFee: d.consultationFee,
            consultationMode: d.consultationMode,
          }))}
          specialties={Array.from(new Set(pending.map((d) => d.specialty))).sort()}
          cities={Array.from(new Set(pending.map((d) => d.city))).sort()}
        />
      )}
    </div>
  );
}
