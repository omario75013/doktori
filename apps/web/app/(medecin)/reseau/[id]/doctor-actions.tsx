"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, MessageSquare, Share2, Loader2, X, Check } from "lucide-react";
import { toast } from "sonner";

type Patient = {
  id: string;
  name: string;
  phone: string;
};

type ConnectionStatus = "none" | "pending_out" | "pending_in" | "accepted" | "blocked";

export function DoctorActions({
  doctorId,
  doctorName,
}: {
  doctorId: string;
  doctorName: string;
}) {
  const router = useRouter();
  const [connState, setConnState] = useState<ConnectionStatus>("none");
  const [connLoading, setConnLoading] = useState(true);
  const [connSubmitting, setConnSubmitting] = useState(false);
  const [referralOpen, setReferralOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/doctor/network/connect");
        if (!res.ok) return;
        const rows: Array<{
          requesterId: string;
          addresseeId: string;
          status: string;
        }> = await res.json();
        if (cancelled) return;
        const match = rows.find(
          (r) => r.requesterId === doctorId || r.addresseeId === doctorId
        );
        if (!match) {
          setConnState("none");
        } else if (match.status === "accepted") {
          setConnState("accepted");
        } else if (match.status === "blocked") {
          setConnState("blocked");
        } else {
          setConnState(match.addresseeId === doctorId ? "pending_out" : "pending_in");
        }
      } catch {
        /* silent */
      } finally {
        if (!cancelled) setConnLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [doctorId]);

  async function handleConnect() {
    if (connState !== "none" || connSubmitting) return;
    setConnSubmitting(true);
    try {
      const res = await fetch("/api/doctor/network/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addresseeId: doctorId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      toast.success(data.already ? "Invitation déjà envoyée" : "Invitation envoyée");
      setConnState("pending_out");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setConnSubmitting(false);
    }
  }

  function handleMessage() {
    router.push(`/reseau/messagerie?peer=${doctorId}`);
  }

  const connBtn = (() => {
    if (connLoading) return { label: "…", disabled: true, cls: "bg-gray-200 text-gray-500" };
    if (connSubmitting) return { label: "Envoi…", disabled: true, cls: "bg-gray-200 text-gray-500" };
    switch (connState) {
      case "accepted":
        return { label: "Connecté", disabled: true, cls: "border border-border bg-white text-foreground" };
      case "pending_out":
        return { label: "Invitation envoyée", disabled: true, cls: "bg-gray-100 text-gray-600" };
      case "pending_in":
        return { label: "Accepter l'invitation", disabled: false, cls: "bg-primary text-white hover:opacity-90" };
      case "blocked":
        return { label: "Bloqué", disabled: true, cls: "bg-red-50 text-red-600 border border-red-200" };
      default:
        return { label: "Se connecter", disabled: false, cls: "bg-primary text-white hover:opacity-90" };
    }
  })();

  return (
    <>
      <div className="flex flex-col sm:flex-row md:flex-col lg:flex-row gap-2">
        <button
          type="button"
          onClick={handleConnect}
          disabled={connBtn.disabled}
          className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-opacity disabled:opacity-60 ${connBtn.cls}`}
        >
          <UserPlus className="h-4 w-4" />
          {connBtn.label}
        </button>
        <button
          type="button"
          onClick={handleMessage}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary"
        >
          <MessageSquare className="h-4 w-4" />
          Message
        </button>
        <button
          type="button"
          onClick={() => setReferralOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary"
        >
          <Share2 className="h-4 w-4" />
          Référencer
        </button>
      </div>

      {referralOpen && (
        <ReferralDialog
          toDoctorId={doctorId}
          toDoctorName={doctorName}
          onClose={() => setReferralOpen(false)}
          onSuccess={() => {
            setReferralOpen(false);
            toast.success("Référencement créé");
          }}
        />
      )}
    </>
  );
}

function ReferralDialog({
  toDoctorId,
  toDoctorName,
  onClose,
  onSuccess,
}: {
  toDoctorId: string;
  toDoctorName: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientSearch, setPatientSearch] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [reason, setReason] = useState("");
  const [shareMedicalRecord, setShareMedicalRecord] = useState(false);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/doctor/patients");
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        const rows: Patient[] = (data as Array<Record<string, unknown>>).map((p) => ({
          id: p.id as string,
          name: p.name as string,
          phone: p.phone as string,
        }));
        setPatients(rows);
      } catch {
        /* silent */
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = patientSearch.trim()
    ? patients.filter((p) =>
        (p.name + " " + p.phone).toLowerCase().includes(patientSearch.toLowerCase())
      )
    : patients;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPatientId) {
      toast.error("Sélectionnez un patient");
      return;
    }
    if (reason.trim().length < 3) {
      toast.error("Indiquez le motif du référencement");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/doctor/referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toDoctorId,
          patientId: selectedPatientId,
          reason: reason.trim(),
          shareMedicalRecord,
          notesForReceivingDoctor: notes.trim() === "" ? null : notes.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white px-5 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">Référencer un patient</h2>
            <p className="text-xs text-gray-500 mt-0.5">vers Dr. {toDoctorName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-secondary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Patient <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={patientSearch}
              onChange={(e) => setPatientSearch(e.target.value)}
              placeholder="Rechercher un patient…"
              className="w-full h-10 rounded-xl border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary mb-2"
            />
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-xs text-gray-400 italic py-4 text-center">
                Aucun patient trouvé
              </p>
            ) : (
              <div className="max-h-40 overflow-y-auto border border-border rounded-xl divide-y divide-border">
                {filtered.slice(0, 50).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPatientId(p.id)}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2 ${
                      selectedPatientId === p.id
                        ? "bg-primary/10 text-primary font-semibold"
                        : "hover:bg-secondary"
                    }`}
                  >
                    {selectedPatientId === p.id && <Check className="h-3.5 w-3.5" />}
                    <span className="flex-1 truncate">{p.name}</span>
                    <span className="text-xs text-gray-400">{p.phone}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Motif du référencement <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex : second avis cardiologique, suite à un ECG anormal…"
              className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Note pour le médecin receveur (optionnel)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          <label className="flex items-start gap-3 rounded-xl border border-border bg-secondary/40 px-3 py-3 cursor-pointer">
            <input
              type="checkbox"
              checked={shareMedicalRecord}
              onChange={(e) => setShareMedicalRecord(e.target.checked)}
              className="mt-0.5"
            />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">
                Partager le dossier médical complet
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Si coché, le patient recevra un lien pour accepter le partage (allergies,
                traitements, consultations passées). Sinon, seuls son nom et le motif seront
                transmis.
              </p>
            </div>
          </label>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-xl border border-border bg-white px-4 py-2 text-sm font-medium hover:bg-secondary"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedPatientId}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
            >
              {submitting ? "Envoi…" : "Référencer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
