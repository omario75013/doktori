"use client";

import { useState, useMemo } from "react";
import { Search } from "lucide-react";

type CnamRow = {
  code: string;
  nameFr: string;
  nameAr: string | null;
  baseFeeTnd: number;
  reimbursementPct: number;
  category: string;
};

const CATEGORY_LABELS: Record<string, string> = {
  consultation: "Consultations & visites",
  imaging: "Imagerie",
  lab: "Biologie",
  procedure: "Actes & procédures",
  specialist: "Spécialiste",
  autre: "Autre",
};

const CATEGORY_ORDER = ["consultation", "imaging", "lab", "procedure", "specialist", "autre"];

export default function TarifsClient({ rows }: { rows: CnamRow[] }) {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let out = rows;
    if (category) out = out.filter((r) => r.category === category);
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      out = out.filter(
        (r) =>
          r.code.toLowerCase().includes(needle) ||
          r.nameFr.toLowerCase().includes(needle) ||
          (r.nameAr ?? "").toLowerCase().includes(needle)
      );
    }
    return out;
  }, [rows, q, category]);

  const categories = useMemo(() => {
    const seen = new Set(rows.map((r) => r.category));
    return CATEGORY_ORDER.filter((c) => seen.has(c));
  }, [rows]);

  function calcRest(baseFeeTnd: number, pct: number) {
    const reimbursed = (baseFeeTnd * pct) / 100;
    const rest = baseFeeTnd - reimbursed;
    return { reimbursed, rest };
  }

  return (
    <>
      <div className="mb-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher un acte (ex: échographie, NFS, consultation…)"
            className="w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setCategory(null)}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition ${
              category === null
                ? "bg-teal-600 text-white"
                : "bg-white border border-slate-300 text-slate-700 hover:border-slate-400"
            }`}
          >
            Tout
          </button>
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition ${
                category === c
                  ? "bg-teal-600 text-white"
                  : "bg-white border border-slate-300 text-slate-700 hover:border-slate-400"
              }`}
            >
              {CATEGORY_LABELS[c] ?? c}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Code
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Acte
              </th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Tarif TND
              </th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">
                Remboursement
              </th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Reste à charge
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((r) => {
              const { reimbursed, rest } = calcRest(r.baseFeeTnd, r.reimbursementPct);
              return (
                <tr key={r.code} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <code className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded">
                      {r.code}
                    </code>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{r.nameFr}</p>
                    {r.nameAr && (
                      <p className="text-xs text-slate-400 mt-0.5" dir="rtl">
                        {r.nameAr}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">
                    {r.baseFeeTnd.toFixed(2)} TND
                  </td>
                  <td className="px-4 py-3 text-right hidden md:table-cell">
                    <span className="text-emerald-700 font-medium">
                      {reimbursed.toFixed(2)} TND
                    </span>
                    <span className="text-slate-400 text-xs ml-1">
                      ({r.reimbursementPct.toFixed(0)}%)
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-teal-700">
                    {rest.toFixed(2)} TND
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="px-4 py-12 text-center text-slate-500 text-sm">
            Aucun acte ne correspond à votre recherche.
          </div>
        )}
      </div>

      <p className="mt-3 text-xs text-slate-500 text-right">
        {filtered.length} acte{filtered.length !== 1 ? "s" : ""} affiché
        {filtered.length !== 1 ? "s" : ""}
      </p>
    </>
  );
}
