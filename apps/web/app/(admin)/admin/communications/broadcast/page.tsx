"use client";

import { useEffect, useState, useCallback } from "react";
import { Radio, Users, Stethoscope, AlertCircle, CheckCircle2, Send, X } from "lucide-react";

type Channel = "sms" | "email";
type AudienceType = "doctors" | "patients";

interface BroadcastResult {
  sent: number;
  failed: number;
  total: number;
}

const SPECIALTIES = [
  "Cardiologie", "Dermatologie", "Gynécologie", "Médecine générale",
  "Neurologie", "Ophtalmologie", "Orthopédie", "Pédiatrie",
  "Psychiatrie", "Radiologie", "Urologie",
];

const CITIES = [
  "Tunis", "Sfax", "Sousse", "Kairouan", "Bizerte",
  "Gabès", "Ariana", "Gafsa", "Monastir", "Nabeul",
];

const PLANS = [
  { value: "free", label: "Gratuit" },
  { value: "essentiel", label: "Essentiel" },
  { value: "pro", label: "Pro" },
  { value: "clinique", label: "Clinique" },
];

function ConfirmModal({
  channel,
  audienceType,
  recipientCount,
  message,
  subject,
  onConfirm,
  onCancel,
  loading,
}: {
  channel: Channel;
  audienceType: AudienceType;
  recipientCount: number;
  message: string;
  subject: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-start justify-between p-5 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Confirmer l'envoi</h2>
            <p className="text-sm text-slate-500 mt-0.5">Cette action est irréversible</p>
          </div>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
            <strong>{recipientCount.toLocaleString("fr-FR")} destinataire{recipientCount > 1 ? "s" : ""}</strong> recevront ce{" "}
            {channel === "sms" ? "SMS" : "email"}.
          </div>

          <div className="space-y-1.5 text-sm">
            <div className="flex gap-2">
              <span className="font-medium text-slate-700 w-20 shrink-0">Canal :</span>
              <span className="text-slate-600">{channel === "sms" ? "SMS" : "Email"}</span>
            </div>
            <div className="flex gap-2">
              <span className="font-medium text-slate-700 w-20 shrink-0">Cible :</span>
              <span className="text-slate-600">
                {audienceType === "doctors" ? "Médecins" : "Patients"}
              </span>
            </div>
            {channel === "email" && (
              <div className="flex gap-2">
                <span className="font-medium text-slate-700 w-20 shrink-0">Sujet :</span>
                <span className="text-slate-600 truncate">{subject}</span>
              </div>
            )}
            <div className="flex gap-2">
              <span className="font-medium text-slate-700 w-20 shrink-0">Message :</span>
              <span className="text-slate-600 line-clamp-3">{message}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3 px-5 pb-5">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {loading ? "Envoi en cours…" : "Confirmer l'envoi"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BroadcastPage() {
  const [channel, setChannel] = useState<Channel>("sms");
  const [audienceType, setAudienceType] = useState<AudienceType>("doctors");
  const [specialty, setSpecialty] = useState("");
  const [city, setCity] = useState("");
  const [plan, setPlan] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [showConfirm, setShowConfirm] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<BroadcastResult | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  const fetchPreview = useCallback(async () => {
    setPreviewLoading(true);
    const params = new URLSearchParams({ audienceType });
    if (specialty) params.set("specialty", specialty);
    if (city) params.set("city", city);
    if (plan && audienceType === "doctors") params.set("plan", plan);

    try {
      const res = await fetch(`/api/admin/communications/broadcast?${params.toString()}`);
      if (!res.ok) throw new Error("Erreur");
      const data = await res.json() as { count: number };
      setPreviewCount(data.count);
    } catch {
      setPreviewCount(null);
    } finally {
      setPreviewLoading(false);
    }
  }, [audienceType, specialty, city, plan]);

  useEffect(() => {
    void fetchPreview();
  }, [fetchPreview]);

  async function handleSend() {
    setSending(true);
    setSendError(null);
    setResult(null);
    try {
      const res = await fetch("/api/admin/communications/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel,
          audience: {
            type: audienceType,
            filters: {
              ...(specialty && audienceType === "doctors" ? { specialty } : {}),
              ...(city ? { city } : {}),
              ...(plan && audienceType === "doctors" ? { plan } : {}),
            },
          },
          subject: channel === "email" ? subject : undefined,
          message,
        }),
      });
      if (!res.ok) {
        const json = await res.json() as { error?: string };
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }
      const json = await res.json() as BroadcastResult;
      setResult(json);
      setMessage("");
      setSubject("");
    } catch (e) {
      setSendError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setSending(false);
      setShowConfirm(false);
    }
  }

  const canSend =
    message.trim().length > 0 &&
    (channel === "sms" || subject.trim().length > 0) &&
    (previewCount ?? 0) > 0;

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-lg bg-violet-50 flex items-center justify-center">
            <Radio className="w-5 h-5 text-violet-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Diffusion</h1>
        </div>
        <p className="text-slate-500 ml-12">Envoyer un message groupé à une audience ciblée</p>
      </div>

      {/* Result banner */}
      {result && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-green-800">Diffusion terminée</p>
            <p className="text-sm text-green-700 mt-0.5">
              {result.sent} envoi{result.sent > 1 ? "s" : ""} réussi{result.sent > 1 ? "s" : ""}
              {result.failed > 0 ? ` · ${result.failed} échec${result.failed > 1 ? "s" : ""}` : ""}
              {" "}sur {result.total} destinataire{result.total > 1 ? "s" : ""}
            </p>
          </div>
        </div>
      )}

      {sendError && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{sendError}</p>
        </div>
      )}

      <div className="space-y-6">
        {/* Channel selector */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Canal</h2>
          <div className="flex gap-3">
            {(["sms", "email"] as Channel[]).map((c) => (
              <button
                key={c}
                onClick={() => setChannel(c)}
                className={`flex-1 py-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                  channel === c
                    ? "border-teal-500 bg-teal-50 text-teal-700"
                    : "border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                {c === "sms" ? "SMS" : "Email"}
              </button>
            ))}
          </div>
        </div>

        {/* Audience builder */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Audience</h2>

          {/* Target radio */}
          <div className="flex gap-3 mb-4">
            <label className={`flex-1 flex items-center gap-2 py-2.5 px-3 rounded-lg border-2 cursor-pointer transition-colors ${
              audienceType === "doctors"
                ? "border-teal-500 bg-teal-50"
                : "border-slate-200 hover:border-slate-300"
            }`}>
              <input
                type="radio"
                name="audienceType"
                value="doctors"
                checked={audienceType === "doctors"}
                onChange={() => { setAudienceType("doctors"); setPlan(""); setSpecialty(""); }}
                className="sr-only"
              />
              <Stethoscope className={`w-4 h-4 ${audienceType === "doctors" ? "text-teal-600" : "text-slate-400"}`} />
              <span className={`text-sm font-medium ${audienceType === "doctors" ? "text-teal-700" : "text-slate-600"}`}>
                Médecins
              </span>
            </label>
            <label className={`flex-1 flex items-center gap-2 py-2.5 px-3 rounded-lg border-2 cursor-pointer transition-colors ${
              audienceType === "patients"
                ? "border-teal-500 bg-teal-50"
                : "border-slate-200 hover:border-slate-300"
            }`}>
              <input
                type="radio"
                name="audienceType"
                value="patients"
                checked={audienceType === "patients"}
                onChange={() => { setAudienceType("patients"); setSpecialty(""); setPlan(""); }}
                className="sr-only"
              />
              <Users className={`w-4 h-4 ${audienceType === "patients" ? "text-teal-600" : "text-slate-400"}`} />
              <span className={`text-sm font-medium ${audienceType === "patients" ? "text-teal-700" : "text-slate-600"}`}>
                Patients
              </span>
            </label>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {audienceType === "doctors" && (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Spécialité</label>
                <select
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 text-sm px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">Toutes les spécialités</option>
                  {SPECIALTIES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Ville</label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full rounded-lg border border-slate-200 text-sm px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="">Toutes les villes</option>
                {CITIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {audienceType === "doctors" && (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Plan</label>
                <select
                  value={plan}
                  onChange={(e) => setPlan(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 text-sm px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">Tous les plans</option>
                  {PLANS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Preview count */}
          <div className="mt-4 pt-4 border-t border-slate-100">
            {previewLoading ? (
              <div className="h-5 w-48 bg-slate-100 animate-pulse rounded" />
            ) : (
              <p className="text-sm text-slate-600">
                Ce message sera envoyé à{" "}
                <span className="font-bold text-teal-700">
                  {(previewCount ?? 0).toLocaleString("fr-FR")} destinataire{(previewCount ?? 0) > 1 ? "s" : ""}
                </span>
              </p>
            )}
          </div>
        </div>

        {/* Message composer */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Message</h2>

          {channel === "email" && (
            <div className="mb-3">
              <label className="block text-xs font-medium text-slate-600 mb-1">Sujet</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Objet de l'email…"
                className="w-full rounded-lg border border-slate-200 text-sm px-3 py-2.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              {channel === "sms" ? "Texte du SMS" : "Corps du message"}
              {channel === "email" && (
                <span className="ml-1 text-slate-400 font-normal">(HTML supporté)</span>
              )}
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={channel === "sms" ? 160 : undefined}
              rows={channel === "sms" ? 4 : 8}
              placeholder={channel === "sms" ? "Votre message SMS…" : "Contenu de l'email…"}
              className="w-full rounded-lg border border-slate-200 text-sm px-3 py-2.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-y"
            />
            {channel === "sms" && (
              <div className="flex justify-end mt-1">
                <span className={`text-xs tabular-nums ${message.length > 140 ? "text-amber-600 font-medium" : "text-slate-400"}`}>
                  {message.length} / 160
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Send button */}
        <button
          onClick={() => setShowConfirm(true)}
          disabled={!canSend}
          className="w-full py-3 bg-teal-600 text-white font-semibold rounded-xl hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          <Send className="w-4 h-4" />
          Envoyer à {(previewCount ?? 0).toLocaleString("fr-FR")} destinataire{(previewCount ?? 0) > 1 ? "s" : ""}
        </button>
      </div>

      {showConfirm && (
        <ConfirmModal
          channel={channel}
          audienceType={audienceType}
          recipientCount={previewCount ?? 0}
          message={message}
          subject={subject}
          onConfirm={() => { void handleSend(); }}
          onCancel={() => setShowConfirm(false)}
          loading={sending}
        />
      )}
    </div>
  );
}
