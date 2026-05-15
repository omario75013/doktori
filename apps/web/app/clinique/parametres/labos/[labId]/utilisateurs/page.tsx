"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import {
  Users,
  Plus,
  Trash2,
  Loader2,
  FlaskConical,
  ScanLine,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Wrench,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

// ─── Types ────────────────────────────────────────────────────────────────────

type LabUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: "admin" | "technician";
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
};

type Lab = {
  id: string;
  name: string;
  kind: "lab" | "radiology";
};

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  role: "admin" | "technician";
};

const EMPTY_FORM: FormState = {
  firstName: "",
  lastName: "",
  email: "",
  role: "technician",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: "admin" | "technician" }) {
  if (role === "admin") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-200">
        <ShieldCheck className="h-3 w-3" />
        Admin
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-cyan-50 text-cyan-700 border border-cyan-200">
      <Wrench className="h-3 w-3" />
      Technicien
    </span>
  );
}

function StatusPill({ active }: { active: boolean }) {
  if (active) {
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

function Initials({ firstName, lastName }: { firstName: string; lastName: string }) {
  const ini = (firstName[0] ?? "") + (lastName[0] ?? "");
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
      {ini.toUpperCase()}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LabUsersPage() {
  const t = useTranslations("clinique.labs.users");
  const params = useParams<{ labId: string }>();
  const labId = params.labId;

  const [lab, setLab] = useState<Lab | null>(null);
  const [users, setUsers] = useState<LabUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [createdPwd, setCreatedPwd] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/clinique/labs/${labId}/users`);
      if (r.ok) {
        const data = await r.json() as { lab: Lab; users: LabUser[] };
        setLab(data.lab);
        setUsers(data.users);
      } else if (r.status === 404) {
        setLab(null);
      }
    } finally {
      setLoading(false);
    }
  }, [labId]);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setForm(EMPTY_FORM);
    setCreatedPwd(null);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setCreatedPwd(null);
    setForm(EMPTY_FORM);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const r = await fetch(`/api/clinique/labs/${labId}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await r.json().catch(() => ({})) as { error?: string; tempPassword?: string };
      if (!r.ok) throw new Error(data.error ?? "Erreur");
      setCreatedPwd(data.tempPassword ?? null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
      setSaving(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(user: LabUser) {
    setTogglingId(user.id);
    try {
      const r = await fetch(`/api/clinique/labs/${labId}/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      if (!r.ok) throw new Error("Erreur");
      toast.success(user.isActive ? t("deactivated") : t("reactivated"));
      await load();
    } catch {
      toast.error("Impossible de modifier cet utilisateur.");
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDelete(user: LabUser) {
    if (!confirm(t("deleteConfirm") + " " + user.firstName + " " + user.lastName + " ?")) return;
    setDeletingId(user.id);
    try {
      const r = await fetch(`/api/clinique/labs/${labId}/users/${user.id}`, { method: "DELETE" });
      if (!r.ok) throw new Error("Erreur");
      toast.success("Utilisateur supprimé");
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
    } catch {
      toast.error("Impossible de supprimer cet utilisateur.");
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" strokeWidth={2} />
      </div>
    );
  }

  if (!lab) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
        <FlaskConical className="h-10 w-10 text-gray-200" />
        <p>Labo introuvable ou accès refusé.</p>
        <Link href="/clinique/parametres/labos" className="text-primary font-semibold hover:underline text-sm">
          Retour aux labos
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-start gap-3">
          <Link
            href="/clinique/parametres/labos"
            className="mt-1 flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-secondary transition-colors shrink-0"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2.5} />
          </Link>
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              {lab.kind === "radiology" ? (
                <ScanLine className="w-5 h-5 text-violet-600" strokeWidth={2.5} />
              ) : (
                <FlaskConical className="w-5 h-5 text-cyan-600" strokeWidth={2.5} />
              )}
              <h1 className="text-2xl font-bold text-foreground">{lab.name}</h1>
              <span
                className={[
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border",
                  lab.kind === "radiology"
                    ? "bg-violet-50 text-violet-700 border-violet-200"
                    : "bg-cyan-50 text-cyan-700 border-cyan-200",
                ].join(" ")}
              >
                {lab.kind === "radiology" ? "Radiologie" : "Labo"}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{t("title")}</p>
          </div>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          {t("addButton")}
        </button>
      </div>

      {/* Table */}
      {users.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-2xl border-2 border-dashed border-border text-muted-foreground">
          <Users className="h-10 w-10 mb-3 text-gray-200" strokeWidth={1.5} />
          <p className="font-medium text-sm">{t("emptyState")}</p>
          <button
            onClick={openCreate}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary/10 text-primary px-4 py-2 text-sm font-semibold hover:bg-primary/20 transition-colors"
          >
            <Plus className="h-4 w-4" />
            {t("addButton")}
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40">
                <th className="text-start px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {t("columns.name")}
                </th>
                <th className="text-start px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground hidden sm:table-cell">
                  {t("columns.email")}
                </th>
                <th className="text-start px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {t("columns.role")}
                </th>
                <th className="text-start px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground hidden md:table-cell">
                  {t("columns.status")}
                </th>
                <th className="text-start px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground hidden lg:table-cell">
                  {t("columns.lastLogin")}
                </th>
                <th className="text-end px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {t("columns.actions")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-secondary/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Initials firstName={user.firstName} lastName={user.lastName} />
                      <span className="font-semibold text-foreground">
                        {user.firstName} {user.lastName}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                    {user.email}
                  </td>
                  <td className="px-4 py-3">
                    <RoleBadge role={user.role} />
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <StatusPill active={user.isActive} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs hidden lg:table-cell">
                    {user.lastLoginAt
                      ? new Date(user.lastLoginAt).toLocaleDateString("fr-FR", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleToggle(user)}
                        disabled={togglingId === user.id}
                        className={[
                          "rounded-lg px-3 py-1.5 text-xs font-semibold border transition-colors disabled:opacity-50",
                          user.isActive
                            ? "border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100"
                            : "border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100",
                        ].join(" ")}
                      >
                        {togglingId === user.id ? (
                          <Loader2 className="h-3 w-3 animate-spin inline" />
                        ) : user.isActive ? (
                          t("deactivate")
                        ) : (
                          t("reactivate")
                        )}
                      </button>
                      <button
                        onClick={() => handleDelete(user)}
                        disabled={deletingId === user.id}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
                      >
                        {deletingId === user.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" strokeWidth={2.5} />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add User Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl flex flex-col max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-5 py-4 shrink-0">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                {t("addButton")}
              </h2>
              <button
                onClick={closeModal}
                className="h-8 w-8 rounded-lg hover:bg-secondary flex items-center justify-center text-muted-foreground"
              >
                ✕
              </button>
            </div>

            {/* Temp password reveal */}
            {createdPwd ? (
              <div className="p-5 space-y-4">
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 space-y-2">
                  <p className="text-sm font-bold text-emerald-800">Utilisateur créé avec succès !</p>
                  <p className="text-xs text-emerald-700">
                    Communiquez ce mot de passe temporaire à l&apos;utilisateur. Il ne sera plus affiché.
                  </p>
                  <div className="mt-2 rounded-lg bg-white border border-emerald-300 px-4 py-3 font-mono text-base font-bold text-emerald-900 select-all">
                    {createdPwd}
                  </div>
                </div>
                <button
                  onClick={closeModal}
                  className="w-full inline-flex items-center justify-center h-11 rounded-xl bg-primary text-white font-bold text-sm hover:opacity-90"
                >
                  Fermer
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreate} className="p-5 space-y-4 overflow-y-auto">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                      {t("form.firstName")} *
                    </label>
                    <input
                      required
                      type="text"
                      value={form.firstName}
                      onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                      className="h-11 w-full rounded-xl border-2 border-border px-3 text-sm outline-none focus:border-primary"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                      {t("form.lastName")} *
                    </label>
                    <input
                      required
                      type="text"
                      value={form.lastName}
                      onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                      className="h-11 w-full rounded-xl border-2 border-border px-3 text-sm outline-none focus:border-primary"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                    {t("form.email")} *
                  </label>
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    className="h-11 w-full rounded-xl border-2 border-border px-3 text-sm outline-none focus:border-primary"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                    {t("form.role")} *
                  </label>
                  <div className="flex gap-2">
                    {(["technician", "admin"] as const).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, role: r }))}
                        className={[
                          "flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all flex items-center justify-center gap-2",
                          form.role === r
                            ? r === "admin"
                              ? "border-violet-400 bg-violet-50 text-violet-700"
                              : "border-cyan-400 bg-cyan-50 text-cyan-700"
                            : "border-border text-muted-foreground hover:bg-secondary",
                        ].join(" ")}
                      >
                        {r === "admin" ? <ShieldCheck className="h-4 w-4" /> : <Wrench className="h-4 w-4" />}
                        {r === "admin" ? t("role.admin") : t("role.technician")}
                      </button>
                    ))}
                  </div>
                </div>
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
            )}
          </div>
        </div>
      )}
    </div>
  );
}
