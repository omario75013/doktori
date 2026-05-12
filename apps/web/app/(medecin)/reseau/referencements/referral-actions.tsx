"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, CalendarPlus, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

// Action row attached under each incoming referral the doctor has not yet
// resolved. Three primary verbs:
//   - Accepter et prendre RDV  → PATCH accept, then jump to /rendez-vous
//                                 with the patient pre-filled in the New RDV modal
//   - Voir le dossier          → /patients/<id> (the fiche). Only enabled if
//                                 patientConsentStatus === 'granted' AND the
//                                 referral was shareMedicalRecord.
//   - Refuser                  → PATCH decline
export function ReferralActions({
  referralId,
  patientId,
  patientName,
  status,
  consentStatus,
  shareMedicalRecord,
}: {
  referralId: string;
  patientId: string;
  patientName: string;
  status: string;
  consentStatus: string;
  shareMedicalRecord: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<null | "accept" | "decline" | "complete">(null);

  async function call(action: "accept" | "decline" | "complete") {
    setBusy(action);
    try {
      const r = await fetch(`/api/doctor/referrals/${referralId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Erreur");
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function acceptAndBook() {
    const ok = await call("accept");
    if (!ok) return;
    toast.success("Référencement accepté");
    // Deep-link to /rendez-vous; the page reads ?newRdvFor= and
    // ?newRdvName= and opens the New RDV modal pre-filled.
    router.push(
      `/rendez-vous?newRdvFor=${patientId}&newRdvName=${encodeURIComponent(patientName)}`,
    );
  }

  async function decline() {
    if (!confirm("Refuser ce référencement ?")) return;
    const ok = await call("decline");
    if (ok) {
      toast.success("Référencement refusé");
      router.refresh();
    }
  }

  async function markCompleted() {
    const ok = await call("complete");
    if (ok) {
      toast.success("Référencement terminé");
      router.refresh();
    }
  }

  const canViewDossier = shareMedicalRecord && consentStatus === "granted";

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      {status === "pending" && (
        <>
          <button
            type="button"
            disabled={busy !== null}
            onClick={acceptAndBook}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary text-white px-3 py-1.5 text-xs font-medium hover:opacity-90 disabled:opacity-50"
          >
            {busy === "accept" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CalendarPlus className="h-3.5 w-3.5" />
            )}
            Accepter et prendre RDV
          </button>
          <button
            type="button"
            disabled={busy !== null}
            onClick={decline}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-white hover:bg-secondary text-gray-700 px-3 py-1.5 text-xs font-medium disabled:opacity-50"
          >
            {busy === "decline" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <X className="h-3.5 w-3.5" />
            )}
            Refuser
          </button>
        </>
      )}
      {status === "accepted" && (
        <>
          <a
            href={`/rendez-vous?newRdvFor=${patientId}&newRdvName=${encodeURIComponent(patientName)}`}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary text-white px-3 py-1.5 text-xs font-medium hover:opacity-90"
          >
            <CalendarPlus className="h-3.5 w-3.5" />
            Prendre RDV
          </a>
          <button
            type="button"
            disabled={busy !== null}
            onClick={markCompleted}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-white hover:bg-secondary text-gray-700 px-3 py-1.5 text-xs font-medium disabled:opacity-50"
          >
            {busy === "complete" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            Marquer terminé
          </button>
        </>
      )}
      {canViewDossier && (
        <a
          href={`/patients/${patientId}`}
          className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary px-3 py-1.5 text-xs font-medium"
        >
          <FileText className="h-3.5 w-3.5" />
          Voir le dossier
        </a>
      )}
    </div>
  );
}
