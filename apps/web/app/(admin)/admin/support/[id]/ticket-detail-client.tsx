"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send, Lock } from "lucide-react";
import { toast } from "sonner";

type Message = {
  id: string;
  authorType: string;
  body: string;
  isInternal: boolean;
  createdAt: string;
};

const STATUSES = ["open", "in_progress", "waiting_user", "resolved", "closed"] as const;
const PRIORITIES = ["low", "normal", "high", "urgent"] as const;

export function TicketDetailClient({
  ticket,
  initialMessages,
}: {
  ticket: { id: string; status: string; priority: string };
  initialMessages: Message[];
}) {
  const router = useRouter();
  const [status, setStatus] = useState(ticket.status);
  const [priority, setPriority] = useState(ticket.priority);
  const [reply, setReply] = useState("");
  const [internal, setInternal] = useState(false);
  const [sending, setSending] = useState(false);
  const [, startTransition] = useTransition();

  async function patch(body: Record<string, unknown>) {
    const r = await fetch(`/api/admin/support/${ticket.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      toast.error("Échec");
      return false;
    }
    return true;
  }

  async function sendReply() {
    if (!reply.trim()) return;
    setSending(true);
    const ok = await patch({ replyBody: reply, internal });
    setSending(false);
    if (ok) {
      setReply("");
      setInternal(false);
      toast.success(internal ? "Note interne ajoutée" : "Réponse envoyée");
      startTransition(() => router.refresh());
    }
  }

  async function changeStatus(next: string) {
    setStatus(next);
    if (await patch({ status: next })) {
      toast.success("Statut mis à jour");
      startTransition(() => router.refresh());
    }
  }

  async function changePriority(next: string) {
    setPriority(next);
    if (await patch({ priority: next })) {
      toast.success("Priorité mise à jour");
      startTransition(() => router.refresh());
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div>
          <div className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">Statut</div>
          <select
            value={status}
            onChange={(e) => changeStatus(e.target.value)}
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">Priorité</div>
          <select
            value={priority}
            onChange={(e) => changePriority(e.target.value)}
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm"
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-3">
        {initialMessages.map((m) => {
          const isAdmin = m.authorType === "admin";
          return (
            <div
              key={m.id}
              className={`rounded-xl border p-4 ${
                m.isInternal
                  ? "border-amber-200 bg-amber-50"
                  : isAdmin
                  ? "border-indigo-200 bg-indigo-50"
                  : "border-slate-200 bg-white"
              }`}
            >
              <div className="flex items-center gap-2 mb-2 text-xs">
                <span className="font-semibold text-slate-900">
                  {isAdmin ? "Admin" : m.authorType}
                </span>
                {m.isInternal && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-200 text-amber-800 text-[10px] font-bold">
                    <Lock className="w-3 h-3" />
                    Interne
                  </span>
                )}
                <span className="text-slate-400 ml-auto">
                  {new Date(m.createdAt).toLocaleString("fr-FR")}
                </span>
              </div>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{m.body}</p>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <textarea
          rows={4}
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="Votre réponse…"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
        <div className="flex items-center justify-between">
          <label className="inline-flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={internal}
              onChange={(e) => setInternal(e.target.checked)}
            />
            Note interne (non visible par l&apos;utilisateur)
          </label>
          <button
            onClick={sendReply}
            disabled={sending || !reply.trim()}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            {sending ? "Envoi…" : "Envoyer"}
          </button>
        </div>
      </div>
    </div>
  );
}
