import { db, prescriptions, doctors, patients } from "@doktori/db";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { SPECIALTIES } from "@doktori/shared";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { PrintButton } from "@/components/print-button";
import { QRCode } from "@/components/qr-code";

export default async function PrescriptionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [result] = await db
    .select({
      id: prescriptions.id,
      content: prescriptions.content,
      createdAt: prescriptions.createdAt,
      verificationToken: prescriptions.verificationToken,
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
    <>
      <style>{`
        @media print {
          /* Hide everything outside the prescription */
          body > *:not(#prescription-root) { display: none !important; }
          nav, header, footer, aside, .no-print { display: none !important; }
          #prescription-root { display: block !important; }
          @page {
            margin: 20mm;
            size: A4;
          }
          body { background: white !important; }
        }
      `}</style>

      <div id="prescription-root" className="max-w-2xl mx-auto p-8 print:p-0 bg-white min-h-screen">

        {/* Print action bar — hidden on print */}
        <div className="no-print mb-6 flex items-center justify-between bg-secondary border border-border rounded-xl px-5 py-3">
          <p className="text-sm text-foreground font-medium">
            Ordonnance — {result.patientName}
          </p>
          <PrintButton />
        </div>

        {/* Letterhead */}
        <div className="border-b-2 border-primary pb-5 mb-6">
          <h1 className="text-2xl font-bold text-foreground">{result.doctorName}</h1>
          {specialty && (
            <p className="text-sm font-semibold text-primary mt-0.5">{specialty.label}</p>
          )}
          {result.doctorAddress && (
            <p className="text-sm text-gray-500 mt-2">{result.doctorAddress}</p>
          )}
          {result.doctorPhone && (
            <p className="text-sm text-gray-500">Tél : {result.doctorPhone}</p>
          )}
        </div>

        {/* Patient info + date row */}
        <div className="mb-8 flex justify-between items-start text-sm">
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-wide mb-0.5">Patient</p>
            <p className="font-semibold text-gray-800">{result.patientName || "—"}</p>
          </div>
          <div className="text-right">
            <p className="text-gray-400 text-xs uppercase tracking-wide mb-0.5">Date</p>
            <p className="font-semibold text-gray-800">
              {format(new Date(result.createdAt), "d MMMM yyyy", { locale: fr })}
            </p>
          </div>
        </div>

        {/* Section title */}
        <div className="flex items-center gap-3 mb-4">
          <div className="h-px flex-1 bg-gray-200" />
          <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Ordonnance médicale</span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>

        {/* Prescription content */}
        <div className="mb-16 min-h-[200px]">
          <div className="whitespace-pre-wrap text-sm leading-loose text-gray-800 print:text-base">
            {result.content}
          </div>
        </div>

        {/* Signature block */}
        <div className="mt-12 flex justify-end">
          <div className="text-center min-w-[200px]">
            <div className="h-16 border-b border-gray-300 mb-2" />
            <p className="text-xs text-gray-500">Signature et cachet du médecin</p>
            <p className="text-sm font-medium text-gray-700 mt-1">{result.doctorName}</p>
          </div>
        </div>

        {/* QR verification */}
        {result.verificationToken && (
          <div className="mt-10 pt-6 border-t border-gray-200 flex items-center gap-5">
            <QRCode
              url={`https://doktori.tn/api/prescriptions/verify?token=${result.verificationToken}`}
              size={80}
            />
            <div>
              <p className="text-xs font-bold text-gray-600 mb-0.5">Vérification de l&apos;authenticité</p>
              <p className="text-xs text-gray-400">
                Scannez ce QR code pour vérifier que cette ordonnance est authentique et n&apos;a pas été falsifiée.
              </p>
              <p className="text-xs text-primary mt-1 font-mono break-all">
                doktori.tn/verification-ordonnance
              </p>
            </div>
          </div>
        )}

        {/* Footer branding — visible on screen and print */}
        <div className="mt-12 pt-4 border-t border-gray-200 text-xs text-center text-gray-400">
          Document généré via{" "}
          <span className="font-semibold text-primary">Doktori.tn</span>
        </div>
      </div>
    </>
  );
}
