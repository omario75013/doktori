"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Send, X, Stethoscope, Search } from "lucide-react";
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
  const [peerQuery, setPeerQuery] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [shareDossier, setShareDossier] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        // /api/doctor/network/peers returns only doctors currently in
        // the user's "Mon réseau" (doctor_connections.status='accepted'),
        // with name/specialty/photo already joined. Anyone NOT connected
        // is excluded — referrals only flow inside the network.
        const res = await fetch("/api/doctor/network/peers", { cache: "no-store" });
        if (!res.ok) throw new Error("Erreur");
        const data = (await res.json()) as Peer[];
        if (alive) setPeers(Array.isArray(data) ? data : []);
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
              <PeerLookup
                peers={peers}
                selectedPeerId={selectedPeerId}
                onSelect={(id) => {
                  setSelectedPeerId(id);
                  setPeerQuery("");
                }}
                query={peerQuery}
                setQuery={setPeerQuery}
                t={t}
              />
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

// Compact lookup field: search input + filtered result list. When a peer
// is selected the input collapses to a single chip showing who's selected
// (with an X to re-open the picker). Keeps the modal tight even when the
// doctor has many connected confrères.
function PeerLookup({
  peers,
  selectedPeerId,
  onSelect,
  query,
  setQuery,
  t,
}: {
  peers: Peer[];
  selectedPeerId: string | null;
  onSelect: (id: string | null) => void;
  query: string;
  setQuery: (q: string) => void;
  t: (k: string, p?: Record<string, string>) => string;
}) {
  const selected = peers.find((p) => p.id === selectedPeerId);
  const q = query.trim().toLowerCase();
  const filtered = q
    ? peers.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.specialty ?? "").toLowerCase().includes(q),
      )
    : peers;

  if (selected) {
    return (
      <div
        className="flex items-center gap-3 rounded-xl border px-3 py-2"
        style={{ borderColor: "var(--primary-600)", background: "var(--primary-50, #ECFEFF)" }}
      >
        {selected.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={selected.photoUrl}
            alt={selected.name}
            width={32}
            height={32}
            style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }}
          />
        ) : (
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-secondary text-[11px] font-bold text-gray-600">
            {selected.name.split(/\s+/).map((s) => s[0]).slice(0, 2).join("")}
          </span>
        )}
        <span className="flex-1 min-w-0">
          <span className="block font-semibold text-[13.5px] truncate text-foreground">
            Dr {selected.name.replace(/^Dr\.?\s*/i, "")}
          </span>
          {selected.specialty && (
            <span className="block text-[12px] truncate text-gray-500">
              <Stethoscope className="w-3 h-3 inline me-1" />
              {selected.specialty}
            </span>
          )}
        </span>
        <button
          type="button"
          onClick={() => onSelect(null)}
          className="text-gray-400 hover:text-red-500"
          aria-label={t("cancel")}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("peerSearchPlaceholder")}
          autoFocus
          className="w-full h-9 ps-9 pe-3 rounded-xl border border-border bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
      {filtered.length === 0 ? (
        <p className="text-xs text-gray-500 italic px-1 py-2">{t("peerNoMatch")}</p>
      ) : (
        <ul className="space-y-1 max-h-44 overflow-y-auto">
          {filtered.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => onSelect(p.id)}
                className="w-full flex items-center gap-3 rounded-xl border border-transparent hover:border-border hover:bg-secondary/40 px-3 py-2 text-start"
              >
                {p.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.photoUrl}
                    alt={p.name}
                    width={28}
                    height={28}
                    style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }}
                  />
                ) : (
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-secondary text-[10px] font-bold text-gray-600">
                    {p.name.split(/\s+/).map((s) => s[0]).slice(0, 2).join("")}
                  </span>
                )}
                <span className="flex-1 min-w-0">
                  <span className="block font-semibold text-[13px] truncate text-foreground">
                    Dr {p.name.replace(/^Dr\.?\s*/i, "")}
                  </span>
                  {p.specialty && (
                    <span className="block text-[11.5px] truncate text-gray-500">
                      {p.specialty}
                    </span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
