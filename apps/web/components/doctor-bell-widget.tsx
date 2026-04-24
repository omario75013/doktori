"use client";

import { useEffect, useState } from "react";
import { Bell as BellIcon, Plus, X, Coffee, FileText, Folder, AlertCircle, Smile } from "lucide-react";
import { toast } from "sonner";

type QuickAction = {
  id: string;
  label: string;
  message: string | null;
  icon: string | null;
};

type Secretary = {
  id: string;
  name: string;
};

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  bell: BellIcon,
  coffee: Coffee,
  folder: Folder,
  file: FileText,
  alert: AlertCircle,
  smile: Smile,
};

function IconFromName({ name }: { name: string | null }) {
  const C = (name && ICON_MAP[name]) || BellIcon;
  return <C className="h-4 w-4" />;
}

export function DoctorBellWidget() {
  const [open, setOpen] = useState(false);
  const [actions, setActions] = useState<QuickAction[]>([]);
  const [secretaries, setSecretaries] = useState<Secretary[]>([]);
  const [targetId, setTargetId] = useState<string>("");
  const [customLabel, setCustomLabel] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [customIcon, setCustomIcon] = useState("bell");
  const [sending, setSending] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const [a, b] = await Promise.all([
        fetch("/api/doctor/quick-actions"),
        fetch("/api/secretaries"),
      ]);
      if (a.ok) setActions(await a.json());
      if (b.ok) {
        const rows = await b.json();
        setSecretaries(rows.filter((s: { isActive: boolean }) => s.isActive));
      }
    })();
  }, [open]);

  async function sendBell(action: { label: string; message: string | null; icon: string | null }) {
    setSending(action.label);
    try {
      const res = await fetch("/api/doctor/bells", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: action.label,
          message: action.message,
          icon: action.icon,
          secretaryId: targetId || null,
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? "Erreur");
      }
      toast.success("Notification envoyée");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSending(null);
    }
  }

  async function sendCustom(e: React.FormEvent) {
    e.preventDefault();
    if (!customLabel.trim()) return;
    await sendBell({
      label: customLabel.trim(),
      message: customMessage.trim() || null,
      icon: customIcon,
    });
    if (saveAsTemplate) {
      try {
        await fetch("/api/doctor/quick-actions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            label: customLabel.trim(),
            message: customMessage.trim() || null,
            icon: customIcon,
          }),
        });
        const res = await fetch("/api/doctor/quick-actions");
        if (res.ok) setActions(await res.json());
        toast.success("Action rapide enregistrée");
      } catch {
        /* ignore */
      }
    }
    setCustomLabel("");
    setCustomMessage("");
  }

  async function deleteAction(id: string) {
    await fetch(`/api/doctor/quick-actions/${id}`, { method: "DELETE" });
    setActions((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Notifier la secrétaire"
        className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full bg-primary text-white shadow-lg hover:scale-105 transition-transform flex items-center justify-center"
      >
        <BellIcon className="h-6 w-6" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-border px-5 py-3 flex items-center justify-between">
              <h2 className="font-semibold flex items-center gap-2">
                <BellIcon className="h-4 w-4 text-primary" /> Notifier la secrétaire
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="h-8 w-8 rounded-lg text-gray-400 hover:bg-secondary flex items-center justify-center"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Target picker */}
              {secretaries.length > 0 && (
                <label className="block space-y-1">
                  <span className="text-xs font-medium text-gray-600">Destinataire</span>
                  <select
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                    className="w-full h-10 rounded-xl border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Toutes les secrétaires actives</option>
                    {secretaries.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {/* Quick actions */}
              {actions.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-2">Actions rapides</p>
                  <div className="grid grid-cols-2 gap-2">
                    {actions.map((a) => (
                      <div key={a.id} className="relative">
                        <button
                          type="button"
                          onClick={() => sendBell(a)}
                          disabled={sending === a.label}
                          className="w-full inline-flex items-center gap-2 rounded-xl border border-border bg-white px-3 py-2 text-sm font-medium hover:bg-secondary disabled:opacity-60"
                        >
                          <IconFromName name={a.icon} />
                          <span className="truncate flex-1 text-left">{a.label}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteAction(a.id)}
                          title="Supprimer"
                          className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-white border border-border text-gray-400 hover:text-red-500 flex items-center justify-center text-[10px]"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom */}
              <form onSubmit={sendCustom} className="rounded-xl bg-secondary/40 p-3 space-y-2">
                <p className="text-xs font-semibold text-gray-600 flex items-center gap-1">
                  <Plus className="h-3 w-3" /> Notification personnalisée
                </p>
                <input
                  type="text"
                  required
                  value={customLabel}
                  onChange={(e) => setCustomLabel(e.target.value)}
                  placeholder="Ex : Veuillez m'apporter le dossier de Mr Dupont"
                  className="w-full h-9 rounded-lg border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                />
                <textarea
                  rows={2}
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Message (facultatif)"
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none bg-white"
                />
                <div className="flex items-center gap-2">
                  <select
                    value={customIcon}
                    onChange={(e) => setCustomIcon(e.target.value)}
                    className="h-9 rounded-lg border border-border px-2 text-xs bg-white"
                  >
                    <option value="bell">🔔 Cloche</option>
                    <option value="folder">📁 Dossier</option>
                    <option value="file">📄 Fichier</option>
                    <option value="coffee">☕ Café</option>
                    <option value="alert">⚠️ Alerte</option>
                    <option value="smile">🙂 Patient</option>
                  </select>
                  <label className="text-xs text-gray-600 flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={saveAsTemplate}
                      onChange={(e) => setSaveAsTemplate(e.target.checked)}
                    />
                    Sauver comme action rapide
                  </label>
                  <button
                    type="submit"
                    disabled={!customLabel.trim() || sending !== null}
                    className="ml-auto rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-60"
                  >
                    Envoyer
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
