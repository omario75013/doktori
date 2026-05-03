"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Search, Users, ChevronLeft, ChevronRight, UserPlus, X, Columns3, Check, SlidersHorizontal, RotateCcw } from "lucide-react";
import { toast } from "sonner";

type PatientRow = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  date_of_birth: string | null;
  gender: string | null;
  blood_type: string | null;
  cin: string | null;
  cnam_number: string | null;
  insurance_provider: string | null;
  occupation: string | null;
  total_visits: number;
  last_visit: string;
};

type ColumnKey =
  | "email"
  | "date_of_birth"
  | "gender"
  | "blood_type"
  | "cin"
  | "cnam_number"
  | "insurance_provider"
  | "occupation"
  | "total_visits"
  | "last_visit";

const COLUMN_LABELS: Record<ColumnKey, string> = {
  email: "Email",
  date_of_birth: "Naissance",
  gender: "Sexe",
  blood_type: "Groupe sanguin",
  cin: "CIN",
  cnam_number: "N° CNAM",
  insurance_provider: "Assurance",
  occupation: "Profession",
  total_visits: "Visites",
  last_visit: "Dernière visite",
};

const ALL_COLUMNS: ColumnKey[] = [
  "total_visits",
  "last_visit",
  "email",
  "date_of_birth",
  "gender",
  "blood_type",
  "cin",
  "cnam_number",
  "insurance_provider",
  "occupation",
];

const DEFAULT_COLUMNS: ColumnKey[] = ["total_visits", "last_visit"];
const COLUMNS_STORAGE_KEY = "doktori_patients_columns";

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

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
      const res = await fetch("/api/doctor/patients", {
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
      if (!res.ok) {
        throw new Error(data.error ?? "Erreur lors de la création");
      }
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
        date_of_birth: null,
        gender: null,
        blood_type: null,
        cin: null,
        cnam_number: null,
        insurance_provider: null,
        occupation: null,
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
        className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 shadow-xl p-6 space-y-4 border border-border"
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
              className="w-full h-11 rounded-xl border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-gray-800"
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
              className="w-full h-11 rounded-xl border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-gray-800"
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
              className="w-full h-11 rounded-xl border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-gray-800"
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
              className="w-full h-11 rounded-xl border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-gray-800"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2 justify-end pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-xl border border-border hover:bg-secondary text-gray-600 dark:text-gray-400 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm rounded-xl bg-primary hover:bg-doktori-teal-dark text-white font-bold disabled:opacity-40 transition-colors"
            >
              {submitting ? "Création…" : "Ajouter"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Filter field wrapper ─────────────────────────────────────────────────────
function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-gray-600 dark:text-gray-400">{label}</label>
      {children}
    </div>
  );
}

// ─── Main patients client ─────────────────────────────────────────────────────

type AdvancedFilters = {
  email: string;
  cin: string;
  cnam: string;
  gender: "" | "male" | "female";
  bloodType: string;
  insurance: string;
  occupation: string;
  ageMin: string;
  ageMax: string;
  visitsMin: string;
  visitsMax: string;
  lastVisitFrom: string;
  lastVisitTo: string;
};

const EMPTY_FILTERS: AdvancedFilters = {
  email: "", cin: "", cnam: "", gender: "", bloodType: "", insurance: "",
  occupation: "", ageMin: "", ageMax: "", visitsMin: "", visitsMax: "",
  lastVisitFrom: "", lastVisitTo: "",
};

function computeAge(dob: string | null): number | null {
  if (!dob) return null;
  const birthDate = new Date(dob);
  if (isNaN(birthDate.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birthDate.getFullYear();
  const m = now.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birthDate.getDate())) age--;
  return age;
}

export function PatientsClient({ patients }: { patients: PatientRow[] }) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(20);
  const [patientList, setPatientList] = useState<PatientRow[]>(patients);
  const [showAddModal, setShowAddModal] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<ColumnKey[]>(DEFAULT_COLUMNS);
  const [columnsMenuOpen, setColumnsMenuOpen] = useState(false);
  const [advFiltersOpen, setAdvFiltersOpen] = useState(false);
  const [advFilters, setAdvFilters] = useState<AdvancedFilters>(EMPTY_FILTERS);
  const columnsMenuRef = useRef<HTMLDivElement>(null);
  const debouncedQuery = useDebounced(query, 200);

  const activeFiltersCount = Object.values(advFilters).filter((v) => v !== "").length;

  function updateFilter<K extends keyof AdvancedFilters>(key: K, value: AdvancedFilters[K]) {
    setAdvFilters((prev) => ({ ...prev, [key]: value }));
  }
  function resetFilters() {
    setAdvFilters(EMPTY_FILTERS);
    setQuery("");
  }

  useEffect(() => {
    try {
      const stored = localStorage.getItem(COLUMNS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as string[];
        const valid = parsed.filter((k): k is ColumnKey =>
          (ALL_COLUMNS as string[]).includes(k)
        );
        if (valid.length > 0) setVisibleColumns(valid);
      }
    } catch {
      /* bad JSON — ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(COLUMNS_STORAGE_KEY, JSON.stringify(visibleColumns));
    } catch {
      /* storage disabled */
    }
  }, [visibleColumns]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (columnsMenuRef.current && !columnsMenuRef.current.contains(e.target as Node)) {
        setColumnsMenuOpen(false);
      }
    }
    if (columnsMenuOpen) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [columnsMenuOpen]);

  function toggleColumn(col: ColumnKey) {
    setVisibleColumns((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    );
  }

  const normalizedQuery = debouncedQuery.trim().toLowerCase();

  const filtered = useMemo(() => {
    return patientList.filter((p) => {
      // Quick search (name + phone)
      if (normalizedQuery) {
        const matchQuick =
          p.name.toLowerCase().includes(normalizedQuery) ||
          p.phone.replace(/\s/g, "").includes(normalizedQuery.replace(/\s/g, ""));
        if (!matchQuick) return false;
      }
      // Advanced filters
      const f = advFilters;
      if (f.email && !(p.email ?? "").toLowerCase().includes(f.email.toLowerCase())) return false;
      if (f.cin && !(p.cin ?? "").toLowerCase().includes(f.cin.toLowerCase())) return false;
      if (f.cnam && !(p.cnam_number ?? "").toLowerCase().includes(f.cnam.toLowerCase())) return false;
      if (f.gender && p.gender !== f.gender) return false;
      if (f.bloodType && p.blood_type !== f.bloodType) return false;
      if (f.insurance && !(p.insurance_provider ?? "").toLowerCase().includes(f.insurance.toLowerCase())) return false;
      if (f.occupation && !(p.occupation ?? "").toLowerCase().includes(f.occupation.toLowerCase())) return false;
      if (f.ageMin || f.ageMax) {
        const age = computeAge(p.date_of_birth);
        if (age === null) return false;
        if (f.ageMin && age < parseInt(f.ageMin, 10)) return false;
        if (f.ageMax && age > parseInt(f.ageMax, 10)) return false;
      }
      if (f.visitsMin && p.total_visits < parseInt(f.visitsMin, 10)) return false;
      if (f.visitsMax && p.total_visits > parseInt(f.visitsMax, 10)) return false;
      if (f.lastVisitFrom && p.last_visit && new Date(p.last_visit) < new Date(f.lastVisitFrom)) return false;
      if (f.lastVisitTo && p.last_visit && new Date(p.last_visit) > new Date(f.lastVisitTo + "T23:59:59")) return false;
      return true;
    });
  }, [patientList, normalizedQuery, advFilters]);

  // Reset to page 1 when filter or page size changes
  const prevQuery = useRef(normalizedQuery);
  const prevPageSize = useRef(pageSize);
  if (prevQuery.current !== normalizedQuery || prevPageSize.current !== pageSize) {
    prevQuery.current = normalizedQuery;
    prevPageSize.current = pageSize;
    if (page !== 1) setPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  function handlePatientCreated(newPatient: PatientRow) {
    setPatientList((prev) => {
      // Avoid duplicates if linked to existing
      if (prev.find((p) => p.id === newPatient.id)) return prev;
      return [newPatient, ...prev];
    });
    setShowAddModal(false);
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center text-primary">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Patients</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {patientList.length} patient{patientList.length !== 1 ? "s" : ""} suivis
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-doktori-teal-dark text-white text-sm font-medium transition-colors shadow-sm"
        >
          <UserPlus className="h-4 w-4" />
          Ajouter un patient
        </button>
      </div>

      {/* Search bar + column picker */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher par nom ou téléphone…"
            className="w-full pl-9 pr-4 py-2.5 text-sm rounded-2xl border border-border bg-white dark:bg-gray-900 shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
          />
        </div>
        <button
          type="button"
          onClick={() => setAdvFiltersOpen((v) => !v)}
          className={`inline-flex items-center gap-2 h-10 px-3 rounded-2xl border text-sm transition-colors ${
            activeFiltersCount > 0
              ? "border-primary bg-primary/10 text-primary hover:bg-primary/15"
              : "border-border bg-white dark:bg-gray-900 text-foreground hover:bg-secondary"
          }`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filtres
          {activeFiltersCount > 0 && (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-white">
              {activeFiltersCount}
            </span>
          )}
        </button>
        <div ref={columnsMenuRef} className="relative">
          <button
            type="button"
            onClick={() => setColumnsMenuOpen((v) => !v)}
            className="inline-flex items-center gap-2 h-10 px-3 rounded-2xl border border-border bg-white dark:bg-gray-900 text-sm text-foreground hover:bg-secondary transition-colors"
          >
            <Columns3 className="h-4 w-4" />
            Colonnes
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-secondary px-1.5 text-[10px] font-bold text-primary">
              {visibleColumns.length + 2}
            </span>
          </button>
          {columnsMenuOpen && (
            <div className="absolute right-0 top-12 z-30 w-64 rounded-2xl bg-white dark:bg-gray-900 shadow-xl border border-border overflow-hidden">
              <div className="px-3 py-2 border-b border-border">
                <p className="text-xs font-semibold text-foreground">Colonnes affichées</p>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  Nom et téléphone sont toujours affichés
                </p>
              </div>
              <div className="max-h-72 overflow-y-auto py-1">
                {ALL_COLUMNS.map((col) => {
                  const checked = visibleColumns.includes(col);
                  return (
                    <button
                      key={col}
                      type="button"
                      onClick={() => toggleColumn(col)}
                      className="w-full flex items-center gap-3 px-3 py-1.5 text-sm hover:bg-secondary transition-colors"
                    >
                      <span
                        className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${
                          checked
                            ? "bg-primary border-primary text-white"
                            : "border-gray-300"
                        }`}
                      >
                        {checked && <Check className="h-3 w-3" strokeWidth={3} />}
                      </span>
                      <span className="flex-1 text-left">{COLUMN_LABELS[col]}</span>
                    </button>
                  );
                })}
              </div>
              <div className="px-3 py-2 border-t border-border flex gap-2">
                <button
                  type="button"
                  onClick={() => setVisibleColumns(DEFAULT_COLUMNS)}
                  className="flex-1 text-xs text-gray-600 hover:text-primary"
                >
                  Réinitialiser
                </button>
                <button
                  type="button"
                  onClick={() => setVisibleColumns([...ALL_COLUMNS])}
                  className="flex-1 text-xs text-gray-600 hover:text-primary"
                >
                  Tout afficher
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Advanced filters panel */}
      {advFiltersOpen && (
        <div className="rounded-2xl border border-border bg-white dark:bg-gray-900 shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              Filtres avancés
            </h3>
            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-primary transition-colors"
              >
                <RotateCcw className="h-3 w-3" />
                Réinitialiser
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <FilterField label="Email">
              <input
                type="text"
                value={advFilters.email}
                onChange={(e) => updateFilter("email", e.target.value)}
                placeholder="exemple@gmail.com"
                className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-white dark:bg-gray-900"
              />
            </FilterField>
            <FilterField label="CIN">
              <input
                type="text"
                value={advFilters.cin}
                onChange={(e) => updateFilter("cin", e.target.value)}
                placeholder="N° CIN"
                className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-white dark:bg-gray-900"
              />
            </FilterField>
            <FilterField label="N° CNAM">
              <input
                type="text"
                value={advFilters.cnam}
                onChange={(e) => updateFilter("cnam", e.target.value)}
                placeholder="N° CNAM"
                className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-white dark:bg-gray-900"
              />
            </FilterField>
            <FilterField label="Sexe">
              <select
                value={advFilters.gender}
                onChange={(e) => updateFilter("gender", e.target.value as "" | "male" | "female")}
                className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-white dark:bg-gray-900"
              >
                <option value="">Tous</option>
                <option value="male">Homme</option>
                <option value="female">Femme</option>
              </select>
            </FilterField>
            <FilterField label="Groupe sanguin">
              <select
                value={advFilters.bloodType}
                onChange={(e) => updateFilter("bloodType", e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-white dark:bg-gray-900"
              >
                <option value="">Tous</option>
                {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bt) => (
                  <option key={bt} value={bt}>{bt}</option>
                ))}
              </select>
            </FilterField>
            <FilterField label="Assurance">
              <input
                type="text"
                value={advFilters.insurance}
                onChange={(e) => updateFilter("insurance", e.target.value)}
                placeholder="Ex: CNAM, STAR…"
                className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-white dark:bg-gray-900"
              />
            </FilterField>
            <FilterField label="Profession">
              <input
                type="text"
                value={advFilters.occupation}
                onChange={(e) => updateFilter("occupation", e.target.value)}
                placeholder="Ex: Ingénieur"
                className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-white dark:bg-gray-900"
              />
            </FilterField>
            <FilterField label="Âge (min – max)">
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0" max="120"
                  value={advFilters.ageMin}
                  onChange={(e) => updateFilter("ageMin", e.target.value)}
                  placeholder="Min"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-white dark:bg-gray-900"
                />
                <input
                  type="number"
                  min="0" max="120"
                  value={advFilters.ageMax}
                  onChange={(e) => updateFilter("ageMax", e.target.value)}
                  placeholder="Max"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-white dark:bg-gray-900"
                />
              </div>
            </FilterField>
            <FilterField label="Visites totales (min – max)">
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  value={advFilters.visitsMin}
                  onChange={(e) => updateFilter("visitsMin", e.target.value)}
                  placeholder="Min"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-white dark:bg-gray-900"
                />
                <input
                  type="number"
                  min="0"
                  value={advFilters.visitsMax}
                  onChange={(e) => updateFilter("visitsMax", e.target.value)}
                  placeholder="Max"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-white dark:bg-gray-900"
                />
              </div>
            </FilterField>
            <FilterField label="Dernière visite — du">
              <input
                type="date"
                value={advFilters.lastVisitFrom}
                onChange={(e) => updateFilter("lastVisitFrom", e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-white dark:bg-gray-900"
              />
            </FilterField>
            <FilterField label="Dernière visite — au">
              <input
                type="date"
                value={advFilters.lastVisitTo}
                onChange={(e) => updateFilter("lastVisitTo", e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-white dark:bg-gray-900"
              />
            </FilterField>
          </div>
          <div className="text-xs text-gray-500 pt-1 border-t border-border">
            {filtered.length === 0
              ? "Aucun résultat"
              : `${filtered.length} patient${filtered.length > 1 ? "s" : ""} correspondent aux filtres`}
          </div>
        </div>
      )}

      {/* Search result count */}
      {normalizedQuery && (
        <p className="text-sm text-gray-500 dark:text-gray-400 -mt-2">
          {filtered.length === 0
            ? "Aucun résultat"
            : `${filtered.length} résultat${filtered.length !== 1 ? "s" : ""} pour « ${debouncedQuery.trim()} »`}
        </p>
      )}

      {patientList.length === 0 ? (
        /* No patients at all */
        <div className="rounded-2xl border border-border bg-white dark:bg-gray-900 p-12 text-center shadow-sm">
          <div className="h-14 w-14 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-3">
            <Users className="h-7 w-7 text-primary" />
          </div>
          <p className="text-foreground font-medium mb-1">Aucun patient pour le moment</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">
            Les patients apparaîtront ici après leurs premiers rendez-vous.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-doktori-teal-dark text-white text-sm font-medium transition-colors"
          >
            <UserPlus className="h-4 w-4" />
            Ajouter un premier patient
          </button>
        </div>
      ) : filtered.length === 0 ? (
        /* Search returned nothing */
        <div className="rounded-2xl border border-border bg-white dark:bg-gray-900 p-12 text-center shadow-sm">
          <div className="h-14 w-14 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-3">
            <Users className="h-7 w-7 text-primary" />
          </div>
          <p className="text-foreground font-medium mb-1">Aucun patient trouvé</p>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            Essayez un autre nom ou numéro de téléphone.
          </p>
        </div>
      ) : (
        <>
          {/* Table */}
          <div className="rounded-2xl border border-border bg-white dark:bg-gray-900 shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary text-left">
                  <th className="px-4 py-3 font-medium text-foreground">Patient</th>
                  <th className="px-4 py-3 font-medium text-foreground">Téléphone</th>
                  {visibleColumns.map((col) => (
                    <th
                      key={col}
                      className="px-4 py-3 font-medium text-foreground whitespace-nowrap"
                    >
                      {COLUMN_LABELS[col]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginated.map((p) => (
                  <tr key={p.id} className="hover:bg-secondary transition-colors">
                    <td className="px-4 py-3">
                      <Link
                        href={`/patients/${p.id}`}
                        className="font-medium text-primary hover:text-doktori-teal-dark hover:underline"
                      >
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {p.phone}
                    </td>
                    {visibleColumns.map((col) => (
                      <PatientCell key={col} col={col} patient={p} />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
              <label className="inline-flex items-center gap-2">
                <span>Afficher</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value) as PageSize)}
                  className="h-8 rounded-lg border border-border bg-white dark:bg-gray-900 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                <span>par page</span>
              </label>
              <span className="hidden sm:inline text-gray-300">·</span>
              <span>
                {filtered.length === 0
                  ? "0 patient"
                  : `${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, filtered.length)} sur ${filtered.length}`}
              </span>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage(1)}
                  disabled={safePage === 1}
                  className="inline-flex items-center justify-center h-8 w-8 text-sm rounded-lg border border-border bg-white dark:bg-gray-900 text-foreground hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Première page"
                >
                  «
                </button>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="inline-flex items-center justify-center h-8 w-8 text-sm rounded-lg border border-border bg-white dark:bg-gray-900 text-foreground hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Page précédente"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="px-2 text-sm text-foreground font-medium">
                  {safePage} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  className="inline-flex items-center justify-center h-8 w-8 text-sm rounded-lg border border-border bg-white dark:bg-gray-900 text-foreground hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Page suivante"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setPage(totalPages)}
                  disabled={safePage === totalPages}
                  className="inline-flex items-center justify-center h-8 w-8 text-sm rounded-lg border border-border bg-white dark:bg-gray-900 text-foreground hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Dernière page"
                >
                  »
                </button>
              </div>
            )}
          </div>
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

function PatientCell({ col, patient }: { col: ColumnKey; patient: PatientRow }) {
  const cls = "px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap";
  switch (col) {
    case "email":
      return (
        <td className={cls}>
          {patient.email ?? <span className="text-gray-300">—</span>}
        </td>
      );
    case "date_of_birth":
      return (
        <td className={cls}>
          {patient.date_of_birth ? (
            format(new Date(patient.date_of_birth), "d MMM yyyy", { locale: fr })
          ) : (
            <span className="text-gray-300">—</span>
          )}
        </td>
      );
    case "gender":
      return (
        <td className={cls}>
          {patient.gender === "M" ? "Homme" : patient.gender === "F" ? "Femme" : <span className="text-gray-300">—</span>}
        </td>
      );
    case "blood_type":
      return (
        <td className={cls}>
          {patient.blood_type ? (
            <span className="inline-flex items-center rounded-full bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 text-xs font-semibold">
              {patient.blood_type}
            </span>
          ) : (
            <span className="text-gray-300">—</span>
          )}
        </td>
      );
    case "cin":
      return (
        <td className={cls}>
          {patient.cin ?? <span className="text-gray-300">—</span>}
        </td>
      );
    case "cnam_number":
      return (
        <td className={cls}>
          {patient.cnam_number ?? <span className="text-gray-300">—</span>}
        </td>
      );
    case "insurance_provider":
      return (
        <td className={cls}>
          {patient.insurance_provider ?? <span className="text-gray-300">—</span>}
        </td>
      );
    case "occupation":
      return (
        <td className={cls}>
          {patient.occupation ?? <span className="text-gray-300">—</span>}
        </td>
      );
    case "total_visits":
      return (
        <td className="px-4 py-3">
          <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-secondary text-primary text-xs font-bold">
            {patient.total_visits}
          </span>
        </td>
      );
    case "last_visit":
      return (
        <td className={cls}>
          {patient.last_visit
            ? format(new Date(patient.last_visit), "d MMM yyyy", { locale: fr })
            : "—"}
        </td>
      );
  }
}
