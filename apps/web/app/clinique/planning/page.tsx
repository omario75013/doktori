"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw, CalendarRange, Users, Check, Clock, Loader2 } from "lucide-react";

type SlotStatus = "free" | "booked" | "off";

type Slot = {
  time: string;
  status: SlotStatus;
  patientName?: string;
  appointmentId?: string;
};

type DoctorPlan = {
  id: string;
  name: string;
  specialty: string;
  slots: Slot[];
};

type PlanningResponse = {
  doctors: DoctorPlan[];
};

/** All grid hours 08:00-17:30 */
const GRID_HOURS: string[] = [];
for (let h = 8; h < 18; h++) {
  GRID_HOURS.push(`${String(h).padStart(2, "0")}:00`);
  GRID_HOURS.push(`${String(h).padStart(2, "0")}:30`);
}

function getTodayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function SlotCell({ slot }: { slot: Slot }) {
  if (slot.status === "off") {
    return (
      <div className="h-8 rounded bg-gray-50 dark:bg-gray-800 border border-gray-100" />
    );
  }

  if (slot.status === "booked") {
    return (
      <div
        className="h-8 rounded px-1.5 flex items-center gap-1 overflow-hidden"
        style={{ background: "#0E7490", border: "1px solid #0891B2" }}
        title={slot.patientName}
      >
        <span className="text-[10px] text-white font-medium truncate">
          {slot.patientName}
        </span>
      </div>
    );
  }

  // free
  return (
    <div className="h-8 rounded bg-teal-50 border border-teal-200 flex items-center justify-center">
      <Check className="w-3 h-3 text-teal-500" />
    </div>
  );
}

export default function PlanningPage() {
  const [date, setDate] = useState<string>(getTodayDate());
  const [data, setData] = useState<DoctorPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPlanning = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/clinique/planning?date=${date}`);
      if (!res.ok) {
        const d = (await res.json()) as { error: string };
        throw new Error(d.error ?? "Erreur inconnue");
      }
      const json = (await res.json()) as PlanningResponse;
      setData(json.doctors ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    fetchPlanning();
  }, [fetchPlanning]);

  const freeTotal = data.reduce(
    (acc, d) => acc + d.slots.filter((s) => s.status === "free").length,
    0
  );
  const bookedTotal = data.reduce(
    (acc, d) => acc + d.slots.filter((s) => s.status === "booked").length,
    0
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <CalendarRange className="w-5 h-5 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">
              Planning équipe
            </h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">
            Vue comparative des disponibilités par médecin
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
            onClick={fetchPlanning}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-doktori-teal-dark disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Actualiser
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 bg-secondary border border-border rounded-lg px-4 py-2.5">
          <Users className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">
            {data.length}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">médecin{data.length !== 1 ? "s" : ""}</span>
        </div>

        <div className="flex items-center gap-2 bg-teal-50 border border-teal-200 rounded-lg px-4 py-2.5">
          <Check className="w-4 h-4 text-teal-600" />
          <span className="text-sm font-semibold text-teal-700">
            {freeTotal}
          </span>
          <span className="text-xs text-teal-600">créneaux libres</span>
        </div>

        <div className="flex items-center gap-2 bg-cyan-50 border border-cyan-200 rounded-lg px-4 py-2.5">
          <Clock className="w-4 h-4 text-cyan-700" />
          <span className="text-sm font-semibold text-cyan-700">
            {bookedTotal}
          </span>
          <span className="text-xs text-cyan-600">RDV réservés</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-teal-50 border border-teal-200" />
          Libre
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className="w-4 h-4 rounded"
            style={{ background: "#0E7490", border: "1px solid #0891B2" }}
          />
          Réservé
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-gray-50 dark:bg-gray-800 border border-gray-100" />
          Hors planning
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-16 text-gray-400 text-sm">
          Chargement…
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && data.length === 0 && (
        <div className="text-center py-16 bg-white border border-border rounded-xl">
          <CalendarRange className="w-10 h-10 mx-auto mb-3 text-gray-200" />
          <p className="text-gray-400 font-medium">Aucun médecin ce jour</p>
          <p className="text-xs text-gray-300 mt-1">
            Sélectionnez une autre date ou ajoutez des médecins à la clinique.
          </p>
        </div>
      )}

      {/* Grid */}
      {!loading && !error && data.length > 0 && (
        <div className="overflow-x-auto pb-4 rounded-xl border border-border bg-white shadow-sm">
          <table
            className="w-full text-xs"
            style={{ minWidth: `${120 + data.length * 150}px` }}
          >
            <thead>
              <tr>
                {/* Time column header */}
                <th className="sticky left-0 bg-white z-10 px-3 py-3 text-left font-semibold text-gray-500 dark:text-gray-400 border-b border-border w-20">
                  Heure
                </th>
                {/* Doctor columns */}
                {data.map((doctor) => (
                  <th
                    key={doctor.id}
                    className="px-2 py-3 border-b border-border font-semibold"
                    style={{ minWidth: 140 }}
                  >
                    <div
                      className="text-white rounded-lg px-2 py-1.5 text-center"
                      style={{ background: "#0891B2" }}
                    >
                      <div className="truncate text-sm font-semibold">
                        {doctor.name}
                      </div>
                      <div className="text-[10px] text-cyan-100 truncate mt-0.5">
                        {doctor.specialty}
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {GRID_HOURS.map((hour) => (
                <tr
                  key={hour}
                  className="border-b border-gray-50 hover:bg-gray-50 dark:bg-gray-800/50 transition-colors"
                >
                  {/* Time label */}
                  <td className="sticky left-0 bg-white px-3 py-1 text-gray-400 font-mono whitespace-nowrap">
                    {hour}
                  </td>

                  {/* Slot cells per doctor */}
                  {data.map((doctor) => {
                    const slot = doctor.slots.find((s) => s.time === hour);
                    return (
                      <td key={doctor.id} className="px-2 py-1">
                        {slot ? (
                          <SlotCell slot={slot} />
                        ) : (
                          <div className="h-8 rounded bg-gray-50 dark:bg-gray-800 border border-gray-100" />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
