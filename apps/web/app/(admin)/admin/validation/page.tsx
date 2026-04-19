import { db, doctors, doctorDocuments } from "@doktori/db";
import { inArray, desc, eq } from "drizzle-orm";
import { Clock } from "lucide-react";
import { ValidationTable } from "./validation-table";

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
      verificationStatus: doctors.verificationStatus,
      verificationNote: doctors.verificationNote,
    })
    .from(doctors)
    .where(
      inArray(doctors.verificationStatus, ["pending", "documents_submitted"])
    )
    .orderBy(desc(doctors.createdAt));

  // Fetch all documents for these doctors in one query
  const doctorIds = pending.map((d) => d.id);
  const allDocs =
    doctorIds.length > 0
      ? await db
          .select()
          .from(doctorDocuments)
          .where(inArray(doctorDocuments.doctorId, doctorIds))
          .orderBy(doctorDocuments.uploadedAt)
      : [];

  // Group documents by doctor id
  const docsByDoctor = allDocs.reduce<Record<string, typeof allDocs>>(
    (acc, doc) => {
      if (!acc[doc.doctorId]) acc[doc.doctorId] = [];
      acc[doc.doctorId].push(doc);
      return acc;
    },
    {}
  );

  const rows = pending.map((d) => ({
    id: d.id,
    name: d.name,
    email: d.email,
    phone: d.phone,
    specialty: d.specialty,
    city: d.city,
    isActive: d.isActive,
    createdAt: d.createdAt.toISOString(),
    verificationStatus: d.verificationStatus,
    verificationNote: d.verificationNote,
    documents: (docsByDoctor[d.id] ?? []).map((doc) => ({
      id: doc.id,
      type: doc.type,
      fileName: doc.fileName,
      fileUrl: doc.fileUrl,
      uploadedAt: doc.uploadedAt.toISOString(),
    })),
  }));

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto overflow-x-hidden">
      <div className="mb-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
          <Clock className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Validation</h1>
          <p className="text-slate-500 mt-1">
            {rows.length} médecin{rows.length > 1 ? "s" : ""} en attente de
            vérification
          </p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <p className="text-slate-500">
            ✨ Aucun médecin en attente. Tout est à jour.
          </p>
        </div>
      ) : (
        <ValidationTable doctors={rows} />
      )}
    </div>
  );
}
