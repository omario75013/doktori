"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { motion } from "framer-motion";
import {
  Calendar,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  ChevronDown,
  UserRound,
} from "lucide-react";

interface Appointment {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  type: string;
  reason: string | null;
  doctorId: string;
  doctorName: string;
  doctorSpecialty: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  checkedInAt: string | null;
  confirmedAt: string | null;
  cancelledAt: string | null;
}

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  role: string;
}

const STATUS_LABELS: Record<string, { label: string; bg: string; text: string }> = {
  pending: { label: "En attente", bg: "bg-amber-50", text: "text-amber-700" },
  confirmed: { label: "Confirmé", bg: "bg-blue-50", text: "text-blue-700" },
  completed: { label: "Terminé", bg: "bg-emerald-50", text: "text-emerald-700" },
  cancelled: { label: "Annulé", bg: "bg-red-50", text: "text-red-500" },
  no_show: { label: "Absent", bg: "bg-gray-100", text: "text-gray-500" },
};

const DATE_FILTERS = [
  { value: "", label: "Toutes les dates" },
  { value: "today", label: "Aujourd'hui" },
  { value: "tomorrow", label: "Demain" },
  { value: "week", label: "7 prochains jours" },
];

const STATUS_FILTERS = [
  { value: "", label: "Tous les statuts" },
  { value: "pending", label: "En attente" },
  { value: "confirmed", label: "Confirmé" },
  { value: "completed", label: "Terminé" },
  { value: "cancelled", label: "Annulé" },
];

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_LABELS[status] ?? { label: status, bg: "bg-gray-100", text: "text-gray-600" };
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  );
}

export default function RendezVousPage() {
  useSession();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [doctorFilter, setDoctorFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("today");
  const [search, setSearch] = useState("");

  const fetchAppointments = useCallback(() => {
    const params = new URLSearchParams();
    if (doctorFilter) params.set("doctorId", doctorFilter);
    if (statusFilter) params.set("status", statusFilter);
    if (dateFilter) params.set("date", dateFilter);

    setLoading(true);
    fetch(`/api/clinique/appointments?${params}`)
      .then((r) => r.json())
      .then((data: { appointments?: Appointment[]; error?: string }) => {
        if (data.error) throw new Error(data.error);
        setAppointments(data.appointments ?? []);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [doctorFilter, statusFilter, dateFilter]);

  // Load doctors list once
  useEffect(() => {
    fetch("/api/clinique/doctors")
      .then((r) => r.json())
      .then((data: { doctors?: Doctor[] }) => setDoctors(data.doctors ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  async function updateStatus(id: string, newStatus: string) {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/clinique/appointments/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Erreur lors de la mise à jour");
      fetchAppointments();
    } catch {
      alert("Impossible de mettre à jour le statut.");
    } finally {
      setActionLoading(null);
    }
  }

  // Client-side search filter
  const filtered = appointments.filter((a) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      a.patientName.toLowerCase().includes(q) ||
      a.doctorName.toLowerCase().includes(q) ||
      (a.reason ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-start justify-between flex-wrap gap-4"
      >
        <div>
          <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
            <Calendar className="h-6 w-6" style={{ color: "#0891B2" }} strokeWidth={2.5} />
            Rendez-vous
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Tous les rendez-vous de la clinique
          </p>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="bg-white dark:bg-gray-900 rounded-2xl border border-border p-4 shadow-sm"
      >
        <div className="flex flex-wrap gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Rechercher patient, médecin…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
            />
          </div>

          {/* Doctor filter */}
          <div className="relative">
            <select
              value={doctorFilter}
              onChange={(e) => setDoctorFilter(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
            >
              <option value="">Tous les médecins</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  Dr. {d.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          </div>

          {/* Status filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
            >
              {STATUS_FILTERS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          </div>

          {/* Date filter */}
          <div className="relative">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
            >
              {DATE_FILTERS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          </div>
        </div>
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
        className="bg-white dark:bg-gray-900 rounded-2xl border border-border shadow-sm overflow-hidden"
      >
        {loading ? (
          <div className="divide-y divide-border">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="p-4 flex items-center gap-4 animate-pulse">
                <div className="h-4 w-24 bg-gray-100 dark:bg-gray-700 rounded" />
                <div className="h-4 w-32 bg-gray-100 dark:bg-gray-700 rounded" />
                <div className="h-4 w-28 bg-gray-100 dark:bg-gray-700 rounded ml-auto" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-20 text-red-500 text-sm">Erreur : {error}</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Calendar className="h-10 w-10 mb-3 text-gray-200" strokeWidth={1.5} />
            <p className="font-medium text-sm">Aucun rendez-vous trouvé</p>
            <p className="text-xs mt-1">Essayez de modifier les filtres</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="border-b border-border bg-slate-50 dark:bg-gray-800/50">
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                    Heure
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                    Patient
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                    Médecin
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                    Motif
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((appt) => (
                  <tr
                    key={appt.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-gray-800/40 transition-colors"
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-semibold text-foreground">
                        {format(new Date(appt.startsAt), "HH:mm")}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {format(new Date(appt.startsAt), "d MMM", { locale: fr })}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black text-white"
                          style={{ background: "#0891B2" }}
                        >
                          {appt.patientName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-foreground">{appt.patientName}</div>
                          <div className="text-xs text-muted-foreground">{appt.patientPhone}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-foreground font-medium">Dr. {appt.doctorName}</div>
                      <div className="text-xs text-muted-foreground">{appt.doctorSpecialty}</div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground max-w-[180px] truncate">
                      {appt.reason ?? <span className="italic text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={appt.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {appt.status === "pending" && (
                          <button
                            onClick={() => updateStatus(appt.id, "confirmed")}
                            disabled={actionLoading === appt.id}
                            className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors disabled:opacity-50"
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                            Confirmer
                          </button>
                        )}
                        {(appt.status === "pending" || appt.status === "confirmed") && (
                          <button
                            onClick={() => updateStatus(appt.id, "cancelled")}
                            disabled={actionLoading === appt.id}
                            className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            Annuler
                          </button>
                        )}
                        {appt.status !== "pending" && appt.status !== "confirmed" && (
                          <span className="text-xs text-muted-foreground/50 flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {appt.status === "completed" ? "Clôturé" : "Clôturé"}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer count */}
        {!loading && !error && filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-border flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {filtered.length} rendez-vous
              {search ? ` correspondant à "${search}"` : ""}
            </span>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {Object.entries(STATUS_LABELS).map(([k, v]) => {
                const n = filtered.filter((a) => a.status === k).length;
                if (n === 0) return null;
                return (
                  <span key={k} className={`${v.text}`}>
                    {n} {v.label.toLowerCase()}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </motion.div>

      {/* Info note about actions */}
      {!loading && filtered.length > 0 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-xs text-muted-foreground/60 flex items-center gap-1.5"
        >
          <UserRound className="h-3.5 w-3.5" />
          Les actions de confirmation et annulation sont transmises directement au médecin concerné.
        </motion.p>
      )}
    </div>
  );
}
