"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Users, Search, UserPlus, X, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

type PatientRow = {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  dateOfBirth?: string | null;
  total_visits: number;
  last_visit: string;
};

const PAGE_SIZE = 20;

function useDebounced(value: string, delay: number): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// ─── Add Patient Modal ────────────────────────────────────────────────────────

function AddPatientModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: (patient: PatientRow) => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/secretaire/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          dateOfBirth: dateOfBirth || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur lors de la création");
      if (data.linked) {
        toast.success("Patient existant retrouvé et lié.");
      } else {
        toast.success("Patient créé avec succès.");
      }
      onSuccess({
        id: data.id,
        name: data.name,
        phone: data.phone,
        email: data.email ?? null,
        dateOfBirth: data.dateOfBirth ?? null,
        total_visits: 0,
        last_visit: new Date().toISOString(),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white shadow-xl p-6 space-y-4 border border-border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Ajouter un patient</h2>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-secondary hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
              Nom complet <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Ex : Ahmed Ben Salah"
              className="w-full h-11 rounded-xl border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
              Téléphone <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              placeholder="Ex : 21234567"
              className="w-full h-11 rounded-xl border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
              Email <span className="text-gray-300 font-normal normal-case">(optionnel)</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="patient@email.com"
              className="w-full h-11 rounded-xl border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
              Date de naissance <span className="text-gray-300 font-normal normal-case">(optionnel)</span>
            </label>
            <input
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className="w-full h-11 rounded-xl border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2 justify-end pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-xl border border-border hover:bg-secondary text-gray-600 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm rounded-xl text-white font-bold disabled:opacity-40 transition-colors"
              style={{ background: "#0891B2" }}
            >
              {submitting ? "Création…" : "Ajouter"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SecretairePatientsPage() {
  const [patientList, setPatientList] = useState<PatientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const debouncedQuery = useDebounced(query, 200);

  useEffect(() => {
    fetch("/api/secretaire/patients")
      .then((r) => r.json())
      .then((data: PatientRow[]) => setPatientList(Array.isArray(data) ? data : []))
      .catch(() => setError("Erreur lors du chargement"))
      .finally(() => setLoading(false));
  }, []);

  const normalizedQuery = debouncedQuery.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!normalizedQuery) return patientList;
    return patientList.filter(
      (p) =>
        p.name.toLowerCase().includes(normalizedQuery) ||
        p.phone.replace(/\s/g, "").includes(normalizedQuery.replace(/\s/g, ""))
    );
  }, [patientList, normalizedQuery]);

  const prevQuery = useRef(normalizedQuery);
  if (prevQuery.current !== normalizedQuery) {
    prevQuery.current = normalizedQuery;
    if (page !== 1) setPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function handlePatientCreated(newPatient: PatientRow) {
    setPatientList((prev) => {
      if (prev.find((p) => p.id === newPatient.id)) return prev;
      return [newPatient, ...prev];
    });
    setShowAddModal(false);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-8 w-32 bg-gray-200 rounded animate-pulse" />
          <div className="h-9 w-40 bg-gray-200 rounded-xl animate-pulse" />
        </div>
        <div className="h-10 w-full bg-gray-100 rounded-2xl animate-pulse" />
        <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="border-b border-border px-4 py-3 grid grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="h-4 rounded bg-gray-100 animate-pulse" />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return <p className="text-red-500 text-sm p-6">{error}</p>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="h-10 w-10 rounded-xl flex items-center justify-center"
            style={{ background: "#F0FDFA" }}
          >
            <Users className="h-5 w-5" style={{ color: "#0891B2" }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Patients</h1>
            <p className="text-sm text-muted-foreground">
              {patientList.length} patient{patientList.length !== 1 ? "s" : ""} suivis
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium transition-colors shadow-sm"
          style={{ background: "#0891B2" }}
        >
          <UserPlus className="h-4 w-4" />
          Ajouter un patient
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher par nom ou téléphone…"
          className="w-full pl-9 pr-4 py-2.5 text-sm rounded-2xl border border-border bg-white shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 transition"
        />
      </div>

      {patientList.length === 0 ? (
        <div className="rounded-2xl border border-border bg-white p-12 text-center shadow-sm">
          <Users className="h-10 w-10 text-gray-200 mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-foreground font-medium mb-1">Aucun patient pour le moment</p>
          <p className="text-sm text-gray-400 mb-4">
            Les patients apparaîtront ici après leurs premiers rendez-vous.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium"
            style={{ background: "#0891B2" }}
          >
            <UserPlus className="h-4 w-4" />
            Ajouter un premier patient
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-white p-12 text-center shadow-sm">
          <Users className="h-10 w-10 text-gray-200 mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-foreground font-medium">Aucun patient trouvé</p>
          <p className="text-sm text-gray-400">Essayez un autre nom ou numéro de téléphone.</p>
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-border bg-white shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-gray-50 text-left">
                  <th className="px-4 py-3 font-medium text-foreground">Patient</th>
                  <th className="px-4 py-3 font-medium text-foreground">Téléphone</th>
                  <th className="px-4 py-3 font-medium text-foreground">Visites</th>
                  <th className="px-4 py-3 font-medium text-foreground">Dernière visite</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginated.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{p.name}</div>
                      {p.email && (
                        <div className="text-xs text-muted-foreground">{p.email}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{p.phone}</td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center justify-center h-6 w-6 rounded-full text-white text-xs font-bold"
                        style={{ background: "#0891B2" }}
                      >
                        {p.total_visits}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {p.last_visit && p.total_visits > 0
                        ? format(new Date(p.last_visit), "d MMM yyyy", { locale: fr })
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-1">
              <p className="text-sm text-muted-foreground">
                Page {safePage} sur {totalPages} — {filtered.length} patient{filtered.length !== 1 ? "s" : ""}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-xl border border-border bg-white text-foreground hover:bg-secondary transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Précédent
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-xl border border-border bg-white text-foreground hover:bg-secondary transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Suivant
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Add patient modal */}
      {showAddModal && (
        <AddPatientModal
          onClose={() => setShowAddModal(false)}
          onSuccess={handlePatientCreated}
        />
      )}
    </div>
  );
}
