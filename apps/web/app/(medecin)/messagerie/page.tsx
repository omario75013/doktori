"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { MessageCircle, ChevronRight, AlertCircle, X, Pencil } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface Conversation {
  id: string;
  status: string;
  lastMessageAt: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  lastMessagePreview?: string;
  unreadCount?: number;
}

function ConversationSkeleton() {
  return (
    <div className="w-full bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700 p-4 flex items-center gap-4 animate-pulse">
      <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/5" />
        <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-3/5" />
        <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/4" />
      </div>
      <div className="w-5 h-5 bg-gray-100 dark:bg-gray-800 rounded flex-shrink-0" />
    </div>
  );
}

interface DoctorStatus {
  statusMessage: string | null;
  awayMessage: string | null;
  statusActiveUntil: string | null;
  isActive: boolean;
}

function StatusBanner({ status, onEdit }: { status: DoctorStatus; onEdit: () => void }) {
  const t = useTranslations("medecin.messages");
  if (!status.isActive || !status.statusMessage) return null;
  return (
    <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-700 rounded-xl px-4 py-3 mb-4 text-sm">
      <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
      <span className="flex-1 text-amber-800 dark:text-amber-200">
        <span className="font-medium">{t("statusBanner", { status: status.statusMessage })}</span>
        {status.statusActiveUntil && (
          <span className="ml-1 text-amber-600 dark:text-amber-400 text-xs">
            (jusqu&apos;au {new Date(status.statusActiveUntil).toLocaleDateString("fr-TN")})
          </span>
        )}
      </span>
      <button onClick={onEdit} className="text-amber-600 hover:text-amber-800 dark:text-amber-400 flex-shrink-0">
        <Pencil className="w-4 h-4" />
      </button>
    </div>
  );
}

function StatusModal({ status, onClose, onSaved }: { status: DoctorStatus | null; onClose: () => void; onSaved: (s: DoctorStatus) => void }) {
  const t = useTranslations("medecin.messages");
  const [msg, setMsg] = useState(status?.statusMessage ?? "");
  const [away, setAway] = useState(status?.awayMessage ?? "");
  const [until, setUntil] = useState(status?.statusActiveUntil ? status.statusActiveUntil.slice(0, 10) : "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await fetch("/api/doctor/status", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        statusMessage: msg || null,
        awayMessage: away || null,
        statusActiveUntil: until ? new Date(until).toISOString() : null,
      }),
    });
    setSaving(false);
    onSaved({
      statusMessage: msg || null,
      awayMessage: away || null,
      statusActiveUntil: until ? new Date(until).toISOString() : null,
      isActive: !!msg,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t("statusMessage")}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("statusMessage")}</label>
        <input
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          placeholder="Ex: En congé jusqu'au 5 mai"
          className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("awayMessage")}</label>
        <textarea
          value={away}
          onChange={(e) => setAway(e.target.value)}
          rows={3}
          placeholder="Réponse automatique envoyée aux patients..."
          className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
        />
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("statusUntil")}</label>
        <input
          type="date"
          value={until}
          onChange={(e) => setUntil(e.target.value)}
          className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
        <div className="flex gap-2">
          <button
            onClick={() => { setMsg(""); setAway(""); setUntil(""); }}
            className="flex-1 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            {t("clearStatus")}
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex-1 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 disabled:opacity-50"
          >
            {saving ? "…" : t("editStatus")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DoctorMessageriePage() {
  const t = useTranslations("medecin.messages");
  const tNav = useTranslations("medecin.nav");
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [doctorStatus, setDoctorStatus] = useState<DoctorStatus | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);

  useEffect(() => {
    fetch("/api/doctor/conversations")
      .then((r) => {
        if (!r.ok) throw new Error(t("loadError"));
        return r.json();
      })
      .then((data) => {
        setConversations(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });

    fetch("/api/doctor/status")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) setDoctorStatus(data as DoctorStatus); })
      .catch(() => {});
  }, []);

  return (
    <div className="w-full">
      {showStatusModal && (
        <StatusModal
          status={doctorStatus}
          onClose={() => setShowStatusModal(false)}
          onSaved={(s) => { setDoctorStatus(s); setShowStatusModal(false); }}
        />
      )}
      {doctorStatus && <StatusBanner status={doctorStatus} onEdit={() => setShowStatusModal(true)} />}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-teal-100 rounded-lg">
          <MessageCircle className="w-6 h-6 text-teal-700" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{tNav("messagerie")}</h1>
      </div>

      {loading ? (
        <div className="space-y-2">
          <ConversationSkeleton />
          <ConversationSkeleton />
          <ConversationSkeleton />
        </div>
      ) : error ? (
        <p className="text-red-500 text-center py-12">{error}</p>
      ) : conversations.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700">
          <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">{t("noConversations")}</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            {t("noConversationsDesc")}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {conversations.map((conv) => {
            const initials = conv.patientName
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2);
            const hasUnread = typeof conv.unreadCount === "number" && conv.unreadCount > 0;
            return (
              <button
                key={conv.id}
                onClick={() => router.push(`/messagerie/${conv.id}`)}
                className="w-full text-left bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700 p-4 flex items-center gap-4 hover:border-teal-200 dark:hover:border-teal-700 hover:shadow-sm transition-all"
              >
                <div className="relative flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-foreground flex items-center justify-center text-white font-semibold">
                    {initials}
                  </div>
                  {hasUnread && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-[#0891B2] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
                      {conv.unreadCount! > 99 ? "99+" : conv.unreadCount}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold truncate ${hasUnread ? "text-gray-900 dark:text-white" : "text-gray-700 dark:text-gray-300"}`}>
                    {conv.patientName}
                  </p>
                  {conv.lastMessagePreview ? (
                    <p className={`text-sm truncate mt-0.5 ${hasUnread ? "text-gray-700 dark:text-gray-300 font-medium" : "text-gray-400 dark:text-gray-500"}`}>
                      {conv.lastMessagePreview}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-400 dark:text-gray-500 truncate mt-0.5">{conv.patientPhone}</p>
                  )}
                  {conv.lastMessageAt && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      {formatDistanceToNow(new Date(conv.lastMessageAt), {
                        addSuffix: true,
                        locale: fr,
                      })}
                    </p>
                  )}
                </div>
                {conv.status === "archived" && (
                  <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full flex-shrink-0">
                    {t("archived")}
                  </span>
                )}
                <ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
