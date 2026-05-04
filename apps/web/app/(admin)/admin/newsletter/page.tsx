"use client";

import { useEffect, useState, useCallback } from "react";
import { Mail, Plus, Send, Loader2, Calendar, Check } from "lucide-react";

interface Issue {
  id: string;
  titleFr: string;
  titleAr: string | null;
  contentHtmlFr: string;
  contentHtmlAr: string | null;
  scheduledAt: string | null;
  sentAt: string | null;
  recipientCount: number;
  createdAt: string;
}

export default function AdminNewsletterPage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [titleFr, setTitleFr] = useState("");
  const [titleAr, setTitleAr] = useState("");
  const [contentHtmlFr, setContentHtmlFr] = useState("");
  const [contentHtmlAr, setContentHtmlAr] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sending, setSending] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/newsletter/issues");
      if (res.ok) {
        const data = await res.json();
        setIssues(data.issues ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        titleFr: titleFr.trim(),
        contentHtmlFr: contentHtmlFr.trim(),
      };
      if (titleAr.trim()) body.titleAr = titleAr.trim();
      if (contentHtmlAr.trim()) body.contentHtmlAr = contentHtmlAr.trim();
      if (scheduledAt) body.scheduledAt = new Date(scheduledAt).toISOString();

      const res = await fetch("/api/admin/newsletter/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setShowForm(false);
        setTitleFr("");
        setTitleAr("");
        setContentHtmlFr("");
        setContentHtmlAr("");
        setScheduledAt("");
        await refresh();
      } else {
        alert("Erreur lors de la création");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSendNow(id: string) {
    if (!confirm("Envoyer ce numéro à tous les abonnés confirmés ?")) return;
    setSending(id);
    try {
      const res = await fetch(`/api/admin/newsletter/issues/${id}/send-now`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        alert(`Envoi terminé : ${data.successCount}/${data.recipientCount} envoyés`);
        await refresh();
      } else {
        alert("Échec de l'envoi");
      }
    } finally {
      setSending(null);
    }
  }

  return (
    <div className="p-4 sm:p-8 max-w-[1400px] mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Mail className="w-8 h-8 text-teal-600" />
            Newsletter
          </h1>
          <p className="text-slate-500 mt-1">Créer et envoyer les numéros de la newsletter aux abonnés</p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="inline-flex items-center gap-2 bg-teal-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-teal-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nouveau numéro
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-semibold">Nouveau numéro</h2>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Titre (FR) *</label>
            <input
              type="text"
              required
              value={titleFr}
              onChange={(e) => setTitleFr(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Titre (AR)</label>
            <input
              type="text"
              value={titleAr}
              onChange={(e) => setTitleAr(e.target.value)}
              dir="rtl"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Contenu HTML (FR) *</label>
            <textarea
              required
              rows={10}
              value={contentHtmlFr}
              onChange={(e) => setContentHtmlFr(e.target.value)}
              placeholder="<h2>Titre</h2><p>Contenu...</p>"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Contenu HTML (AR)</label>
            <textarea
              rows={6}
              value={contentHtmlAr}
              onChange={(e) => setContentHtmlAr(e.target.value)}
              dir="rtl"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Date d&apos;envoi programmée (optionnelle)
            </label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <p className="text-xs text-slate-500 mt-1">
              Si renseigné, le cron <code>send-scheduled</code> enverra automatiquement à la date prévue.
            </p>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 bg-teal-600 text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-teal-700 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Enregistrer
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold">Numéros</h2>
        </div>
        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin mx-auto" />
          </div>
        ) : issues.length === 0 ? (
          <div className="p-12 text-center text-slate-500">Aucun numéro pour le moment.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3 text-left">Titre</th>
                <th className="px-4 py-3 text-left">Programmé</th>
                <th className="px-4 py-3 text-left">Envoyé</th>
                <th className="px-4 py-3 text-left">Destinataires</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {issues.map((issue) => (
                <tr key={issue.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3 font-medium text-slate-900">{issue.titleFr}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {issue.scheduledAt ? (
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(issue.scheduledAt).toLocaleString("fr-TN")}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {issue.sentAt ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700">
                        <Check className="w-3.5 h-3.5" />
                        {new Date(issue.sentAt).toLocaleString("fr-TN")}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{issue.recipientCount}</td>
                  <td className="px-4 py-3 text-right">
                    {!issue.sentAt && (
                      <button
                        onClick={() => handleSendNow(issue.id)}
                        disabled={sending === issue.id}
                        className="inline-flex items-center gap-1.5 bg-teal-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-teal-700 disabled:opacity-50"
                      >
                        {sending === issue.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        Envoyer
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
