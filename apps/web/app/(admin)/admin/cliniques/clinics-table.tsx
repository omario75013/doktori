"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, Building2, ExternalLink } from "lucide-react";

interface Clinic {
  id: string;
  name: string;
  city: string;
  phone: string;
  email: string;
  plan: string;
  logoUrl: string | null;
  createdAt: string;
  doctorCount: number;
}

const PLAN_LABELS: Record<string, { label: string; className: string }> = {
  free: { label: "Gratuit", className: "bg-slate-100 text-slate-700" },
  essentiel: { label: "Essentiel", className: "bg-blue-50 text-blue-700" },
  pro: { label: "Pro", className: "bg-purple-50 text-purple-700" },
  clinique: { label: "Clinique", className: "bg-teal-50 text-teal-700" },
};

export function ClinicsTable({ clinics }: { clinics: Clinic[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clinics;
    return clinics.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q)
    );
  }, [clinics, query]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="p-4 border-b border-slate-200">
        <div className="relative max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher nom, ville, email..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3 font-semibold">Clinique</th>
              <th className="px-4 py-3 font-semibold">Ville</th>
              <th className="px-4 py-3 font-semibold">Téléphone</th>
              <th className="px-4 py-3 font-semibold">Email</th>
              <th className="px-4 py-3 font-semibold">Plan</th>
              <th className="px-4 py-3 font-semibold">Médecins</th>
              <th className="px-4 py-3 font-semibold">Créée le</th>
              <th className="px-4 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((c) => {
              const plan = PLAN_LABELS[c.plan] ?? { label: c.plan, className: "bg-slate-100 text-slate-700" };
              return (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {c.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.logoUrl} alt={c.name} className="w-8 h-8 rounded-lg object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 text-white flex items-center justify-center">
                          <Building2 className="w-4 h-4" />
                        </div>
                      )}
                      <Link
                        href={`/admin/cliniques/${c.id}`}
                        className="font-medium text-slate-900 hover:text-teal-600"
                      >
                        {c.name}
                      </Link>
                    </div>
                  </td>
                  <td className="px-4 py-3 capitalize text-slate-700">{c.city}</td>
                  <td className="px-4 py-3 text-slate-700">{c.phone}</td>
                  <td className="px-4 py-3 text-slate-600">{c.email}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${plan.className}`}>
                      {plan.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700 tabular-nums">{c.doctorCount}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {new Date(c.createdAt).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end">
                      <Link
                        href={`/admin/cliniques/${c.id}`}
                        className="p-1.5 text-slate-500 hover:text-teal-600 hover:bg-teal-50 rounded-md transition-colors"
                        title="Détails"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                  Aucune clinique trouvée
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
