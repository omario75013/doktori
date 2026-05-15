"use client";

import { useState, useEffect, useCallback } from "react";
import { FlaskConical, Plus, Pencil, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";

const CATEGORIES = [
  "hematologie", "biochimie", "immunologie", "microbiologie",
  "hormonologie", "genetique", "imagerie", "echographie", "autre",
];

type Analysis = {
  id: string;
  code: string;
  name: string;
  category: string | null;
  priceMillimes: number | null;
  durationHours: number | null;
  isActive: boolean;
  createdAt: string;
};

function formatMillimes(m: number | null) {
  if (m === null) return "—";
  return `${(m / 1000).toFixed(2)} DT`;
}

export default function LaboratoireAnalysesPage() {
  const { data: session } = useSession();
  const t = useTranslations("laboratoire.analyses");
  const user = session?.user as { role?: string; labUserRole?: string } | undefined;
  const isAdmin = user?.role === "lab" || user?.labUserRole === "admin";

  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [includeInactive, setIncludeInactive] = useState(false);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Analysis | null>(null);
  const [form, setForm] = useState({ code: "", name: "", category: "", priceMillimes: "", durationHours: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const url = includeInactive ? "/api/laboratoire/analyses?all=1" : "/api/laboratoire/analyses";
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      setAnalyses(data.analyses ?? []);
    }
    setLoading(false);
  }, [includeInactive]);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setEditing(null);
    setForm({ code: "", name: "", category: "", priceMillimes: "", durationHours: "" });
    setError(null);
    setShowModal(true);
  }

  function openEdit(a: Analysis) {
    setEditing(a);
    setForm({
      code: a.code,
      name: a.name,
      category: a.category ?? "",
      priceMillimes: a.priceMillimes !== null ? String(a.priceMillimes) : "",
      durationHours: a.durationHours !== null ? String(a.durationHours) : "",
    });
    setError(null);
    setShowModal(true);
  }

  async function handleSave() {
    setError(null);
    setSaving(true);
    const body = {
      code: form.code.trim(),
      name: form.name.trim(),
      category: form.category.trim() || null,
      priceMillimes: form.priceMillimes ? parseInt(form.priceMillimes, 10) : null,
      durationHours: form.durationHours ? parseInt(form.durationHours, 10) : null,
    };
    const url = editing ? `/api/laboratoire/analyses/${editing.id}` : "/api/laboratoire/analyses";
    const method = editing ? "PATCH" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) {
      setShowModal(false);
      load();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Erreur");
    }
    setSaving(false);
  }

  async function toggleActive(a: Analysis) {
    await fetch(`/api/laboratoire/analyses/${a.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !a.isActive }),
    });
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
          <FlaskConical className="h-6 w-6 text-green-600" strokeWidth={2.5} />
          {t("title")}
        </h1>
        {isAdmin && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white"
            style={{ background: "#16A34A" }}
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            {t("add")}
          </button>
        )}
      </div>

      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(e) => setIncludeInactive(e.target.checked)}
            className="rounded border-border"
          />
          {t("includeInactive")}
        </label>
      </div>

      <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-green-600" />
          </div>
        ) : analyses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <FlaskConical className="h-10 w-10 mb-3 text-gray-200" strokeWidth={1.5} />
            <p className="text-sm">{t("empty")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-gray-50">
                  <th className="text-start px-4 py-3 font-semibold text-muted-foreground">{t("code")}</th>
                  <th className="text-start px-4 py-3 font-semibold text-muted-foreground">{t("name")}</th>
                  <th className="text-start px-4 py-3 font-semibold text-muted-foreground">{t("category")}</th>
                  <th className="text-start px-4 py-3 font-semibold text-muted-foreground">{t("price")}</th>
                  <th className="text-start px-4 py-3 font-semibold text-muted-foreground">{t("duration")}</th>
                  <th className="text-start px-4 py-3 font-semibold text-muted-foreground">{t("status")}</th>
                  {isAdmin && <th className="text-start px-4 py-3 font-semibold text-muted-foreground">{t("actions")}</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {analyses.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-bold text-green-700">{a.code}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{a.name}</td>
                    <td className="px-4 py-3 text-muted-foreground capitalize">{a.category ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatMillimes(a.priceMillimes)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{a.durationHours !== null ? `${a.durationHours}h` : "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${a.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {a.isActive ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        {a.isActive ? t("status") : t("inactive")}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEdit(a)}
                            className="text-xs px-2 py-1 rounded-lg border border-border hover:bg-gray-100 flex items-center gap-1"
                          >
                            <Pencil className="h-3 w-3" />
                            {t("edit")}
                          </button>
                          <button
                            onClick={() => toggleActive(a)}
                            className={`text-xs px-2 py-1 rounded-lg border transition-colors ${a.isActive ? "border-red-200 text-red-600 hover:bg-red-50" : "border-green-200 text-green-700 hover:bg-green-50"}`}
                          >
                            {a.isActive ? t("deactivate") : t("reactivate")}
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-black">{editing ? t("edit") : t("add")}</h2>
            {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1">{t("code")} *</label>
                <input
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm"
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                  placeholder="NFS, GLY…"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">{t("name")} *</label>
                <input
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">{t("category")}</label>
                <select
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm"
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                >
                  <option value="">—</option>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">{t("price")} (millimes)</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm"
                    value={form.priceMillimes}
                    onChange={(e) => setForm((f) => ({ ...f, priceMillimes: e.target.value }))}
                    placeholder="50000 = 50 DT"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">{t("duration")} (h)</label>
                  <input
                    type="number"
                    min="1"
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm"
                    value={form.durationHours}
                    onChange={(e) => setForm((f) => ({ ...f, durationHours: e.target.value }))}
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-xl text-sm font-semibold border border-border hover:bg-gray-50">
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.code.trim() || !form.name.trim()}
                className="px-4 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-50"
                style={{ background: "#16A34A" }}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
