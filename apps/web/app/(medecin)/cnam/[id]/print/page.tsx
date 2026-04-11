"use client";

import { use, useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

type Data = {
  claim: {
    id: string;
    cnamNumber: string;
    patientRole: "assure" | "ayant_droit";
    amount: number;
    consultationDate: string;
    notes: string | null;
  };
  patientName: string;
  patientPhone: string;
  patientDob: string | null;
  doctorName: string;
  doctorSpecialty: string;
  doctorAddress: string;
  doctorCity: string;
  doctorPhone: string;
};

export default function CnamPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/cnam/claims/${id}`)
      .then(async (r) => {
        if (!r.ok) {
          setError("Bordereau introuvable");
          return;
        }
        setData(await r.json());
      })
      .catch(() => setError("Erreur de chargement"));
  }, [id]);

  useEffect(() => {
    if (data) {
      // Give the layout a tick to settle then open the print dialog
      const t = setTimeout(() => window.print(), 300);
      return () => clearTimeout(t);
    }
  }, [data]);

  if (error) {
    return <div className="p-8 text-red-500">{error}</div>;
  }
  if (!data) return <div className="p-8 text-gray-400">Chargement...</div>;

  const dt = (data.claim.amount / 1000).toFixed(3).replace(".", ",");

  return (
    <>
      <style jsx global>{`
        @page {
          size: A4;
          margin: 2cm;
        }
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
        }
      `}</style>

      <div className="min-h-screen bg-gray-100 print:bg-white p-6 print:p-0">
        <div className="mx-auto max-w-[210mm] bg-white print:shadow-none shadow-sm p-10 print:p-0 text-[11pt] leading-relaxed text-black">
          <div className="no-print mb-4 flex items-center justify-between">
            <a href="/cnam" className="text-sm text-blue-600 hover:underline">
              ← Retour
            </a>
            <button
              onClick={() => window.print()}
              className="bg-teal-600 text-white px-4 py-2 rounded text-sm font-semibold hover:bg-teal-700"
            >
              Imprimer
            </button>
          </div>

          <div className="border-b-2 border-black pb-4 mb-6 flex items-start justify-between">
            <div>
              <div className="text-xl font-bold uppercase tracking-wider">BORDEREAU CNAM</div>
              <div className="text-sm text-gray-600 mt-1">Tiers-Payant — Consultation médicale</div>
            </div>
            <div className="text-right text-sm">
              <div className="font-semibold">N° {data.claim.id.slice(0, 8).toUpperCase()}</div>
              <div className="text-gray-600">
                Émis le {format(new Date(), "d MMMM yyyy", { locale: fr })}
              </div>
            </div>
          </div>

          <section className="mb-6">
            <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
              Praticien
            </div>
            <div className="border border-gray-300 rounded p-4 space-y-1">
              <div className="font-bold text-base">{data.doctorName}</div>
              <div className="text-sm text-gray-700">{data.doctorSpecialty}</div>
              <div className="text-sm text-gray-700">{data.doctorAddress}</div>
              <div className="text-sm text-gray-700">{data.doctorCity}</div>
              <div className="text-sm text-gray-700">Tél. {data.doctorPhone}</div>
            </div>
          </section>

          <section className="mb-6">
            <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
              Patient
            </div>
            <table className="w-full border border-gray-300">
              <tbody>
                <tr>
                  <td className="border-b border-r border-gray-300 px-3 py-2 text-xs text-gray-600 w-1/3">
                    Nom et prénom
                  </td>
                  <td className="border-b border-gray-300 px-3 py-2 font-semibold">
                    {data.patientName}
                  </td>
                </tr>
                <tr>
                  <td className="border-b border-r border-gray-300 px-3 py-2 text-xs text-gray-600">
                    N° d&apos;immatriculation CNAM
                  </td>
                  <td className="border-b border-gray-300 px-3 py-2 font-mono font-semibold">
                    {data.claim.cnamNumber}
                  </td>
                </tr>
                <tr>
                  <td className="border-b border-r border-gray-300 px-3 py-2 text-xs text-gray-600">
                    Qualité
                  </td>
                  <td className="border-b border-gray-300 px-3 py-2">
                    {data.claim.patientRole === "assure" ? "☑ Assuré  ☐ Ayant-droit" : "☐ Assuré  ☑ Ayant-droit"}
                  </td>
                </tr>
                {data.patientDob && (
                  <tr>
                    <td className="border-r border-gray-300 px-3 py-2 text-xs text-gray-600">
                      Date de naissance
                    </td>
                    <td className="px-3 py-2">
                      {format(parseISO(data.patientDob), "d MMMM yyyy", { locale: fr })}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>

          <section className="mb-6">
            <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
              Prestation
            </div>
            <table className="w-full border border-gray-300">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border-b border-r border-gray-300 px-3 py-2 text-left text-xs">
                    Date
                  </th>
                  <th className="border-b border-r border-gray-300 px-3 py-2 text-left text-xs">
                    Acte
                  </th>
                  <th className="border-b border-gray-300 px-3 py-2 text-right text-xs">
                    Montant
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border-r border-gray-300 px-3 py-2">
                    {format(parseISO(data.claim.consultationDate), "d MMM yyyy", { locale: fr })}
                  </td>
                  <td className="border-r border-gray-300 px-3 py-2">
                    Consultation — {data.doctorSpecialty}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold">{dt} DT</td>
                </tr>
                <tr className="bg-gray-50 font-bold">
                  <td colSpan={2} className="border-t border-r border-gray-300 px-3 py-2 text-right">
                    TOTAL
                  </td>
                  <td className="border-t border-gray-300 px-3 py-2 text-right">{dt} DT</td>
                </tr>
              </tbody>
            </table>
          </section>

          {data.claim.notes && (
            <section className="mb-6">
              <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                Observations
              </div>
              <div className="border border-gray-300 rounded p-3 text-sm whitespace-pre-wrap min-h-[60px]">
                {data.claim.notes}
              </div>
            </section>
          )}

          <div className="grid grid-cols-2 gap-8 mt-10 pt-6 border-t border-gray-300">
            <div>
              <div className="text-xs text-gray-500 mb-8">Signature et cachet du médecin</div>
              <div className="border-t border-gray-400 pt-1 text-xs text-gray-400">
                {data.doctorName}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-8">Signature du patient</div>
              <div className="border-t border-gray-400 pt-1 text-xs text-gray-400">
                {data.patientName}
              </div>
            </div>
          </div>

          <div className="text-center text-[9pt] text-gray-400 mt-10">
            Généré via Doktori · doktori.tn
          </div>
        </div>
      </div>
    </>
  );
}
