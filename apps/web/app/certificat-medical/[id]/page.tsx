import { db, medicalCertificates, doctors, patients } from "@doktori/db";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { SPECIALTIES } from "@doktori/shared";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { PrintButton } from "@/components/print-button";
import { QRCode } from "@/components/qr-code";
import { renderPrescriptionContent } from "@/lib/prescription-render";

export default async function MedicalCertificatePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ print?: string }>;
}) {
  const { id } = await params;
  const { print } = await searchParams;

  const [result] = await db
    .select({
      id: medicalCertificates.id,
      title: medicalCertificates.title,
      content: medicalCertificates.content,
      createdAt: medicalCertificates.createdAt,
      verificationToken: medicalCertificates.verificationToken,
      doctorId: medicalCertificates.doctorId,
      patientId: medicalCertificates.patientId,
      appointmentId: medicalCertificates.appointmentId,
      doctorName: doctors.name,
      doctorSpecialty: doctors.specialty,
      doctorPhone: doctors.phone,
      doctorAddress: doctors.address,
      doctorSignatureUrl: doctors.signatureUrl,
      patientName: patients.name,
      patientPhone: patients.phone,
    })
    .from(medicalCertificates)
    .innerJoin(doctors, eq(medicalCertificates.doctorId, doctors.id))
    .innerJoin(patients, eq(medicalCertificates.patientId, patients.id))
    .where(eq(medicalCertificates.id, id))
    .limit(1);

  if (!result) notFound();

  // Defensive re-render so any legacy {{placeholder}} markup still
  // resolves at display time.
  const renderedContent = await renderPrescriptionContent(
    result.content,
    result.doctorId,
    result.patientId,
    result.appointmentId,
  );

  const specialty = SPECIALTIES.find((s) => s.id === result.doctorSpecialty);

  return (
    <>
      <style>{`
        @media print {
          body > *:not(#certificate-root) { display: none !important; }
          nav, header, footer, aside, .no-print { display: none !important; }
          #certificate-root { display: block !important; }
          @page { margin: 20mm; size: A4; }
          body { background: white !important; }
        }
      `}</style>
      {print === "1" && (
        <script
          dangerouslySetInnerHTML={{
            __html: `window.addEventListener('load',()=>setTimeout(()=>window.print(),250));`,
          }}
        />
      )}

      <div
        id="certificate-root"
        className="max-w-2xl mx-auto p-8 print:p-0 bg-white min-h-screen"
      >
        <div className="no-print mb-6 flex items-center justify-between bg-secondary border border-border rounded-xl px-5 py-3">
          <p className="text-sm text-foreground font-medium">
            {result.title} — {result.patientName}
          </p>
          <PrintButton />
        </div>

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

        <div className="flex items-center gap-3 mb-4">
          <div className="h-px flex-1 bg-gray-200" />
          <span className="text-xs font-bold uppercase tracking-widest text-gray-400">
            {result.title}
          </span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>

        <div className="mb-16 min-h-[200px]">
          {/^\s*<\w+/.test(renderedContent) ? (
            <div
              className="prose prose-sm max-w-none text-gray-800 print:text-base"
              dangerouslySetInnerHTML={{ __html: renderedContent }}
            />
          ) : (
            <div className="whitespace-pre-wrap text-sm leading-loose text-gray-800 print:text-base">
              {renderedContent}
            </div>
          )}
        </div>

        <div className="mt-12 flex justify-end">
          <div className="text-center min-w-[200px]">
            {result.doctorSignatureUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={result.doctorSignatureUrl}
                alt="Signature du médecin"
                style={{
                  height: 64,
                  maxWidth: 200,
                  objectFit: "contain",
                  margin: "0 auto 4px",
                  display: "block",
                }}
              />
            ) : (
              <div className="h-16 border-b border-gray-300 mb-2" />
            )}
            <p className="text-xs text-gray-500">Signature et cachet du médecin</p>
            <p className="text-sm font-medium text-gray-700 mt-1">{result.doctorName}</p>
          </div>
        </div>

        {result.verificationToken && (
          <div className="mt-10 pt-6 border-t border-gray-200 flex items-center gap-5">
            <QRCode
              url={`https://doktori.tn/api/medical-certificates/verify?token=${result.verificationToken}`}
              size={80}
            />
            <div>
              <p className="text-xs font-bold text-gray-600 mb-0.5">
                Vérification de l&apos;authenticité
              </p>
              <p className="text-xs text-gray-400">
                Scannez ce QR code pour vérifier que ce certificat est authentique et
                n&apos;a pas été falsifié.
              </p>
              <p className="text-xs text-primary mt-1 font-mono break-all">
                doktori.tn/certificat-medical
              </p>
            </div>
          </div>
        )}

        <div className="mt-12 pt-4 border-t border-gray-200 text-xs text-center text-gray-400">
          Document généré via{" "}
          <span className="font-semibold text-primary">Doktori.tn</span>
        </div>
      </div>
    </>
  );
}
