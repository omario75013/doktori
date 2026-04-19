"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Printer,
  RefreshCw,
  Calendar,
  Users,
  CheckCircle2,
  Clock,
Loader2, } from "lucide-react";

type AgendaAppointment = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  reason: string | null;
  doctorId: string;
  doctorName: string;
  doctorSpecialty: string;
  patientName: string;
  patientPhone: string;
};

type DoctorGroup = {
  doctorId: string;
  doctorName: string;
  doctorSpecialty: string;
  appointments: AgendaAppointment[];
};

const STATUS_LABELS: Record<string, string> = {
  pending: "À confirmer",
  confirmed: "Confirmé",
  cancelled: "Annulé",
  completed: "Terminé",
  no_show: "Absent",
};

const STATUS_PRINT_CLASSES: Record<string, string> = {
  pending: "text-orange-600",
  confirmed: "text-green-600",
  cancelled: "text-gray-400 line-through",
  completed: "text-blue-600",
  no_show: "text-red-600",
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("fr-TN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatFullDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00Z").toLocaleDateString("fr-TN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getTodayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function groupByDoctor(appointments: AgendaAppointment[]): DoctorGroup[] {
  const map = new Map<string, DoctorGroup>();
  for (const appt of appointments) {
    if (!map.has(appt.doctorId)) {
      map.set(appt.doctorId, {
        doctorId: appt.doctorId,
        doctorName: appt.doctorName,
        doctorSpecialty: appt.doctorSpecialty,
        appointments: [],
      });
    }
    map.get(appt.doctorId)!.appointments.push(appt);
  }
  return Array.from(map.values());
}

export default function RapportJournalierPage() {
  const [date, setDate] = useState<string>(getTodayDate());
  const [appointments, setAppointments] = useState<AgendaAppointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/clinique/agenda?date=${date}`);
      if (!res.ok) {
        const d = (await res.json()) as { error: string };
        throw new Error(d.error ?? "Erreur inconnue");
      }
      const data = (await res.json()) as AgendaAppointment[];
      setAppointments(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const groups = groupByDoctor(appointments);
  const totalRDV = appointments.length;
  const confirmed = appointments.filter((a) => a.status === "confirmed").length;
  const pending = appointments.filter((a) => a.status === "pending").length;
  const cancelled = appointments.filter((a) => a.status === "cancelled").length;

  function handlePrint() {
    window.print();
  }

  return (
    <>
      {/* Print styles injected via style tag */}
      <style>{`
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          .print-container {
            padding: 0 !important;
            margin: 0 !important;
          }
          @page {
            size: A4;
            margin: 15mm 12mm;
          }
        }
        .print-only { display: none; }
      `}</style>

      <div className="space-y-5 print-container">
        {/* Screen-only header */}
        <div className="no-print flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <Printer className="w-5 h-5 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">
                Rapport journalier
              </h1>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">
              Rapport imprimable des rendez-vous de la journée
            </p>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
            />
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 bg-secondary text-foreground border border-border rounded-lg text-sm font-medium hover:bg-gray-100 dark:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              <RefreshCw
                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              />
              Actualiser
            </button>
            <button
              onClick={handlePrint}
              disabled={loading || appointments.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-doktori-teal-dark disabled:opacity-40 transition-colors"
            >
              <Printer className="w-4 h-4" />
              Imprimer
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="no-print bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="no-print text-center py-16 text-gray-400 text-sm">
            Chargement…
          </div>
        )}

        {/* Empty */}
        {!loading && !error && appointments.length === 0 && (
          <div className="no-print text-center py-16 bg-white border border-border rounded-xl">
            <Calendar className="w-10 h-10 mx-auto mb-3 text-gray-200" />
            <p className="text-gray-400 font-medium">
              Aucun rendez-vous ce jour
            </p>
            <p className="text-xs text-gray-300 mt-1">
              Sélectionnez une autre date.
            </p>
          </div>
        )}

        {/* Report content (visible on screen + print) */}
        {!loading && !error && appointments.length > 0 && (
          <div className="bg-white border border-border rounded-2xl shadow-sm overflow-hidden">
            {/* Report Header */}
            <div
              className="px-6 py-5 border-b border-border"
              style={{ borderLeft: "4px solid #0891B2" }}
            >
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                  <h2 className="text-xl font-bold text-foreground">
                    Rapport journalier — Doktori
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 capitalize">
                    {formatFullDate(date)}
                  </p>
                </div>
                <div className="text-right text-xs text-gray-400 dark:text-gray-500">
                  Généré le{" "}
                  {new Date().toLocaleString("fr-TN", {
                    day: "numeric",
                    month: "long",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-border border-b border-border">
              <SummaryCell
                icon={<Calendar className="w-4 h-4 text-primary" />}
                label="Total RDV"
                value={totalRDV}
              />
              <SummaryCell
                icon={<CheckCircle2 className="w-4 h-4 text-green-500" />}
                label="Confirmés"
                value={confirmed}
              />
              <SummaryCell
                icon={<Clock className="w-4 h-4 text-orange-500" />}
                label="En attente"
                value={pending}
              />
              <SummaryCell
                icon={<Users className="w-4 h-4 text-gray-400 dark:text-gray-500" />}
                label="Médecins"
                value={groups.length}
              />
            </div>

            {/* Per-doctor sections */}
            <div className="divide-y divide-border">
              {groups.map((group) => (
                <DoctorSection key={group.doctorId} group={group} />
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function SummaryCell({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 px-4 py-4">
      {icon}
      <span className="text-xl font-bold text-foreground">{value}</span>
      <span className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">{label}</span>
    </div>
  );
}

function DoctorSection({ group }: { group: DoctorGroup }) {
  const confirmedCount = group.appointments.filter(
    (a) => a.status === "confirmed"
  ).length;

  return (
    <div className="px-6 py-5">
      {/* Doctor header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-base font-bold text-foreground">
            Dr. {group.doctorName}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">{group.doctorSpecialty}</p>
        </div>
        <div className="text-right text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">
          {group.appointments.length} RDV •{" "}
          <span className="text-green-600">{confirmedCount} confirmé{confirmedCount !== 1 ? "s" : ""}</span>
        </div>
      </div>

      {/* Appointments table */}
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-800">
            <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 rounded-tl-lg">
              Heure
            </th>
            <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 dark:text-gray-500">
              Patient
            </th>
            <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 dark:text-gray-500">
              Téléphone
            </th>
            <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 dark:text-gray-500">
              Motif
            </th>
            <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 rounded-tr-lg">
              Statut
            </th>
          </tr>
        </thead>
        <tbody>
          {group.appointments.map((appt, idx) => (
            <tr
              key={appt.id}
              className={idx % 2 === 0 ? "bg-white" : "bg-gray-50 dark:bg-gray-800/40"}
            >
              <td className="px-3 py-2 font-mono text-xs text-primary whitespace-nowrap">
                {formatTime(appt.startsAt)} – {formatTime(appt.endsAt)}
              </td>
              <td className="px-3 py-2 font-medium text-foreground">
                {appt.patientName}
              </td>
              <td className="px-3 py-2 text-gray-500 dark:text-gray-400 text-xs">
                {appt.patientPhone}
              </td>
              <td className="px-3 py-2 text-gray-500 dark:text-gray-400 text-xs max-w-[200px] truncate">
                {appt.reason ?? "—"}
              </td>
              <td className="px-3 py-2 text-xs">
                <span
                  className={
                    STATUS_PRINT_CLASSES[appt.status] ??
                    "text-gray-500 dark:text-gray-400 dark:text-gray-500"
                  }
                >
                  {STATUS_LABELS[appt.status] ?? appt.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
