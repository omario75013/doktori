"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Bell as BellIcon, Coffee, Folder, FileText, AlertCircle, Smile, Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

type QuickAction = {
  id: string;
  label: string;
  message: string | null;
  icon: string | null;
};

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  bell: BellIcon,
  coffee: Coffee,
  folder: Folder,
  file: FileText,
  alert: AlertCircle,
  smile: Smile,
};

function Icon({ name }: { name: string | null }) {
  const C = (name && ICONS[name]) || BellIcon;
  return <C className="h-4 w-4" />;
}

export function QuickActionsManager() {
  const t = useTranslations("medecin.quickActions");
  const [list, setList] = useState<QuickAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ label: "", message: "", icon: "bell" });

  async function reload() {
    try {
      const res = await fetch("/api/doctor/quick-actions");
      if (res.ok) setList(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!form.label.trim()) return;
    setAdding(true);
    try {
      const res = await fetch("/api/doctor/quick-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: form.label.trim(),
          message: form.message.trim() || null,
          icon: form.icon,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(t("added"));
      setForm({ label: "", message: "", icon: "bell" });
      await reload();
    } catch {
      toast.error(t("errorToast"));
    } finally {
      setAdding(false);
    }
  }

  async function remove(id: string) {
    await fetch(`/api/doctor/quick-actions/${id}`, { method: "DELETE" });
    setList((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <section className="rounded-2xl border border-border bg-white shadow-sm p-5 space-y-4">
      <div className="flex items-center gap-2">
        <BellIcon className="h-5 w-5 text-primary" />
        <div>
          <h2 className="font-semibold text-foreground">{t("sectionTitle")}</h2>
          <p className="text-xs text-gray-500">
            {t("sectionDesc")}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="py-4 text-center">
          <Loader2 className="h-4 w-4 animate-spin inline text-gray-400" />
        </div>
      ) : list.length === 0 ? (
        <p className="text-xs text-gray-400 italic">{t("noActions")}</p>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {list.map((a) => (
            <li
              key={a.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-secondary/30 px-3 py-2"
            >
              <span className="text-primary">
                <Icon name={a.icon} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{a.label}</p>
                {a.message && (
                  <p className="text-[10px] text-gray-500 truncate">{a.message}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => remove(a.id)}
                className="h-7 w-7 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 flex items-center justify-center"
                title={t("deleteTitle")}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={create} className="rounded-xl bg-gray-50 p-3 grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2">
        <input
          type="text"
          required
          placeholder={t("labelPlaceholder")}
          value={form.label}
          onChange={(e) => setForm({ ...form, label: e.target.value })}
          className="h-9 rounded-lg border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <input
          type="text"
          placeholder={t("messagePlaceholder")}
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          className="h-9 rounded-lg border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <div className="flex gap-2">
          <select
            value={form.icon}
            onChange={(e) => setForm({ ...form, icon: e.target.value })}
            className="h-9 rounded-lg border border-border px-2 text-xs"
          >
            <option value="bell">🔔</option>
            <option value="coffee">☕</option>
            <option value="folder">📁</option>
            <option value="file">📄</option>
            <option value="alert">⚠️</option>
            <option value="smile">🙂</option>
          </select>
          <button
            type="submit"
            disabled={adding || !form.label.trim()}
            className="inline-flex items-center gap-1 h-9 rounded-lg bg-primary px-3 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-60"
          >
            <Plus className="h-3.5 w-3.5" />
            {t("addButton")}
          </button>
        </div>
      </form>
    </section>
  );
}
