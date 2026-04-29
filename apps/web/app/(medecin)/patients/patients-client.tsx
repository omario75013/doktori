"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Search, Users, ChevronLeft, ChevronRight, UserPlus, X, Columns3, Check } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

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

function getColumnLabels(t: ReturnType<typeof useTranslations<"medecin.patients">>): Record<ColumnKey, string> {
  return {
    email: t("colEmail"),
    date_of_birth: t("colDateOfBirth"),
    gender: t("colGender"),
    blood_type: t("colBloodType"),
    cin: t("colCIN"),
    cnam_number: t("colCNAMNumber"),
    insurance_provider: t("colInsuranceProvider"),
    occupation: t("colOccupation"),
    total_visits: t("colVisits"),
    last_visit: t("colLastVisit"),
  };
}

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
  const t = useTranslations("medecin.patients");
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
        throw new Error(data.error ?? t("creationError"));
      }
      if (data.linked) {
        toast.success(t("toastExistingLinked"));
      } else {
        toast.success(t("toastCreatedSuccess"));
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
      setError(e instanceof Error ? e.message : t("unknownError"));
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
          <h2 className="text-base font-semibold text-foreground">{t("addPatientTitle")}</h2>
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
              {t("labelFullName")} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder={t("placeholderName")}
              className="w-full h-11 rounded-xl border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-gray-800"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
              {t("labelPhone")} <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              placeholder={t("placeholderPhone")}
              className="w-full h-11 rounded-xl border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-gray-800"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
              {t("labelEmail")}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("placeholderEmail")}
              className="w-full h-11 rounded-xl border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-gray-800"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
              {t("labelDateOfBirth")}
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
              {t("cancelButton")}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm rounded-xl bg-primary hover:bg-doktori-teal-dark text-white font-bold disabled:opacity-40 transition-colors"
            >
              {submitting ? t("creatingButton") : t("addButton")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main patients client ─────────────────────────────────────────────────────

export function PatientsClient({ patients }: { patients: PatientRow[] }) {
  const t = useTranslations("medecin.patients");
  const COLUMN_LABELS = getColumnLabels(t);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(20);
  const [patientList, setPatientList] = useState<PatientRow[]>(patients);
  const [showAddModal, setShowAddModal] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<ColumnKey[]>(DEFAULT_COLUMNS);
  const [columnsMenuOpen, setColumnsMenuOpen] = useState(false);
  const columnsMenuRef = useRef<HTMLDivElement>(null);
  const debouncedQuery = useDebounced(query, 200);

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
    if (!normalizedQuery) return patientList;
    return patientList.filter(
      (p) =>
        p.name.toLowerCase().includes(normalizedQuery) ||
        p.phone.replace(/\s/g, "").includes(normalizedQuery.replace(/\s/g, ""))
    );
  }, [patientList, normalizedQuery]);

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
            <h1 className="text-2xl font-bold text-foreground">{t("pageTitle")}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("patientCount", { count: patientList.length, s: patientList.length !== 1 ? "s" : "" })}
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-doktori-teal-dark text-white text-sm font-medium transition-colors shadow-sm"
        >
          <UserPlus className="h-4 w-4" />
          {t("addPatientButton")}
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
            placeholder={t("searchPlaceholder")}
            className="w-full pl-9 pr-4 py-2.5 text-sm rounded-2xl border border-border bg-white dark:bg-gray-900 shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
          />
        </div>
        <div ref={columnsMenuRef} className="relative">
          <button
            type="button"
            onClick={() => setColumnsMenuOpen((v) => !v)}
            className="inline-flex items-center gap-2 h-10 px-3 rounded-2xl border border-border bg-white dark:bg-gray-900 text-sm text-foreground hover:bg-secondary transition-colors"
          >
            <Columns3 className="h-4 w-4" />
            {t("columnsButton")}
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-secondary px-1.5 text-[10px] font-bold text-primary">
              {visibleColumns.length + 2}
            </span>
          </button>
          {columnsMenuOpen && (
            <div className="absolute right-0 top-12 z-30 w-64 rounded-2xl bg-white dark:bg-gray-900 shadow-xl border border-border overflow-hidden">
              <div className="px-3 py-2 border-b border-border">
                <p className="text-xs font-semibold text-foreground">{t("columnsDisplayedLabel")}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {t("columnsAlwaysDisplayed")}
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
                  {t("resetColumns")}
                </button>
                <button
                  type="button"
                  onClick={() => setVisibleColumns([...ALL_COLUMNS])}
                  className="flex-1 text-xs text-gray-600 hover:text-primary"
                >
                  {t("showAllColumns")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Search result count */}
      {normalizedQuery && (
        <p className="text-sm text-gray-500 dark:text-gray-400 -mt-2">
          {filtered.length === 0
            ? t("noResults")
            : t("searchResultsCount", { count: filtered.length, s: filtered.length !== 1 ? "s" : "", query: debouncedQuery.trim() })}
        </p>
      )}

      {patientList.length === 0 ? (
        /* No patients at all */
        <div className="rounded-2xl border border-border bg-white dark:bg-gray-900 p-12 text-center shadow-sm">
          <div className="h-14 w-14 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-3">
            <Users className="h-7 w-7 text-primary" />
          </div>
          <p className="text-foreground font-medium mb-1">{t("noPatients")}</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">
            {t("noPatientsDesc")}
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-doktori-teal-dark text-white text-sm font-medium transition-colors"
          >
            <UserPlus className="h-4 w-4" />
            {t("addFirstPatient")}
          </button>
        </div>
      ) : filtered.length === 0 ? (
        /* Search returned nothing */
        <div className="rounded-2xl border border-border bg-white dark:bg-gray-900 p-12 text-center shadow-sm">
          <div className="h-14 w-14 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-3">
            <Users className="h-7 w-7 text-primary" />
          </div>
          <p className="text-foreground font-medium mb-1">{t("noPatientFound")}</p>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            {t("tryAnotherSearch")}
          </p>
        </div>
      ) : (
        <>
          {/* Table */}
          <div className="rounded-2xl border border-border bg-white dark:bg-gray-900 shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary text-left">
                  <th className="px-4 py-3 font-medium text-foreground">{t("colPatient")}</th>
                  <th className="px-4 py-3 font-medium text-foreground">{t("colPhone")}</th>
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
                <span>{t("showLabel")}</span>
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
                <span>{t("perPageLabel")}</span>
              </label>
              <span className="hidden sm:inline text-gray-300">·</span>
              <span>
                {filtered.length === 0
                  ? t("zeroPatients")
                  : t("paginationInfo", {
                      start: (safePage - 1) * pageSize + 1,
                      end: Math.min(safePage * pageSize, filtered.length),
                      total: filtered.length,
                    })}
              </span>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage(1)}
                  disabled={safePage === 1}
                  className="inline-flex items-center justify-center h-8 w-8 text-sm rounded-lg border border-border bg-white dark:bg-gray-900 text-foreground hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label={t("firstPageAriaLabel")}
                >
                  «
                </button>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="inline-flex items-center justify-center h-8 w-8 text-sm rounded-lg border border-border bg-white dark:bg-gray-900 text-foreground hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label={t("prevPageAriaLabel")}
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
                  aria-label={t("nextPageAriaLabel")}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setPage(totalPages)}
                  disabled={safePage === totalPages}
                  className="inline-flex items-center justify-center h-8 w-8 text-sm rounded-lg border border-border bg-white dark:bg-gray-900 text-foreground hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label={t("lastPageAriaLabel")}
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
  const t = useTranslations("medecin.patients");
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
          {patient.gender === "M" ? t("genderMale") : patient.gender === "F" ? t("genderFemale") : <span className="text-gray-300">—</span>}
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
