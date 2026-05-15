"use client";

import { useEffect, useState, useRef } from "react";
import { useTranslations } from "next-intl";
import {
  MessageSquare,
  Users,
  Send,
  Eye,
  ChevronDown,
  X,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Doctor {
  id: string;
  name: string;
  specialty: string;
}

interface PatientPreview {
  patientId: string;
  name: string;
  phone: string;
}

interface Campaign {
  id: string;
  message: string;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  createdAt: string;
}

interface RecipientsResult {
  count: number;
  sample: PatientPreview[];
}

interface SendResult {
  sent: number;
  failed: number;
  recipients: number;
}

// ── Char counter ──────────────────────────────────────────────────────────────

function CharCounter({ text }: { text: string }) {
  const t = useTranslations("clinique.communication");
  const n = text.length;
  const color = n > 160 ? "text-amber-600" : n > 140 ? "text-yellow-600" : "text-muted-foreground";
  return (
    <span className={["text-xs tabular-nums", color].join(" ")}>
      {t("charLimit", { n })}
    </span>
  );
}

// ── Confirm modal ─────────────────────────────────────────────────────────────

function ConfirmModal({
  count,
  sample,
  onConfirm,
  onCancel,
  loading,
}: {
  count: number;
  sample: PatientPreview[];
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const t = useTranslations("clinique.communication");
  const preview = sample.slice(0, 3);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-gray-900">{t("confirmTitle")}</h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-sm text-gray-600">
          {t("confirmBody", { count })}
        </p>

        {preview.length > 0 && (
          <ul className="space-y-2">
            {preview.map((p) => (
              <li key={p.patientId} className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-teal-600 shrink-0" />
                <span className="font-medium truncate">{p.name}</span>
                <span className="text-gray-400 shrink-0">{p.phone}</span>
              </li>
            ))}
            {count > 3 && (
              <li className="text-xs text-gray-400">
                + {count - 3} autres…
              </li>
            )}
          </ul>
        )}

        <div className="flex gap-3 pt-1">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-50 transition-colors"
            style={{ background: "#0891B2" }}
          >
            {loading ? "Envoi…" : t("confirmYes")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CommunicationPage() {
  const t = useTranslations("clinique.communication");

  // Doctors list
  const [doctors, setDoctors] = useState<Doctor[]>([]);

  // Filter state
  const [selectedDoctorIds, setSelectedDoctorIds] = useState<string[]>([]);
  const [lastVisitFrom, setLastVisitFrom] = useState("");
  const [lastVisitTo, setLastVisitTo] = useState("");
  const [motif, setMotif] = useState("");
  const [hasFutureRdv, setHasFutureRdv] = useState(false);

  // Message
  const [message, setMessage] = useState("");

  // Preview state
  const [preview, setPreview] = useState<RecipientsResult | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Confirm modal
  const [showConfirm, setShowConfirm] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const [sendResult, setSendResult] = useState<SendResult | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  // Campaigns
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(true);

  // Doctor picker dropdown
  const [doctorPickerOpen, setDoctorPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/clinique/doctors")
      .then((r) => r.json() as Promise<{ doctors: Doctor[] }>)
      .then((d) => setDoctors(d.doctors))
      .catch(() => {/* silently ignore */});

    fetchCampaigns();
  }, []);

  function fetchCampaigns() {
    setCampaignsLoading(true);
    fetch("/api/clinique/communication/campaigns")
      .then((r) => r.json() as Promise<{ campaigns: Campaign[] }>)
      .then((d) => setCampaigns(d.campaigns))
      .catch(() => {/* silently ignore */})
      .finally(() => setCampaignsLoading(false));
  }

  function buildFilter() {
    return {
      doctorIds: selectedDoctorIds.length > 0 ? selectedDoctorIds : undefined,
      lastVisitFrom: lastVisitFrom ? new Date(lastVisitFrom).toISOString() : undefined,
      lastVisitTo: lastVisitTo ? new Date(lastVisitTo).toISOString() : undefined,
      motif: motif.trim() || undefined,
      hasFutureRdv: hasFutureRdv || undefined,
    };
  }

  async function handlePreview() {
    setPreviewLoading(true);
    setPreviewError(null);
    setPreview(null);
    setSendResult(null);
    try {
      const res = await fetch("/api/clinique/communication/recipients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildFilter()),
      });
      const data = await res.json() as RecipientsResult & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      setPreview(data);
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleSend() {
    setSendLoading(true);
    setSendError(null);
    try {
      const res = await fetch("/api/clinique/communication/sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filter: buildFilter(), message }),
      });
      const data = await res.json() as SendResult & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      setSendResult(data);
      setShowConfirm(false);
      // Refresh campaigns
      fetchCampaigns();
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Erreur");
      setShowConfirm(false);
    } finally {
      setSendLoading(false);
    }
  }

  function toggleDoctor(id: string) {
    setSelectedDoctorIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
    // Reset preview when filter changes
    setPreview(null);
  }

  const canSend = !!preview && preview.count > 0 && message.trim().length > 0;

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-foreground">{t("title")}</h1>
        <p className="text-muted-foreground text-sm mt-1">{t("subtitle")}</p>
      </div>

      {/* Filter card */}
      <div className="bg-white rounded-2xl border border-border p-6 space-y-5 shadow-sm">
        <h2 className="font-bold text-base text-foreground flex items-center gap-2">
          <Users className="h-4 w-4 text-teal-600" />
          Filtrer les destinataires
        </h2>

        {/* Doctor multi-select */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">{t("filterDoctor")}</label>
          <div className="relative" ref={pickerRef}>
            <button
              type="button"
              onClick={() => setDoctorPickerOpen((v) => !v)}
              className="w-full flex items-center justify-between rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-left hover:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <span className="truncate text-gray-600">
                {selectedDoctorIds.length === 0
                  ? t("filterAllDoctors")
                  : `${selectedDoctorIds.length} médecin(s) sélectionné(s)`}
              </span>
              <ChevronDown className="h-4 w-4 text-gray-400 shrink-0 ml-2" />
            </button>

            {doctorPickerOpen && (
              <div className="absolute z-20 top-full mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg py-1 max-h-56 overflow-y-auto">
                {doctors.map((doc) => (
                  <label
                    key={doc.id}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedDoctorIds.includes(doc.id)}
                      onChange={() => toggleDoctor(doc.id)}
                      className="rounded border-gray-300 text-teal-600"
                    />
                    <span className="text-sm text-gray-800">{doc.name}</span>
                    <span className="text-xs text-gray-400 ml-auto">{doc.specialty}</span>
                  </label>
                ))}
                {doctors.length === 0 && (
                  <p className="text-sm text-gray-400 px-3 py-2">Aucun médecin</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Date range */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">{t("filterLastVisit")}</label>
          <div className="flex items-center gap-3">
            <input
              type="date"
              value={lastVisitFrom}
              onChange={(e) => { setLastVisitFrom(e.target.value); setPreview(null); }}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <span className="text-gray-400 text-sm">—</span>
            <input
              type="date"
              value={lastVisitTo}
              onChange={(e) => { setLastVisitTo(e.target.value); setPreview(null); }}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        {/* Motif */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">{t("filterMotif")}</label>
          <input
            type="text"
            value={motif}
            onChange={(e) => { setMotif(e.target.value); setPreview(null); }}
            placeholder="ex: consultation, douleur…"
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        {/* Future RDV */}
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={hasFutureRdv}
            onChange={(e) => { setHasFutureRdv(e.target.checked); setPreview(null); }}
            className="rounded border-gray-300 text-teal-600 h-4 w-4"
          />
          <span className="text-sm text-gray-700">{t("filterFutureRdv")}</span>
        </label>

        {/* Preview button */}
        <button
          onClick={handlePreview}
          disabled={previewLoading}
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 transition-colors"
          style={{ background: "#0891B2" }}
        >
          <Eye className="h-4 w-4" />
          {previewLoading ? "Calcul…" : t("previewButton")}
        </button>

        {/* Preview result */}
        {previewError && (
          <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {previewError}
          </div>
        )}
        {preview && (
          <div className="rounded-xl bg-teal-50 border border-teal-200 px-4 py-3 space-y-2">
            <p className="text-sm font-semibold text-teal-800">
              {t("recipientsCount", { count: preview.count })}
            </p>
            {preview.sample.length > 0 && (
              <ul className="space-y-1">
                {preview.sample.map((p) => (
                  <li key={p.patientId} className="text-xs text-teal-700 flex gap-2">
                    <span className="font-medium">{p.name}</span>
                    <span className="text-teal-500">{p.phone}</span>
                  </li>
                ))}
                {preview.count > preview.sample.length && (
                  <li className="text-xs text-teal-500">
                    + {preview.count - preview.sample.length} autres
                  </li>
                )}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Message card */}
      <div className="bg-white rounded-2xl border border-border p-6 space-y-4 shadow-sm">
        <h2 className="font-bold text-base text-foreground flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-teal-600" />
          {t("messageLabel")}
        </h2>

        <div className="space-y-1.5">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            placeholder="Bonjour, la clinique vous informe…"
            className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <div className="flex items-center justify-between">
            <CharCounter text={message} />
            {message.length > 160 && (
              <span className="text-xs text-amber-600 flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" />
                Message long (plusieurs SMS)
              </span>
            )}
          </div>
        </div>

        {/* Send result */}
        {sendResult && (
          <div className="flex items-center gap-2 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {sendResult.sent} SMS envoyés · {sendResult.failed} échoué(s)
          </div>
        )}
        {sendError && (
          <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {sendError}
          </div>
        )}

        <button
          onClick={() => setShowConfirm(true)}
          disabled={!canSend || sendLoading}
          className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40 transition-colors"
          style={{ background: "#0891B2" }}
        >
          <Send className="h-4 w-4" />
          {t("send")}
        </button>
      </div>

      {/* Recent campaigns */}
      <div className="bg-white rounded-2xl border border-border p-6 shadow-sm space-y-4">
        <h2 className="font-bold text-base text-foreground">
          {t("recentCampaigns")}
        </h2>

        {campaignsLoading ? (
          <div className="space-y-3 animate-pulse">
            {[1, 2].map((i) => (
              <div key={i} className="h-16 rounded-xl bg-gray-100" />
            ))}
          </div>
        ) : campaigns.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">{t("empty")}</p>
        ) : (
          <ul className="space-y-3">
            {campaigns.map((c) => (
              <li
                key={c.id}
                className="rounded-xl border border-border p-4 space-y-2"
              >
                <p className="text-sm text-gray-800 line-clamp-2">{c.message}</p>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {c.recipientCount} destinataires
                  </span>
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {c.sentCount} envoyés
                  </span>
                  {c.failedCount > 0 && (
                    <span className="flex items-center gap-1 text-red-500">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {c.failedCount} échoués
                    </span>
                  )}
                  <span className="ml-auto">
                    {new Date(c.createdAt).toLocaleDateString("fr-FR", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Confirm modal */}
      {showConfirm && preview && (
        <ConfirmModal
          count={preview.count}
          sample={preview.sample}
          onConfirm={handleSend}
          onCancel={() => setShowConfirm(false)}
          loading={sendLoading}
        />
      )}
    </div>
  );
}
