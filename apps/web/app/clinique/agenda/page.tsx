"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { RefreshCw, Calendar, Users, CalendarDays, Loader2 } from "lucide-react";

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

type DoctorColumn = {
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

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-orange-100 text-orange-700",
  confirmed: "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-500",
  completed: "bg-blue-100 text-blue-700",
  no_show: "bg-red-100 text-red-700",
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("fr-TN", { hour: "2-digit", minute: "2-digit" });
}

function getTodayDate(): string {
  const now = new Date();
  return now.toISOString().slice(0, 10);
}

/** Group a flat list of appointments into per-doctor columns, ordered by first appointment time */
function groupByDoctor(appointments: AgendaAppointment[]): DoctorColumn[] {
  const map = new Map<string, DoctorColumn>();
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

export default function ClinicAgendaPage() {
  const { data: session } = useSession();
  const clinicId = session?.user?.id ?? null;
  const [date, setDate] = useState<string>(getTodayDate());
  const [appointments, setAppointments] = useState<AgendaAppointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAgenda = useCallback(async () => {
    if (!clinicId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/clinique/agenda?id=${encodeURIComponent(clinicId)}&date=${date}`
      );
      if (!res.ok) {
        const d = await res.json() as { error: string };
        throw new Error(d.error ?? "Erreur inconnue");
      }
      const data = await res.json() as AgendaAppointment[];
      setAppointments(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, [clinicId, date]);

  useEffect(() => {
    fetchAgenda();
  }, [fetchAgenda]);

  const columns = groupByDoctor(appointments);
  const totalDoctors = columns.length;
  const totalAppointments = appointments.length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Agenda équipe</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Vue agrégée de tous les rendez-vous par médecin
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
            onClick={fetchAgenda}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-doktori-teal-dark disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Actualiser
          </button>
        </div>
      </div>

      {/* Summary bar */}
      <div className="flex gap-4">
        <div className="flex items-center gap-2 bg-secondary border border-border rounded-lg px-4 py-2.5">
          <Calendar className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">
            {totalAppointments} RDV
          </span>
          <span className="text-xs text-gray-500">ce jour</span>
        </div>
        <div className="flex items-center gap-2 bg-secondary border border-border rounded-lg px-4 py-2.5">
          <Users className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">
            {totalDoctors} médecin{totalDoctors !== 1 ? "s" : ""}
          </span>
          <span className="text-xs text-gray-500">avec RDV</span>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="text-center py-16 text-primary text-sm flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Chargement...</div>
      )}

      {/* Empty state (no doctors have RDVs that day) */}
      {!loading && !error && appointments.length === 0 && (
        <div className="text-center py-16 bg-white border border-border rounded-xl">
          <CalendarDays className="w-10 h-10 mx-auto mb-3 text-gray-200" />
          <p className="text-gray-400 font-medium">Aucun rendez-vous ce jour</p>
          <p className="text-xs text-gray-300 mt-1">
            Sélectionnez une autre date ou vérifiez les agendas individuels.
          </p>
        </div>
      )}

      {/* Day grid — one column per doctor, horizontal scroll when > 4 doctors */}
      {!loading && !error && columns.length > 0 && (
        <div className="overflow-x-auto pb-2">
          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns: `repeat(${columns.length}, minmax(220px, 1fr))`,
              minWidth: columns.length > 4 ? `${columns.length * 240}px` : undefined,
            }}
          >
            {columns.map((col) => (
              <div key={col.doctorId} className="flex flex-col gap-3">
                {/* Doctor header */}
                <div className="bg-primary text-white rounded-xl px-4 py-3">
                  <div className="font-semibold text-sm truncate">{col.doctorName}</div>
                  <div className="text-xs text-cyan-100 mt-0.5 truncate">
                    {col.doctorSpecialty}
                  </div>
                  <div className="text-xs text-cyan-200 mt-1">
                    {col.appointments.length} RDV
                  </div>
                </div>

                {/* Appointment tiles */}
                {col.appointments.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center border border-dashed border-border rounded-xl py-8 text-gray-300 text-xs">
                    Aucun RDV
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {col.appointments.map((appt) => (
                      <div
                        key={appt.id}
                        className="bg-white border border-border rounded-xl px-3 py-3 shadow-sm"
                      >
                        {/* Time range */}
                        <div className="text-xs font-semibold text-primary mb-1">
                          {formatTime(appt.startsAt)} – {formatTime(appt.endsAt)}
                        </div>

                        {/* Patient name */}
                        <div className="text-sm font-medium text-foreground truncate">
                          {appt.patientName}
                        </div>

                        {/* Phone */}
                        <div className="text-xs text-gray-400 mt-0.5">{appt.patientPhone}</div>

                        {/* Reason */}
                        {appt.reason && (
                          <div className="text-xs text-gray-500 mt-1 truncate" title={appt.reason}>
                            {appt.reason}
                          </div>
                        )}

                        {/* Status badge */}
                        <div className="mt-2">
                          <span
                            className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                              STATUS_STYLES[appt.status] ?? "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {STATUS_LABELS[appt.status] ?? appt.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
