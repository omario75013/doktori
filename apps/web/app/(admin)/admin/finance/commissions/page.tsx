"use client";

import { useCallback, useEffect, useState } from "react";
import { Activity, Award, RefreshCw, TrendingUp } from "lucide-react";

interface SessionRow {
  id: string;
  commission: number;
  fee: number | null;
  completed_at: string | null;
  symptom_category: string | null;
  distance_m: number | null;
  doctor_id: string | null;
  doctor_name: string | null;
  doctor_specialty: string | null;
  patient_id: string | null;
  patient_name: string | null;
}

interface DoctorRollupRow {
  doctor_id: string | null;
  doctor_name: string | null;
  doctor_specialty: string | null;
  session_count: number;
  total_commission: number;
  total_fees: number;
}

interface ApiResponse {
  total_filtered: number;
  count_filtered: number;
  total_this_month: number;
  sessions: SessionRow[];
  by_doctor: DoctorRollupRow[];
}

function formatDT(millimes: number | null | undefined): string {
  if (millimes == null) return "—";
  return (
    (millimes / 1000).toLocaleString("fr-TN", {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    }) + " DT"
  );
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CommissionsPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [doctorId, setDoctorId] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (doctorId) params.set("doctorId", doctorId);
    try {
      const res = await fetch(`/api/admin/finance/commissions?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData((await res.json()) as ApiResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, [from, to, doctorId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
            <Award className="w-5 h-5 text-emerald-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Commissions SOS</h1>
        </div>
        <p className="text-slate-500 ml-12">
          Commissions perçues par Doktori sur les consultations SOS terminées.
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6 flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-emerald-50 text-emerald-600">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Ce mois-ci</p>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">
              {formatDT(data?.total_this_month ?? 0)}
            </p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6 flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-teal-50 text-teal-600">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Filtre actuel</p>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">
              {formatDT(data?.total_filtered ?? 0)}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {data?.count_filtered ?? 0} session{(data?.count_filtered ?? 0) > 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6 flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-violet-50 text-violet-600">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Médecins actifs</p>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">
              {data?.by_doctor.length ?? 0}
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6 flex items-end gap-4 flex-wrap">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Du</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-lg border border-slate-200 text-sm px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Au</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-lg border border-slate-200 text-sm px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-slate-600 mb-1">Médecin (UUID)</label>
          <input
            type="text"
            value={doctorId}
            onChange={(e) => setDoctorId(e.target.value)}
            placeholder="laissez vide pour tous"
            className="w-full rounded-lg border border-slate-200 text-sm px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono text-xs"
          />
        </div>
        <button
          onClick={() => void fetchData()}
          className="ml-auto flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Actualiser
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-6 text-sm">
          Erreur de chargement : {error}
        </div>
      )}

      {/* Doctor rollup */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-6">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
          <h2 className="text-sm font-semibold text-slate-700">Répartition par médecin</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white border-b border-slate-100">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Médecin</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Sessions</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Honoraires totaux</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Commission</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan={4} className="px-4 py-3">
                      <div className="h-4 bg-slate-100 animate-pulse rounded" />
                    </td>
                  </tr>
                ))
              ) : data?.by_doctor.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-slate-400">
                    Aucune commission pour cette période.
                  </td>
                </tr>
              ) : (
                data?.by_doctor.map((row) => (
                  <tr key={row.doctor_id ?? "no-doctor"} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{row.doctor_name ?? "Sans médecin"}</p>
                      <p className="text-xs text-slate-400">{row.doctor_specialty ?? "—"}</p>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">{row.session_count}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{formatDT(row.total_fees)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-700">
                      {formatDT(row.total_commission)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sessions detail */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
          <h2 className="text-sm font-semibold text-slate-700">Sessions terminées</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white border-b border-slate-100">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Date</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Médecin</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Patient</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Symptôme</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Honoraires</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Commission</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan={6} className="px-4 py-3">
                      <div className="h-4 bg-slate-100 animate-pulse rounded" />
                    </td>
                  </tr>
                ))
              ) : data?.sessions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    Aucune session.
                  </td>
                </tr>
              ) : (
                data?.sessions.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{fmtDate(row.completed_at)}</td>
                    <td className="px-4 py-3 text-slate-700">{row.doctor_name ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-700">{row.patient_name ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{row.symptom_category ?? "—"}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{formatDT(row.fee)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-700">
                      {formatDT(row.commission)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
