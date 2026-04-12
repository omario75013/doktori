"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, ExternalLink, Calendar } from "lucide-react";

export type AppointmentRow = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  type: string;
  practiceId: string | null;
  doctorId: string;
  doctorName: string;
  doctorSpecialty: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
};

const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  confirmed: "Confirmé",
  completed: "Terminé",
  cancelled: "Annulé",
  no_show: "Absent",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700",
  confirmed: "bg-blue-50 text-blue-700",
  completed: "bg-green-50 text-green-700",
  cancelled: "bg-red-50 text-red-700",
  no_show: "bg-slate-100 text-slate-600",
};

const TYPE_LABELS: Record<string, string> = {
  cabinet: "Cabinet",
  home: "Domicile",
  teleconsult: "Téléconsult.",
};

const TYPE_COLORS: Record<string, string> = {
  cabinet: "bg-teal-50 text-teal-700",
  home: "bg-indigo-50 text-indigo-700",
  teleconsult: "bg-purple-50 text-purple-700",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_COLORS[status] ?? "bg-slate-50 text-slate-600"}`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${TYPE_COLORS[type] ?? "bg-slate-50 text-slate-600"}`}
    >
      {TYPE_LABELS[type] ?? type}
    </span>
  );
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString("fr-TN", { weekday: "short", day: "2-digit", month: "short" }),
    time: d.toLocaleTimeString("fr-TN", { hour: "2-digit", minute: "2-digit" }),
  };
}

const ALL_STATUSES = ["pending", "confirmed", "completed", "cancelled", "no_show"];
const ALL_TYPES = ["cabinet", "home", "teleconsult"];

export function AppointmentsTable({
  appointments,
}: {
  appointments: AppointmentRow[];
}) {
  const [query, setQuery] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<Set<string>>(new Set());
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
  const [doctorSearch, setDoctorSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  function toggleStatus(s: string) {
    setSelectedStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  }

  function toggleType(t: string) {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  }

  const filtered = useMemo(() => {
    const lq = query.trim().toLowerCase();
    const ld = doctorSearch.trim().toLowerCase();
    return appointments.filter((a) => {
      if (selectedStatuses.size > 0 && !selectedStatuses.has(a.status)) return false;
      if (selectedTypes.size > 0 && !selectedTypes.has(a.type)) return false;
      if (fromDate && a.startsAt < fromDate) return false;
      if (toDate && a.startsAt > toDate + "T23:59:59") return false;
      if (ld && !a.doctorName.toLowerCase().includes(ld)) return false;
      if (!lq) return true;
      return (
        a.patientName.toLowerCase().includes(lq) ||
        a.patientPhone.includes(lq) ||
        a.doctorName.toLowerCase().includes(lq)
      );
    });
  }, [appointments, query, selectedStatuses, selectedTypes, doctorSearch, fromDate, toDate]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Filters */}
      <div className="p-4 border-b border-slate-200 flex flex-col gap-3">
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Patient/Doctor search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Patient (nom, tél) ou médecin..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>
          {/* Doctor filter */}
          <div className="relative lg:w-56">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={doctorSearch}
              onChange={(e) => setDoctorSearch(e.target.value)}
              placeholder="Filtrer par médecin..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>
          {/* Date range */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="px-2 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <span className="text-slate-400 text-sm">–</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="px-2 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        {/* Status + Type toggles */}
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-slate-500 self-center mr-1">Statut:</span>
          {ALL_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => toggleStatus(s)}
              className={`px-2.5 py-1 text-xs font-medium rounded-full border transition-colors ${
                selectedStatuses.has(s)
                  ? `${STATUS_COLORS[s]} border-current`
                  : "border-slate-200 text-slate-500 hover:border-slate-400"
              }`}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
          <span className="text-xs text-slate-500 self-center ml-3 mr-1">Type:</span>
          {ALL_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => toggleType(t)}
              className={`px-2.5 py-1 text-xs font-medium rounded-full border transition-colors ${
                selectedTypes.has(t)
                  ? `${TYPE_COLORS[t]} border-current`
                  : "border-slate-200 text-slate-500 hover:border-slate-400"
              }`}
            >
              {TYPE_LABELS[t]}
            </button>
          ))}
          {(selectedStatuses.size > 0 || selectedTypes.size > 0 || query || doctorSearch || fromDate || toDate) && (
            <button
              onClick={() => {
                setSelectedStatuses(new Set());
                setSelectedTypes(new Set());
                setQuery("");
                setDoctorSearch("");
                setFromDate("");
                setToDate("");
              }}
              className="ml-auto px-2.5 py-1 text-xs text-slate-500 hover:text-slate-900 underline"
            >
              Effacer filtres
            </button>
          )}
        </div>
      </div>

      <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 text-xs text-slate-500">
        {filtered.length} rendez-vous
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3 font-semibold">Date / Heure</th>
              <th className="px-4 py-3 font-semibold">Patient</th>
              <th className="px-4 py-3 font-semibold">Médecin</th>
              <th className="px-4 py-3 font-semibold">Spécialité</th>
              <th className="px-4 py-3 font-semibold">Statut</th>
              <th className="px-4 py-3 font-semibold">Type</th>
              <th className="px-4 py-3 font-semibold">Cabinet</th>
              <th className="px-4 py-3 font-semibold w-12"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((a) => {
              const { date, time } = formatDateTime(a.startsAt);
              return (
                <tr key={a.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="font-medium text-slate-900">{date}</div>
                    <div className="text-xs text-slate-500">{time}</div>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/patients/${a.patientId}`}
                      className="font-medium text-slate-900 hover:text-teal-600"
                    >
                      {a.patientName}
                    </Link>
                    <div className="text-xs text-slate-500">{a.patientPhone}</div>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/medecins/${a.doctorId}`}
                      className="font-medium text-slate-900 hover:text-teal-600"
                    >
                      {a.doctorName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600 capitalize">{a.doctorSpecialty}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={a.status} />
                  </td>
                  <td className="px-4 py-3">
                    <TypeBadge type={a.type} />
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {a.practiceId ? (
                      <span className="font-mono text-slate-400">{a.practiceId.slice(0, 8)}…</span>
                    ) : (
                      <span className="text-slate-300">N/A</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/rendez-vous/${a.id}`}
                      className="p-1.5 text-slate-500 hover:text-teal-600 hover:bg-teal-50 rounded-md transition-colors inline-flex"
                      title="Voir détail"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                  Aucun rendez-vous trouvé
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
