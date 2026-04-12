"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, ExternalLink } from "lucide-react";

export interface SuspendedPatient {
  id: string;
  name: string;
  phone: string;
  suspensionReason: string | null;
  suspendedAt: string | null;
}

export function SuspensionsTable({ patients }: { patients: SuspendedPatient[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function unban(id: string) {
    if (!confirm("Réactiver ce patient ?")) return;
    setBusy(id);
    setError(null);
    const res = await fetch(`/api/admin/patients/${id}/unban`, { method: "POST" });
    setBusy(null);
    if (res.ok) startTransition(() => router.refresh());
    else setError("Erreur lors de la réactivation du patient.");
  }

  if (patients.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500">
        Aucun patient suspendu
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="flex items-center justify-between px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-4 text-red-400 hover:text-red-700 transition-colors">✕</button>
        </div>
      )}
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3 font-semibold">Patient</th>
              <th className="px-4 py-3 font-semibold">Téléphone</th>
              <th className="px-4 py-3 font-semibold">Raison</th>
              <th className="px-4 py-3 font-semibold">Suspendu le</th>
              <th className="px-4 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {patients.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/patients/${p.id}`}
                    className="font-medium text-slate-900 hover:text-teal-600"
                  >
                    {p.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-700 tabular-nums">{p.phone}</td>
                <td className="px-4 py-3 text-slate-700 max-w-xs truncate">
                  {p.suspensionReason ?? <span className="text-slate-400">—</span>}
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                  {p.suspendedAt
                    ? new Date(p.suspendedAt).toLocaleString("fr-FR")
                    : <span className="text-slate-400">—</span>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Link
                      href={`/admin/patients/${p.id}`}
                      className="p-1.5 text-slate-500 hover:text-teal-600 hover:bg-teal-50 rounded-md transition-colors"
                      title="Détails"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => unban(p.id)}
                      disabled={busy === p.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-md transition-colors disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Réactiver
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
    </div>
  );
}
