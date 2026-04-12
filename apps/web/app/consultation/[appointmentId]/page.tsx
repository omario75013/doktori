import { redirect } from "next/navigation";
import { db } from "@doktori/db";
import { sql } from "drizzle-orm";
import { headers } from "next/headers";
import { verify } from "jsonwebtoken";
import { PrintButton } from "./print-button";

interface PatientPayload {
  id: string;
  phone: string;
  role: "patient";
}

function getPatientFromHeader(authHeader: string | null): PatientPayload | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  try {
    const token = authHeader.slice(7);
    const payload = verify(token, process.env.NEXTAUTH_SECRET!) as PatientPayload;
    if (payload.role !== "patient") return null;
    return payload;
  } catch {
    return null;
  }
}

interface Appointment {
  id: string;
  doctor_name: string;
  starts_at: string;
  payment_status: string | null;
  payment_amount: number | null;
  payment_ref: string | null;
  patient_id: string;
}

interface Prescription {
  id: string;
}

interface ConsultationNote {
  id: string;
  assessment: string | null;
  plan: string | null;
}

interface CnamClaim {
  status: string;
}

export default async function ConsultationSummaryPage({
  params,
}: {
  params: Promise<{ appointmentId: string }>;
}) {
  const { appointmentId } = await params;

  // Auth: read patient JWT from Authorization header (server component reads headers())
  const headersList = await headers();
  const authHeader = headersList.get("authorization");
  const patient = getPatientFromHeader(authHeader);

  // If no token, redirect to login (patient auth page)
  if (!patient) {
    redirect(`/connexion?redirect=/consultation/${appointmentId}`);
  }

  // Fetch appointment — verify it belongs to this patient
  const apptResult = await db.execute(sql`
    SELECT
      a.id,
      d.name AS doctor_name,
      a.starts_at,
      a.payment_status,
      a.payment_amount,
      a.payment_ref,
      a.patient_id
    FROM appointments a
    JOIN doctors d ON d.id = a.doctor_id
    WHERE a.id = ${appointmentId}
    LIMIT 1
  `);
  const appt = (apptResult as unknown as Appointment[])[0] ?? null;

  if (!appt || appt.patient_id !== patient.id) {
    redirect("/");
  }

  // Fetch prescription
  const prescResult = await db.execute(sql`
    SELECT id FROM prescriptions WHERE appointment_id = ${appointmentId} LIMIT 1
  `);
  const prescription = (prescResult as unknown as Prescription[])[0] ?? null;

  // Fetch consultation note (patient-friendly: assessment + plan only)
  const noteResult = await db.execute(sql`
    SELECT id, assessment, plan
    FROM consultation_notes
    WHERE appointment_id = ${appointmentId}
    LIMIT 1
  `);
  const note = (noteResult as unknown as ConsultationNote[])[0] ?? null;

  // Fetch CNAM claim
  const cnamResult = await db.execute(sql`
    SELECT status FROM cnam_claims WHERE appointment_id = ${appointmentId} LIMIT 1
  `);
  const cnamClaim = (cnamResult as unknown as CnamClaim[])[0] ?? null;

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const dateStr = new Date(appt.starts_at).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const cnamStatusLabel: Record<string, string> = {
    draft: "Demande initiée",
    submitted: "Demande soumise",
    approved: "Approuvée",
    reimbursed: "Remboursée",
    rejected: "Refusée",
  };

  return (
    <div className="min-h-screen bg-[#F0FDFA]/40 px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-5">

        {/* Header */}
        <div className="rounded-3xl border border-[#E6F4F1] bg-white shadow-sm p-6 space-y-1">
          <h1 className="text-xl font-black text-[#134E4A]">
            Compte-rendu de consultation
          </h1>
          <p className="text-sm text-[#0E7490] font-semibold">Dr. {appt.doctor_name}</p>
          <p className="text-sm text-[#134E4A]/60">{dateStr}</p>
        </div>

        {/* Payment receipt */}
        <div className="rounded-3xl border border-[#E6F4F1] bg-white shadow-sm p-6 space-y-3">
          <h2 className="font-bold text-[#134E4A]">Reçu de paiement</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[#134E4A]/60">Statut</span>
              <span
                className={`font-semibold ${
                  appt.payment_status === "paid"
                    ? "text-green-600"
                    : "text-amber-600"
                }`}
              >
                {appt.payment_status === "paid" ? "Payé" : appt.payment_status ?? "—"}
              </span>
            </div>
            {appt.payment_amount != null && (
              <div className="flex justify-between">
                <span className="text-[#134E4A]/60">Montant</span>
                <span className="font-bold text-[#0891B2]">
                  {(appt.payment_amount / 1000).toFixed(0)} DT
                </span>
              </div>
            )}
            {appt.payment_ref && (
              <div className="flex justify-between">
                <span className="text-[#134E4A]/60">Référence</span>
                <span className="font-mono text-xs text-[#134E4A]/50">{appt.payment_ref}</span>
              </div>
            )}
          </div>
        </div>

        {/* Documents */}
        {(prescription || note) && (
          <div className="rounded-3xl border border-[#E6F4F1] bg-white shadow-sm p-6 space-y-3">
            <h2 className="font-bold text-[#134E4A]">Vos documents</h2>
            <div className="space-y-2">
              {prescription && (
                <a
                  href={`${baseUrl}/ordonnance/${prescription.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between w-full rounded-2xl border border-[#E6F4F1] px-4 py-3 hover:border-[#0891B2] hover:bg-[#F0FDFA]/40 transition-colors"
                >
                  <span className="text-sm font-semibold text-[#134E4A]">Ordonnance</span>
                  <span className="text-xs text-[#0891B2] font-bold">Voir →</span>
                </a>
              )}
              {note && (
                <div className="rounded-2xl border border-[#E6F4F1] px-4 py-4 space-y-3">
                  <p className="text-sm font-semibold text-[#134E4A]">Compte-rendu médical</p>
                  {note.assessment && (
                    <div>
                      <p className="text-xs font-bold text-[#0891B2] uppercase tracking-wider mb-1">
                        Diagnostic
                      </p>
                      <p className="text-sm text-[#134E4A]/80 whitespace-pre-line">
                        {note.assessment}
                      </p>
                    </div>
                  )}
                  {note.plan && (
                    <div>
                      <p className="text-xs font-bold text-[#0891B2] uppercase tracking-wider mb-1">
                        Plan de traitement
                      </p>
                      <p className="text-sm text-[#134E4A]/80 whitespace-pre-line">
                        {note.plan}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* CNAM claim status */}
        {cnamClaim && (
          <div className="rounded-3xl border border-green-200 bg-green-50 p-6 space-y-1">
            <h2 className="font-bold text-green-800">Remboursement CNAM</h2>
            <p className="text-sm text-green-700">
              Statut :{" "}
              <span className="font-semibold">
                {cnamStatusLabel[cnamClaim.status] ?? cnamClaim.status}
              </span>
            </p>
            <p className="text-xs text-green-600 mt-1">
              Votre médecin a initié une demande de remboursement en votre nom.
            </p>
          </div>
        )}

        {/* Print / download button */}
        <div className="text-center">
          <PrintButton />
        </div>
      </div>
    </div>
  );
}
