import { db, prescriptions, doctors, patients } from "@doktori/db";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { SPECIALTIES } from "@doktori/shared";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { PrintButton } from "@/components/print-button";

export default async function PrescriptionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [result] = await db
    .select({
      id: prescriptions.id,
      content: prescriptions.content,
      createdAt: prescriptions.createdAt,
      doctorName: doctors.name,
      doctorSpecialty: doctors.specialty,
      doctorPhone: doctors.phone,
      doctorAddress: doctors.address,
      patientName: patients.name,
      patientPhone: patients.phone,
    })
    .from(prescriptions)
    .innerJoin(doctors, eq(prescriptions.doctorId, doctors.id))
    .innerJoin(patients, eq(prescriptions.patientId, patients.id))
    .where(eq(prescriptions.id, id))
    .limit(1);

  if (!result) notFound();

  const specialty = SPECIALTIES.find((s) => s.id === result.doctorSpecialty);

  return (
    <div className="max-w-2xl mx-auto p-8 print:p-4 bg-white min-h-screen">
      <style>{`
        @media print {
          .no-print { display: none; }
        }
      `}</style>

      {/* Letterhead */}
      <div className="border-b-2 border-blue-600 pb-4 mb-6">
        <h1 className="text-2xl font-bold text-blue-600">{result.doctorName}</h1>
        <p className="text-sm text-gray-700">{specialty?.label}</p>
        <p className="text-sm text-gray-500 mt-1">{result.doctorAddress}</p>
        <p className="text-sm text-gray-500">Tél: {result.doctorPhone}</p>
      </div>

      {/* Patient info */}
      <div className="mb-6 text-sm">
        <div className="flex justify-between">
          <div>
            <span className="text-gray-500">Patient: </span>
            <span className="font-medium">{result.patientName || "—"}</span>
          </div>
          <div>
            <span className="text-gray-500">Date: </span>
            <span className="font-medium">
              {format(new Date(result.createdAt), "d MMMM yyyy", { locale: fr })}
            </span>
          </div>
        </div>
      </div>

      {/* Prescription content */}
      <div className="mb-12">
        <h2 className="text-lg font-bold mb-4 text-gray-800">Ordonnance</h2>
        <div className="whitespace-pre-wrap text-sm leading-relaxed bg-gray-50 p-6 rounded-lg border">
          {result.content}
        </div>
      </div>

      {/* Signature */}
      <div className="mt-24 text-right">
        <p className="text-sm text-gray-500 border-t border-gray-300 pt-2 inline-block">
          Signature et cachet
        </p>
      </div>

      {/* Print button (hidden on print) */}
      <div className="no-print mt-8 text-center">
        <PrintButton />
      </div>

      {/* Footer branding */}
      <div className="mt-8 pt-4 border-t border-gray-200 text-xs text-center text-gray-400">
        Généré via Doktori.tn
      </div>
    </div>
  );
}
