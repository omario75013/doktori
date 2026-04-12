"use client";

import { useState } from "react";
import { ChevronUp, ChevronDown, Star } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Scorecard = {
  id: string;
  name: string;
  specialty: string;
  city: string;
  bookings: number;
  cancellationRate: number;
  noShowRate: number;
  avgRating: number | null;
  reviewCount: number;
  revenueEstimate: number;
};

type SortKey = keyof Pick<
  Scorecard,
  "bookings" | "cancellationRate" | "noShowRate" | "avgRating" | "revenueEstimate"
>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function RateBadge({ value, warn, danger }: { value: number; warn: number; danger: number }) {
  const cls =
    value >= danger
      ? "bg-red-50 text-red-700"
      : value >= warn
        ? "bg-amber-50 text-amber-700"
        : "bg-emerald-50 text-emerald-700";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {value}%
    </span>
  );
}

// ─── Table ────────────────────────────────────────────────────────────────────

export function ScorecardTable({ scorecards }: { scorecards: Scorecard[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("bookings");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const sorted = [...scorecards].sort((a, b) => {
    const va = a[sortKey] ?? -1;
    const vb = b[sortKey] ?? -1;
    return sortDir === "asc" ? (va as number) - (vb as number) : (vb as number) - (va as number);
  });

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <ChevronUp className="w-3 h-3 text-slate-300" />;
    return sortDir === "asc" ? (
      <ChevronUp className="w-3 h-3 text-teal-600" />
    ) : (
      <ChevronDown className="w-3 h-3 text-teal-600" />
    );
  }

  function Th({
    children,
    k,
    right,
  }: {
    children: React.ReactNode;
    k?: SortKey;
    right?: boolean;
  }) {
    return (
      <th
        className={`pb-3 pr-4 text-xs font-medium text-slate-500 uppercase tracking-wider ${right ? "text-right" : "text-left"} ${k ? "cursor-pointer select-none hover:text-slate-700" : ""}`}
        onClick={k ? () => handleSort(k) : undefined}
      >
        <span className="inline-flex items-center gap-1">
          {children}
          {k && <SortIcon k={k} />}
        </span>
      </th>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100">
            <Th>Médecin</Th>
            <Th>Spécialité</Th>
            <Th>Ville</Th>
            <Th k="bookings" right>Réservations (30j)</Th>
            <Th k="cancellationRate" right>Annul.</Th>
            <Th k="noShowRate" right>No-show</Th>
            <Th k="avgRating" right>Note moy.</Th>
            <Th k="revenueEstimate" right>Revenu est. (DT)</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {sorted.map((row) => (
            <tr key={row.id} className="hover:bg-slate-50 transition-colors">
              <td className="py-3 pr-4 font-medium text-slate-900 whitespace-nowrap">
                {row.name}
              </td>
              <td className="py-3 pr-4 text-slate-600 capitalize">{row.specialty}</td>
              <td className="py-3 pr-4 text-slate-600 capitalize">{row.city}</td>
              <td className="py-3 pr-4 text-right tabular-nums font-semibold text-slate-800">
                {row.bookings.toLocaleString("fr-FR")}
              </td>
              <td className="py-3 pr-4 text-right">
                <RateBadge value={row.cancellationRate} warn={20} danger={40} />
              </td>
              <td className="py-3 pr-4 text-right">
                <RateBadge value={row.noShowRate} warn={10} danger={25} />
              </td>
              <td className="py-3 pr-4 text-right">
                {row.avgRating !== null ? (
                  <span className="inline-flex items-center gap-1 tabular-nums text-slate-700">
                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                    {row.avgRating.toFixed(1)}
                    <span className="text-xs text-slate-400">({row.reviewCount})</span>
                  </span>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </td>
              <td className="py-3 text-right tabular-nums text-slate-700">
                {row.revenueEstimate > 0
                  ? row.revenueEstimate.toLocaleString("fr-FR")
                  : <span className="text-slate-400">—</span>}
              </td>
            </tr>
          ))}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={8} className="py-8 text-center text-slate-400">
                Aucune donnée pour les 30 derniers jours
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
