"use client";

import { useState, useEffect } from "react";
import { X, MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";

type SMSTemplate = "reminder" | "confirm" | "custom";

type SMSQuota = {
  used: number;
  limit: number;
  remaining: number;
  plan: string;
};

type Props = {
  patientPhone: string;
  patientName: string;
  appointmentId?: string;
  doctorName?: string;
  appointmentDate?: string; // e.g. "18 avril 2026"
  appointmentTime?: string; // e.g. "09:30"
  onClose: () => void;
};

function buildMessage(
  template: SMSTemplate,
  customText: string,
  doctorName: string,
  date: string,
  time: string
): string {
  if (template === "reminder") {
    return `Rappel: votre RDV avec Dr. ${doctorName} est demain à ${time}. Doktori.tn`;
  }
  if (template === "confirm") {
    return `Votre RDV avec Dr. ${doctorName} le ${date} à ${time} est confirmé. Doktori.tn`;
  }
  return customText;
}

export function SMSModal({
  patientPhone,
  patientName,
  appointmentId,
  doctorName = "Médecin",
  appointmentDate = "",
  appointmentTime = "",
  onClose,
}: Props) {
  const [template, setTemplate] = useState<SMSTemplate>("reminder");
  const [customText, setCustomText] = useState("");
  const [sending, setSending] = useState(false);
  const [quota, setQuota] = useState<SMSQuota | null>(null);

  const message = buildMessage(template, customText, doctorName, appointmentDate, appointmentTime);
  const charsLeft = 160 - message.length;

  useEffect(() => {
    fetch("/api/doctor/sms-quota")
      .then((r) => r.json())
      .then((data: SMSQuota) => setQuota(data))
      .catch(() => null);
  }, []);

  async function handleSend() {
    if (template === "custom" && customText.trim().length === 0) {
      toast.error("Veuillez saisir un message.");
      return;
    }
    if (message.length > 160) {
      toast.error("Message trop long (max 160 caractères).");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/doctor/send-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientPhone, message, appointmentId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Erreur lors de l'envoi");
      }
      toast.success(`SMS envoyé à ${patientName}`);
      if (data.remaining !== undefined && data.limit !== undefined) {
        setQuota((prev) =>
          prev
            ? { ...prev, remaining: data.remaining, used: data.limit - data.remaining }
            : prev
        );
      }
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur lors de l'envoi");
    } finally {
      setSending(false);
    }
  }

  const isUnlimited = quota && quota.limit >= 999999;
  const isExhausted = quota && !isUnlimited && quota.remaining === 0;
  const isNearLimit = quota && !isUnlimited && quota.remaining > 0 && quota.remaining <= 40;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white dark:bg-gray-900 shadow-xl p-6 space-y-4 border border-border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <MessageSquare className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Envoyer un SMS</h2>
              <p className="text-xs text-gray-400">{patientName} · {patientPhone}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-secondary hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* SMS Quota pill */}
        {quota && (
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
              isExhausted
                ? "bg-red-100 text-red-700"
                : isNearLimit
                ? "bg-yellow-100 text-yellow-700"
                : "bg-teal-50 text-teal-700"
            }`}
          >
            <MessageSquare className="h-3 w-3" />
            {isUnlimited
              ? "SMS Illimité (Pro)"
              : `${quota.used}/${quota.limit} SMS utilisés`}
          </div>
        )}

        {/* Quota exhausted banner */}
        {isExhausted && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700 space-y-2">
            <p className="font-medium">
              Vous avez épuisé vos {quota.limit} SMS. Passez au plan Pro pour des SMS illimités, ou
              achetez un pack de 50 SMS pour 10 DT.
            </p>
            <div className="flex gap-2">
              <a
                href="/abonnement"
                className="px-2.5 py-1 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition-colors"
              >
                Passer au Pro
              </a>
              <button
                onClick={() =>
                  fetch("/api/doctor/buy-sms-pack", { method: "POST" })
                    .then(() => toast.info("Fonctionnalité bientôt disponible"))
                    .catch(() => null)
                }
                className="px-2.5 py-1 rounded-lg border border-red-300 text-red-700 hover:bg-red-100 transition-colors"
              >
                Acheter 50 SMS
              </button>
            </div>
          </div>
        )}

        {/* Template selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
            Modèle
          </label>
          <div className="flex gap-2">
            {(
              [
                { value: "reminder", label: "Rappel RDV" },
                { value: "confirm", label: "Confirmer RDV" },
                { value: "custom", label: "Libre" },
              ] as const
            ).map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setTemplate(t.value)}
                className={`flex-1 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                  template === t.value
                    ? "bg-blue-600 text-white border-blue-600"
                    : "border-border text-gray-600 hover:bg-secondary"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Message preview / input */}
        <div className="space-y-1">
          <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
            Message
          </label>
          {template === "custom" ? (
            <textarea
              value={customText}
              onChange={(e) => setCustomText(e.target.value.slice(0, 160))}
              placeholder="Votre message…"
              rows={3}
              className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
              autoFocus
            />
          ) : (
            <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2.5 text-sm text-gray-700">
              {message}
            </div>
          )}
          <p
            className={`text-xs text-right ${
              charsLeft < 0 ? "text-red-500" : "text-gray-400"
            }`}
          >
            {message.length}/160 caractères
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-end pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-xl border border-border hover:bg-secondary text-gray-600 dark:text-gray-400 transition-colors"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={sending || !!isExhausted || charsLeft < 0}
            onClick={handleSend}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold disabled:opacity-40 transition-colors"
          >
            <Send className="h-3.5 w-3.5" />
            {sending ? "Envoi…" : "Envoyer"}
          </button>
        </div>
      </div>
    </div>
  );
}
