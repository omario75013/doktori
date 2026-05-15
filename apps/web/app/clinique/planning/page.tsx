"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import {
  RefreshCw,
  CalendarRange,
  Users,
  Check,
  Clock,
  Loader2,
  SlidersHorizontal,
  X,
  Search,
} from "lucide-react";

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

interface PlanningFilters {
  date: string;
  doctorId: string;
  status: string; // "all" | "free" | "booked"
  search: string;
}

const LS_KEY_PREFIX = "doktori:clinique:planning:";

/** All grid hours 08:00-17:30 */
const GRID_HOURS: string[] = [];
for (let h = 8; h < 18; h++) {
  GRID_HOURS.push(`${String(h).padStart(2, "0")}:00`);
  GRID_HOURS.push(`${String(h).padStart(2, "0")}:30`);
}

function getTodayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDateLabel(dateStr: string): string {
  const today = getTodayDate();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  if (dateStr === today) return "Aujourd'hui";
  if (dateStr === tomorrowStr) return "Demain";
  return new Date(dateStr).toLocaleDateString("fr-TN", {
    day: "numeric",
    month: "short",
  });
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
  const { data: session } = useSession();
  const clinicId = (session?.user as { id?: string } | undefined)?.id ?? "unknown";
  const lsKey = `${LS_KEY_PREFIX}${clinicId}`;

  const defaultFilters: PlanningFilters = {
    date: getTodayDate(),
    doctorId: "all",
    status: "all",
    search: "",
  };

  const [filters, setFilters] = useState<PlanningFilters>(defaultFilters);
  const [data, setData] = useState<DoctorPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hydrate filters from localStorage once clinicId is known
  const hydrated = useRef(false);
  useEffect(() => {
    if (clinicId === "unknown" || hydrated.current) return;
    hydrated.current = true;
    try {
      const raw = localStorage.getItem(lsKey);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<PlanningFilters>;
        setFilters((prev) => ({
          ...prev,
          date:
            saved.date && /^\d{4}-\d{2}-\d{2}$/.test(saved.date)
              ? saved.date
              : prev.date,
          doctorId: saved.doctorId ?? prev.doctorId,
          status: saved.status ?? prev.status,
          search: saved.search ?? prev.search,
        }));
      }
    } catch {
      // ignore
    }
  }, [clinicId, lsKey]);

  // Persist filters to localStorage whenever they change
  useEffect(() => {
    if (clinicId === "unknown") return;
    try {
      localStorage.setItem(lsKey, JSON.stringify(filters));
    } catch {
      // ignore
    }
  }, [lsKey, clinicId, filters]);

  const fetchPlanning = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/clinique/planning?date=${filters.date}`);
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
  }, [filters.date]);

  useEffect(() => {
    fetchPlanning();
  }, [fetchPlanning]);

  function resetFilters() {
    setFilters(defaultFilters);
    try {
      localStorage.removeItem(lsKey);
    } catch {
      /* ignore */
    }
  }

  const today = getTodayDate();
  const isModified =
    filters.date !== today ||
    filters.doctorId !== "all" ||
    filters.status !== "all" ||
    filters.search.trim() !== "";

  const activeFilterCount = [
    filters.date !== today,
    filters.doctorId !== "all",
    filters.status !== "all",
    filters.search.trim() !== "",
  ].filter(Boolean).length;

  // Apply client-side filters (doctor + status + search)
  const filteredData = data
    .filter((doc) => filters.doctorId === "all" || doc.id === filters.doctorId)
    .filter((doc) => {
      if (filters.search.trim() === "") return true;
      const q = filters.search.toLowerCase();
      return (
        doc.name.toLowerCase().includes(q) ||
        doc.specialty.toLowerCase().includes(q) ||
        doc.slots.some(
          (s) => s.patientName && s.patientName.toLowerCase().includes(q)
        )
      );
    })
    .map((doc) => {
      if (filters.status === "all") return doc;
      return {
        ...doc,
        slots: doc.slots.map((s) => {
          if (filters.status === "free" && s.status !== "free") {
            return { ...s, status: "off" as SlotStatus };
          }
          if (filters.status === "booked" && s.status !== "booked") {
            return { ...s, status: "off" as SlotStatus };
          }
          return s;
        }),
      };
    });

  const freeTotal = filteredData.reduce(
    (acc, d) => acc + d.slots.filter((s) => s.status === "free").length,
    0
  );
  const bookedTotal = filteredData.reduce(
    (acc, d) => acc + d.slots.filter((s) => s.status === "booked").length,
    0
  );

  // Quick date presets
  function getDatePreset(offset: number): string {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return d.toISOString().slice(0, 10);
  }

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
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Vue comparative des disponibilités par médecin
          </p>
        </div>

        <button
          onClick={fetchPlanning}
          disabled={loading}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-doktori-teal-dark disabled:opacity-50 transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Actualiser
        </button>
      </div>

      {/* ── Filter bar ────────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-border p-4 space-y-3 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Date */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
              Date
            </label>
            <input
              type="date"
              value={filters.date}
              onChange={(e) =>
                setFilters((f) => ({ ...f, date: e.target.value }))
              }
              className="w-full h-9 border border-border rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-gray-800"
            />
            {/* Quick presets */}
            <div className="flex gap-1 mt-1.5 flex-wrap">
              {[
                { label: "Auj.", offset: 0 },
                { label: "Demain", offset: 1 },
                { label: "+7 j", offset: 7 },
              ].map(({ label, offset }) => {
                const d = getDatePreset(offset);
                return (
                  <button
                    key={label}
                    onClick={() => setFilters((f) => ({ ...f, date: d }))}
                    className={`text-[10px] px-1.5 py-0.5 rounded font-medium transition-colors ${
                      filters.date === d
                        ? "bg-primary text-white"
                        : "bg-slate-100 text-gray-600 hover:bg-slate-200"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Doctor */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
              Médecin
            </label>
            <select
              value={filters.doctorId}
              onChange={(e) =>
                setFilters((f) => ({ ...f, doctorId: e.target.value }))
              }
              className="w-full h-9 border border-border rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-gray-800"
            >
              <option value="all">Tous les médecins</option>
              {data.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
              Disponibilité
            </label>
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters((f) => ({ ...f, status: e.target.value }))
              }
              className="w-full h-9 border border-border rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-gray-800"
            >
              <option value="all">Tout</option>
              <option value="free">Libres</option>
              <option value="booked">Réservés</option>
            </select>
          </div>

          {/* Search */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
              Recherche
            </label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, search: e.target.value }))
                }
                placeholder="Nom patient, médecin…"
                className="w-full h-9 border border-border rounded-lg pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-gray-800"
              />
              {filters.search && (
                <button
                  onClick={() => setFilters((f) => ({ ...f, search: "" }))}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Active filters pill + reset */}
        {isModified && (
          <div className="flex items-center gap-2 pt-1">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-50 border border-cyan-200 px-3 py-1 text-xs font-semibold text-cyan-700">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              {activeFilterCount} filtre{activeFilterCount !== 1 ? "s" : ""} actif
              {activeFilterCount !== 1 ? "s" : ""} · {formatDateLabel(filters.date)}
            </span>
            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-red-500 transition-colors"
            >
              <X className="h-3 w-3" />
              Réinitialiser
            </button>
          </div>
        )}
      </div>

      {/* Stats bar */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 bg-secondary border border-border rounded-lg px-4 py-2.5">
          <Users className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">
            {filteredData.length}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            médecin{filteredData.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="flex items-center gap-2 bg-teal-50 border border-teal-200 rounded-lg px-4 py-2.5">
          <Check className="w-4 h-4 text-teal-600" />
          <span className="text-sm font-semibold text-teal-700">{freeTotal}</span>
          <span className="text-xs text-teal-600">créneaux libres</span>
        </div>

        <div className="flex items-center gap-2 bg-cyan-50 border border-cyan-200 rounded-lg px-4 py-2.5">
          <Clock className="w-4 h-4 text-cyan-700" />
          <span className="text-sm font-semibold text-cyan-700">{bookedTotal}</span>
          <span className="text-xs text-cyan-600">RDV réservés</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
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
        <div className="text-center py-16 text-gray-400 text-sm flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Chargement…
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && filteredData.length === 0 && (
        <div className="text-center py-16 bg-white border border-border rounded-xl">
          <CalendarRange className="w-10 h-10 mx-auto mb-3 text-gray-200" />
          <p className="text-gray-400 font-medium">Aucun médecin ce jour</p>
          <p className="text-xs text-gray-300 mt-1">
            Sélectionnez une autre date ou ajoutez des médecins à la clinique.
          </p>
        </div>
      )}

      {/* Grid */}
      {!loading && !error && filteredData.length > 0 && (
        <div className="overflow-x-auto pb-4 rounded-xl border border-border bg-white shadow-sm">
          <table
            className="w-full text-xs"
            style={{ minWidth: `${120 + filteredData.length * 150}px` }}
          >
            <thead>
              <tr>
                {/* Time column header */}
                <th className="sticky left-0 bg-white z-10 px-3 py-3 text-left font-semibold text-gray-500 dark:text-gray-400 border-b border-border w-20">
                  Heure
                </th>
                {/* Doctor columns */}
                {filteredData.map((doctor) => (
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
                  {filteredData.map((doctor) => {
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
