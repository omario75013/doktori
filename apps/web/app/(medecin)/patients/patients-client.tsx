"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Search, Users, ChevronLeft, ChevronRight } from "lucide-react";

type PatientRow = {
  id: string;
  name: string;
  phone: string;
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

export function PatientsClient({ patients }: { patients: PatientRow[] }) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const debouncedQuery = useDebounced(query, 200);

  const normalizedQuery = debouncedQuery.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!normalizedQuery) return patients;
    return patients.filter(
      (p) =>
        p.name.toLowerCase().includes(normalizedQuery) ||
        p.phone.replace(/\s/g, "").includes(normalizedQuery.replace(/\s/g, ""))
    );
  }, [patients, normalizedQuery]);

  // Reset to page 1 when filter changes
  const prevQuery = useRef(normalizedQuery);
  if (prevQuery.current !== normalizedQuery) {
    prevQuery.current = normalizedQuery;
    if (page !== 1) setPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center text-primary">
          <Users className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Patients</h1>
          <p className="text-sm text-gray-500">
            {patients.length} patient{patients.length !== 1 ? "s" : ""} suivis
          </p>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher par nom ou téléphone…"
          className="w-full pl-9 pr-4 py-2.5 text-sm rounded-2xl border border-border bg-white shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
        />
      </div>

      {/* Search result count */}
      {normalizedQuery && (
        <p className="text-sm text-gray-500 -mt-2">
          {filtered.length === 0
            ? "Aucun résultat"
            : `${filtered.length} résultat${filtered.length !== 1 ? "s" : ""} pour « ${debouncedQuery.trim()} »`}
        </p>
      )}

      {patients.length === 0 ? (
        /* No patients at all */
        <div className="rounded-2xl border border-border bg-white p-12 text-center shadow-sm">
          <div className="h-14 w-14 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-3">
            <Users className="h-7 w-7 text-primary" />
          </div>
          <p className="text-foreground font-medium mb-1">Aucun patient pour le moment</p>
          <p className="text-sm text-gray-400">
            Les patients apparaîtront ici après leurs premiers rendez-vous.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        /* Search returned nothing */
        <div className="rounded-2xl border border-border bg-white p-12 text-center shadow-sm">
          <div className="h-14 w-14 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-3">
            <Users className="h-7 w-7 text-primary" />
          </div>
          <p className="text-foreground font-medium mb-1">Aucun patient trouvé</p>
          <p className="text-sm text-gray-400">
            Essayez un autre nom ou numéro de téléphone.
          </p>
        </div>
      ) : (
        <>
          {/* Table */}
          <div className="rounded-2xl border border-border bg-white shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary text-left">
                  <th className="px-4 py-3 font-medium text-foreground">Patient</th>
                  <th className="px-4 py-3 font-medium text-foreground">Téléphone</th>
                  <th className="px-4 py-3 font-medium text-foreground">Visites</th>
                  <th className="px-4 py-3 font-medium text-foreground">Dernière visite</th>
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
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{p.phone}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-secondary text-primary text-xs font-bold">
                        {p.total_visits}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {format(new Date(p.last_visit), "d MMM yyyy", { locale: fr })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-1">
              <p className="text-sm text-gray-500">
                Page {safePage} sur {totalPages} —{" "}
                {filtered.length} patient{filtered.length !== 1 ? "s" : ""}
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
    </div>
  );
}
