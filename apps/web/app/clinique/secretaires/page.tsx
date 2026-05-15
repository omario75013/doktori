"use client";

import { useEffect, useState } from "react";
import { formatDoctorName } from "@/lib/format-doctor-name";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UserCog,
  Plus,
  Trash2,
  X,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { useTranslations } from "next-intl";

interface Secretary {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  doctorId: string;
  clinicId: string | null;
  practiceId: string | null;
  doctorName: string | null;
}

interface Doctor {
  id: string;
  name: string;
  specialty: string;
}

interface Practice {
  id: string;
  name: string;
  address: string;
  city: string;
  doctorId: string;
  doctorName: string | null;
}

export default function CliniqueSecretairesPage() {
  useSession();
  const t = useTranslations("clinique.secretaires");

  const [secretaries, setSecretaries] = useState<Secretary[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [allPractices, setAllPractices] = useState<Practice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    doctorId: "",
    practiceId: "",
  });
  const [filteredPractices, setFilteredPractices] = useState<Practice[]>([]);
  const [loadingPractices, setLoadingPractices] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState(false);

  function fetchSecretaries() {
    setLoading(true);
    fetch("/api/clinique/secretaires")
      .then((r) => r.json())
      .then((data: { secretaries?: Secretary[]; error?: string }) => {
        if (data.error) throw new Error(data.error);
        setSecretaries(data.secretaries ?? []);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchSecretaries();
    fetch("/api/clinique/doctors")
      .then((r) => r.json())
      .then((data: { doctors?: Doctor[] }) => setDoctors(data.doctors ?? []))
      .catch(() => {});
    fetch("/api/clinique/practices")
      .then((r) => r.json())
      .then((data: { practices?: Practice[] }) => setAllPractices(data.practices ?? []))
      .catch(() => {});
  }, []);

  // When doctor changes, filter the cabinet list
  async function handleDoctorChange(doctorId: string) {
    setForm((f) => ({ ...f, doctorId, practiceId: "" }));
    if (!doctorId) {
      setFilteredPractices([]);
      return;
    }
    setLoadingPractices(true);
    try {
      const res = await fetch(`/api/clinique/practices?doctorId=${doctorId}`);
      const data = (await res.json()) as { practices?: Practice[] };
      const fp = data.practices ?? [];
      setFilteredPractices(fp);
      // Auto-select if exactly one clinic-scoped practice for this doctor
      if (fp.length === 1) {
        setForm((f) => ({ ...f, doctorId, practiceId: fp[0].id }));
      }
    } catch {
      setFilteredPractices([]);
    } finally {
      setLoadingPractices(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!form.doctorId) {
      setFormError("Veuillez sélectionner un médecin.");
      return;
    }
    if (!form.practiceId) {
      setFormError(t("cabinetHint"));
      return;
    }
    setSubmitting(true);

    try {
      const res = await fetch("/api/clinique/secretaires", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          doctorId: form.doctorId,
          practiceId: form.practiceId,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Erreur inconnue");
      setFormSuccess(true);
      setForm({ name: "", email: "", password: "", doctorId: "", practiceId: "" });
      setFilteredPractices([]);
      fetchSecretaries();
      setTimeout(() => {
        setFormSuccess(false);
        setShowForm(false);
      }, 1500);
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Supprimer la secrétaire ${name} ?`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/clinique/secretaires?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Erreur lors de la suppression");
      setSecretaries((prev) => prev.filter((s) => s.id !== id));
    } catch {
      alert("Impossible de supprimer la secrétaire.");
    } finally {
      setDeletingId(null);
    }
  }

  // Find practice display name for a given practiceId
  function getPracticeName(practiceId: string | null): string | null {
    if (!practiceId) return null;
    const p = allPractices.find((pr) => pr.id === practiceId);
    return p ? `${p.name} – ${p.city}` : null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-start justify-between flex-wrap gap-4"
      >
        <div>
          <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
            <UserCog className="h-6 w-6" style={{ color: "#0891B2" }} strokeWidth={2.5} />
            {t("title")}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {t("subtitle")}
          </p>
        </div>
        <button
          onClick={() => {
            setShowForm(true);
            setFormError(null);
            setFormSuccess(false);
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
          style={{ background: "#0891B2" }}
        >
          <Plus className="h-4 w-4" />
          {t("addButton")}
        </button>
      </motion.div>

      {/* Add secretary form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
            className="bg-white dark:bg-gray-900 rounded-2xl border border-border shadow-sm overflow-hidden"
          >
            <div
              className="flex items-center justify-between px-5 py-4 border-b border-border"
              style={{ background: "#F0FDFA" }}
            >
              <h2 className="font-bold text-foreground flex items-center gap-2">
                <Plus className="h-4 w-4" style={{ color: "#0891B2" }} />
                {t("newTitle")}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Name */}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
                    Nom complet
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Fatma Ben Ali"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="secretaire@clinique.tn"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
                    Mot de passe
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={8}
                      placeholder="Minimum 8 caractères"
                      value={form.password}
                      onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                      className="w-full px-3 py-2 pr-10 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Doctor selector */}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
                    Médecin assigné
                  </label>
                  <select
                    required
                    value={form.doctorId}
                    onChange={(e) => handleDoctorChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                  >
                    <option value="">— Sélectionner un médecin —</option>
                    {doctors.map((d) => (
                      <option key={d.id} value={d.id}>
                        {formatDoctorName(d.name)} – {d.specialty}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Cabinet selector — shown once a doctor is selected */}
                {form.doctorId && (
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
                      {t("cabinet")}
                    </label>
                    {loadingPractices ? (
                      <p className="text-xs text-muted-foreground py-2">{t("selectCabinet")}…</p>
                    ) : filteredPractices.length === 0 ? (
                      <p className="text-xs text-orange-500 py-2">{t("noCabinets")}</p>
                    ) : filteredPractices.length === 1 ? (
                      /* Auto-selected — show as a read-only pill */
                      <div className="px-3 py-2 rounded-xl border border-cyan-200 bg-cyan-50 text-sm font-medium text-cyan-800">
                        {filteredPractices[0].name} – {filteredPractices[0].city}
                      </div>
                    ) : (
                      <select
                        required
                        value={form.practiceId}
                        onChange={(e) => setForm((f) => ({ ...f, practiceId: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                      >
                        <option value="">{t("selectCabinet")}</option>
                        {filteredPractices.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} – {p.city}
                          </option>
                        ))}
                      </select>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">{t("cabinetHint")}</p>
                  </div>
                )}
              </div>

              {formError && (
                <p className="mt-3 text-sm text-red-500 flex items-center gap-1.5">
                  <XCircle className="h-4 w-4 shrink-0" />
                  {formError}
                </p>
              )}

              {formSuccess && (
                <p className="mt-3 text-sm text-emerald-600 flex items-center gap-1.5">
                  <CheckCircle className="h-4 w-4 shrink-0" />
                  Secrétaire créée avec succès
                </p>
              )}

              <div className="mt-5 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting || formSuccess}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-60 transition-opacity hover:opacity-90"
                  style={{ background: "#0891B2" }}
                >
                  {submitting ? "Création…" : "Créer la secrétaire"}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Secretary table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
        className="bg-white dark:bg-gray-900 rounded-2xl border border-border shadow-sm overflow-hidden"
      >
        {loading ? (
          <div className="divide-y divide-border">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 flex items-center gap-4 animate-pulse">
                <div className="h-9 w-9 rounded-full bg-gray-100 dark:bg-gray-700" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-32 bg-gray-100 dark:bg-gray-700 rounded" />
                  <div className="h-3 w-44 bg-gray-100 dark:bg-gray-700 rounded" />
                </div>
                <div className="h-4 w-20 bg-gray-100 dark:bg-gray-700 rounded" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-20 text-red-500 text-sm">Erreur : {error}</div>
        ) : secretaries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <UserCog className="h-10 w-10 mb-3 text-gray-200" strokeWidth={1.5} />
            <p className="font-medium text-sm">Aucune secrétaire</p>
            <p className="text-xs mt-1">Ajoutez votre première secrétaire ci-dessus.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[620px]">
              <thead>
                <tr className="border-b border-border bg-slate-50 dark:bg-gray-800/50">
                  <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                    Secrétaire
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                    Médecin assigné
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                    {t("cabinet")}
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                    Statut
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {secretaries.map((sec, i) => (
                  <motion.tr
                    key={sec.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.04 }}
                    className="hover:bg-slate-50/70 dark:hover:bg-gray-800/40 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black text-white"
                          style={{ background: "#134E4A" }}
                        >
                          {sec.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-foreground">{sec.name}</div>
                          <div className="text-xs text-muted-foreground">{sec.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {sec.doctorName ? (
                        <span>{formatDoctorName(sec.doctorName)}</span>
                      ) : (
                        <span className="italic text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {getPracticeName(sec.practiceId) ?? (
                        <span className="italic text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {sec.isActive ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                          <CheckCircle className="h-3 w-3" />
                          Actif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
                          <XCircle className="h-3 w-3" />
                          Inactif
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(sec.id, sec.name)}
                        disabled={deletingId === sec.id}
                        className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50 ml-auto"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {deletingId === sec.id ? "Suppression…" : "Supprimer"}
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
}
