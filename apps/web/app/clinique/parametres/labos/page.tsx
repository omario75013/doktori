"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  FlaskConical,
  ScanLine,
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
  Phone,
  Mail,
  MapPin,
  Building2,
  CheckCircle2,
  XCircle,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

// ─── Types ────────────────────────────────────────────────────────────────────

type InHouseLab = {
  id: string;
  name: string;
  kind: "lab" | "radiology";
  email: string;
  phone: string;
  address: string;
  city: string;
  services: string[];
  verificationStatus: string;
  createdAt: string;
};

type FormState = {
  name: string;
  kind: "lab" | "radiology";
  email: string;
  phone: string;
  address: string;
  city: string;
  services: string[];
};

// ─── Constants ────────────────────────────────────────────────────────────────

const SERVICE_OPTIONS = [
  "analyses_medicales",
  "radiologie",
  "imagerie",
  "echographie",
];

const EMPTY_FORM: FormState = {
  name: "",
  kind: "lab",
  email: "",
  phone: "",
  address: "",
  city: "",
  services: [],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function KindBadge({ kind }: { kind: string }) {
  if (kind === "radiology") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-200">
        <ScanLine className="h-3 w-3" />
        Radiologie
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-cyan-50 text-cyan-700 border border-cyan-200">
      <FlaskConical className="h-3 w-3" />
      Labo
    </span>
  );
}

function StatusPill({ status }: { status: string }) {
  if (status === "verified") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="h-3 w-3" />
        Actif
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500 border border-gray-200">
      <XCircle className="h-3 w-3" />
      Désactivé
    </span>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ParametresLabosPage() {
  const t = useTranslations("clinique.labs");

  const [labsList, setLabsList] = useState<InHouseLab[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLab, setEditingLab] = useState<InHouseLab | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ── Load labs ─────────────────────────────────────────────────────────────
  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/clinique/labs");
      if (r.ok) {
        const data = await r.json() as { labs: InHouseLab[] };
        setLabsList(data.labs);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  // ── Open modal ────────────────────────────────────────────────────────────
  function openCreate() {
    setEditingLab(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(lab: InHouseLab) {
    setEditingLab(lab);
    setForm({
      name: lab.name,
      kind: lab.kind,
      email: lab.email,
      phone: lab.phone,
      address: lab.address,
      city: lab.city,
      services: lab.services,
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingLab(null);
    setForm(EMPTY_FORM);
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingLab) {
        // PATCH existing
        const r = await fetch(`/api/clinique/labs/${editingLab.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name,
            phone: form.phone,
            address: form.address,
            city: form.city,
            services: form.services,
          }),
        });
        if (!r.ok) {
          const d = await r.json().catch(() => ({})) as { error?: string };
          throw new Error(d.error ?? "Erreur");
        }
        toast.success(t("success"));
      } else {
        // POST create
        const r = await fetch("/api/clinique/labs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!r.ok) {
          const d = await r.json().catch(() => ({})) as { error?: string };
          throw new Error(d.error ?? "Erreur");
        }
        toast.success(t("success"));
      }
      closeModal();
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  async function handleDelete(lab: InHouseLab) {
    if (!confirm(t("confirmDelete") + " " + lab.name + " ?")) return;
    setDeletingId(lab.id);
    try {
      const r = await fetch(`/api/clinique/labs/${lab.id}`, { method: "DELETE" });
      if (!r.ok) throw new Error("Erreur");
      toast.success(t("delete") + " ✓");
      setLabsList((prev) => prev.filter((l) => l.id !== lab.id));
    } catch {
      toast.error("Impossible de supprimer ce labo.");
    } finally {
      setDeletingId(null);
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <ScanLine className="w-5 h-5 text-primary" strokeWidth={2.5} />
            <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
          </div>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          {t("addButton")}
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" strokeWidth={2} />
        </div>
      ) : labsList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-2xl border-2 border-dashed border-border text-muted-foreground">
          <ScanLine className="h-10 w-10 mb-3 text-gray-200" strokeWidth={1.5} />
          <p className="font-medium text-sm">{t("empty")}</p>
          <button
            onClick={openCreate}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary/10 text-primary px-4 py-2 text-sm font-semibold hover:bg-primary/20 transition-colors"
          >
            <Plus className="h-4 w-4" />
            {t("addButton")}
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {labsList.map((lab) => (
            <div
              key={lab.id}
              className="bg-white dark:bg-gray-900 rounded-2xl border border-border p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-4 min-w-0">
                {/* Icon */}
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                  style={{ background: lab.kind === "radiology" ? "#7C3AED18" : "#0891B218" }}
                >
                  {lab.kind === "radiology" ? (
                    <ScanLine className="h-5 w-5 text-violet-600" strokeWidth={2.5} />
                  ) : (
                    <FlaskConical className="h-5 w-5 text-cyan-600" strokeWidth={2.5} />
                  )}
                </div>

                {/* Info */}
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-bold text-foreground">{lab.name}</span>
                    <KindBadge kind={lab.kind} />
                    <StatusPill status={lab.verificationStatus} />
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {lab.city}
                    </span>
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {lab.phone}
                    </span>
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {lab.email}
                    </span>
                  </div>
                  {lab.services.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {lab.services.map((s) => (
                        <span key={s} className="text-[10px] px-1.5 py-0.5 bg-secondary rounded-md text-muted-foreground">
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href={`/clinique/parametres/labos/${lab.id}/utilisateurs`}
                  className="flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                  title="Gérer les utilisateurs"
                >
                  <Users className="h-3.5 w-3.5" strokeWidth={2.5} />
                  Utilisateurs
                </Link>
                <button
                  onClick={() => openEdit(lab)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                  title={t("edit")}
                >
                  <Pencil className="h-4 w-4" strokeWidth={2.5} />
                </button>
                <button
                  onClick={() => handleDelete(lab)}
                  disabled={deletingId === lab.id}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
                  title={t("delete")}
                >
                  {deletingId === lab.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
                  ) : (
                    <Trash2 className="h-4 w-4" strokeWidth={2.5} />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-gray-900 shadow-xl flex flex-col max-h-[90vh] overflow-hidden">
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-border px-5 py-4 shrink-0">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <ScanLine className="h-5 w-5 text-primary" />
                {editingLab ? t("edit") : t("addButton")}
              </h2>
              <button
                onClick={closeModal}
                className="h-8 w-8 rounded-lg hover:bg-secondary flex items-center justify-center text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal body */}
            <form onSubmit={handleSave} className="p-5 space-y-4 overflow-y-auto">
              {/* Kind toggle */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                  {t("form.kind")}
                </label>
                <div className="flex gap-2">
                  {(["lab", "radiology"] as const).map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, kind: k }))}
                      className={[
                        "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all",
                        form.kind === k
                          ? k === "radiology"
                            ? "border-violet-400 bg-violet-50 text-violet-700"
                            : "border-cyan-400 bg-cyan-50 text-cyan-700"
                          : "border-border text-muted-foreground hover:bg-secondary",
                      ].join(" ")}
                    >
                      {k === "radiology" ? (
                        <ScanLine className="h-4 w-4" />
                      ) : (
                        <FlaskConical className="h-4 w-4" />
                      )}
                      {t(k === "lab" ? "kind.lab" : "kind.radiology")}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                  {t("form.name")} *
                </label>
                <div className="flex h-11 items-center rounded-xl border-2 border-border px-3 focus-within:border-primary">
                  <Building2 className="mr-2 h-4 w-4 text-muted-foreground" strokeWidth={2} />
                  <input
                    required
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="h-full flex-1 border-0 bg-transparent text-sm text-foreground outline-none"
                  />
                </div>
              </div>

              {/* Email (only for create) */}
              {!editingLab && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                    {t("form.email")} *
                  </label>
                  <div className="flex h-11 items-center rounded-xl border-2 border-border px-3 focus-within:border-primary">
                    <Mail className="mr-2 h-4 w-4 text-muted-foreground" strokeWidth={2} />
                    <input
                      required
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      className="h-full flex-1 border-0 bg-transparent text-sm text-foreground outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Phone */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                  {t("form.phone")} *
                </label>
                <div className="flex h-11 items-center rounded-xl border-2 border-border px-3 focus-within:border-primary">
                  <Phone className="mr-2 h-4 w-4 text-muted-foreground" strokeWidth={2} />
                  <input
                    required
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    className="h-full flex-1 border-0 bg-transparent text-sm text-foreground outline-none"
                  />
                </div>
              </div>

              {/* Address + City */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                    {t("form.address")} *
                  </label>
                  <div className="flex h-11 items-center rounded-xl border-2 border-border px-3 focus-within:border-primary">
                    <MapPin className="mr-2 h-4 w-4 text-muted-foreground" strokeWidth={2} />
                    <input
                      required
                      type="text"
                      value={form.address}
                      onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                      className="h-full flex-1 border-0 bg-transparent text-sm text-foreground outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                    {t("form.city")} *
                  </label>
                  <div className="flex h-11 items-center rounded-xl border-2 border-border px-3 focus-within:border-primary">
                    <MapPin className="mr-2 h-4 w-4 text-muted-foreground" strokeWidth={2} />
                    <input
                      required
                      type="text"
                      value={form.city}
                      onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                      className="h-full flex-1 border-0 bg-transparent text-sm text-foreground outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Services */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                  {t("form.services")}
                </label>
                <div className="flex flex-wrap gap-2">
                  {SERVICE_OPTIONS.map((s) => {
                    const selected = form.services.includes(s);
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            services: selected
                              ? f.services.filter((x) => x !== s)
                              : [...f.services, s],
                          }))
                        }
                        className={[
                          "px-3 py-1.5 rounded-xl border text-xs font-medium transition-all",
                          selected
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:bg-secondary",
                        ].join(" ")}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:opacity-90 disabled:opacity-60 transition-opacity"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />}
                  {t("form.submit")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
