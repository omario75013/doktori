"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Send, X, Stethoscope } from "lucide-react";
import { toast } from "sonner";

type Peer = {
  id: string;
  name: string;
  specialty?: string | null;
  photoUrl?: string | null;
};

// Refer a patient to one of the doctor's peer connections. The peer list
// comes from /api/doctor/network/connect (status='accepted'); a referral
// can only be sent to an accepted contact.
//
// On submit POSTs /api/doctor/referrals with shareMedicalRecord +
// notesForReceivingDoctor. The backend handles consent token generation
// + notifying the receiving doctor.
export function ReferPatientModal({
  patientId,
  patientName,
  onClose,
}: {
  patientId: string;
  patientName: string;
  onClose: () => void;
}) {
  const t = useTranslations("medecin.reseau");
  const [peers, setPeers] = useState<Peer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeerId, setSelectedPeerId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [shareDossier, setShareDossier] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const res = await fetch("/api/doctor/network/connect", { cache: "no-store" });
        if (!res.ok) throw new Error("Erreur");
        const data = await res.json();
        // Endpoint returns the raw rows — keep only accepted, then fetch
        // peer names. The /reseau page renders names via SQL JOIN; for a
        // simple modal we can derive them from /api/doctors/by-slug too,
        // but the cheaper path is to call /api/doctor/peer-conversations
        // which already exposes peerName / specialty / photo for each
        // accepted connection.
        const conv = await fetch("/api/doctor/peer-conversations", {
          cache: "no-store",
        });
        if (!conv.ok) throw new Error("Erreur");
        const threads = await conv.json();
        // We also need accepted peers that don't yet have a conversation.
        // Map from connection rows to doctor IDs and union with thread peers.
        const acceptedIds: string[] = Array.isArray(data)
          ? (data as Array<{ requesterId: string; addresseeId: string; status: string }>)
              .filter((r) => r.status === "accepted")
              .map((r) => (r.requesterId === r.addresseeId ? r.requesterId : r.addresseeId))
          : [];
        const peerSet = new Map<string, Peer>();
        for (const th of threads as Array<{
          peerId: string;
          peerName: string;
          peerSpecialty: string | null;
          peerPhotoUrl: string | null;
        }>) {
          peerSet.set(th.peerId, {
            id: th.peerId,
            name: th.peerName,
            specialty: th.peerSpecialty,
            photoUrl: th.peerPhotoUrl,
          });
        }
        // Fetch doctor details for any accepted peer not yet in the map.
        const missing = acceptedIds.filter((id) => !peerSet.has(id));
        if (missing.length > 0) {
          for (const id of missing) {
            try {
              const r = await fetch(`/api/doctors/${id}/status`, { cache: "no-store" });
              // status route returns minimal data — skip if no name; we
              // simply omit unreferenceable peers rather than fail.
              if (!r.ok) continue;
            } catch {
              /* ignore */
            }
          }
        }
        if (alive) setPeers(Array.from(peerSet.values()));
      } catch {
        if (alive) toast.error(t("referLoadError"));
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, []);

  async function submit() {
    if (!selectedPeerId) return;
    if (reason.trim().length < 3) {
      toast.error(t("reasonRequired"));
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/doctor/referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toDoctorId: selectedPeerId,
          patientId,
          reason: reason.trim(),
          shareMedicalRecord: shareDossier,
          notesForReceivingDoctor: notes.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? t("errorGeneric"));
      toast.success(t("referSuccess"));
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("errorGeneric"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(15,23,42,0.45)" }}
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md max-h-[88vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="text-[15px] font-bold text-gray-900 dark:text-white">
            {t("referModalTitle", { name: patientName })}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <section>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">
              {t("referralToLabel")}
            </p>
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin text-gray-400 mx-auto" />
            ) : peers.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-secondary/40 px-3 py-4 text-center text-xs text-gray-500">
                {t("referEmptyPeers")}{" "}
                <a href="/reseau" className="text-primary underline">
                  {t("referEmptyPeersLink")}
                </a>
                .
              </div>
            ) : (
              <ul className="space-y-1.5 max-h-44 overflow-y-auto">
                {peers.map((p) => {
                  const checked = selectedPeerId === p.id;
                  return (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedPeerId(p.id)}
                        className="w-full flex items-center gap-3 rounded-xl border px-3 py-2 text-start"
                        style={{
                          borderColor: checked ? "var(--primary-600)" : "var(--line-cool)",
                          background: checked ? "var(--primary-50, #ECFEFF)" : "transparent",
                        }}
                      >
                        {p.photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.photoUrl}
                            alt={p.name}
                            width={32}
                            height={32}
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: "50%",
                              objectFit: "cover",
                            }}
                          />
                        ) : (
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-secondary text-[11px] font-bold text-gray-600">
                            {p.name.split(/\s+/).map((s) => s[0]).slice(0, 2).join("")}
                          </span>
                        )}
                        <span className="flex-1 min-w-0">
                          <span className="block font-semibold text-[13.5px] truncate text-foreground">
                            Dr {p.name.replace(/^Dr\.?\s*/i, "")}
                          </span>
                          {p.specialty && (
                            <span className="block text-[12px] truncate text-gray-500">
                              <Stethoscope className="w-3 h-3 inline me-1" />
                              {p.specialty}
                            </span>
                          )}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">
              {t("reasonLabel")} <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              placeholder={t("reasonPlaceholder")}
              className="w-full rounded-xl border border-border bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </section>

          <section>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">
              {t("notesLabel")}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder={t("notesPlaceholder")}
              className="w-full rounded-xl border border-border bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </section>

          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={shareDossier}
              onChange={(e) => setShareDossier(e.target.checked)}
              className="mt-0.5"
            />
            <span className="text-[13px] text-foreground">
              {t("shareDossier")}
              <span className="block text-[11px] text-gray-500">
                {t("shareDossierHint")}
              </span>
            </span>
          </label>
        </div>
        <div className="flex gap-2 px-5 py-3 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex-1 py-2 rounded-xl border border-border bg-white text-sm text-gray-600 hover:bg-secondary disabled:opacity-50"
          >
            {t("cancel")}
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={submitting || !selectedPeerId || reason.trim().length < 3}
            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {t("send")}
          </button>
        </div>
      </div>
    </div>
  );
}
