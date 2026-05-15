"use client";

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { formatDoctorName } from "@/lib/format-doctor-name";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
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
  DoorOpen,
  SlidersHorizontal,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

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
  clinicRoomId: string | null;
  clinicRoomName: string | null;
  clinicRoomColor: string | null;
}

interface ApiResponse {
  rows?: Appointment[];
  page?: number;
  pageSize?: number;
  total?: number;
  error?: string;
  // legacy compat — old field name was `appointments`
  appointments?: Appointment[];
}

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  role: string;
}

interface ClinicRoom {
  id: string;
  name: string;
  color: string;
  siteId: string;
  siteName?: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const LS_KEY_PREFIX = "doktori:clinique:rdv:";

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

const PAGE_SIZES = [25, 50, 100];

// ── Helpers ───────────────────────────────────────────────────────────────────

function RoomChip({ name, color }: { name: string; color: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold text-white"
      style={{ background: color }}
    >
      <DoorOpen className="h-3 w-3 shrink-0" />
      {name}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_LABELS[status] ?? { label: status, bg: "bg-gray-100", text: "text-gray-600" };
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  );
}

// ── Inner component (uses useSearchParams — must be inside Suspense) ───────────

function RendezVousInner() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Clinic id from session for localStorage key
  const clinicId = (session?.user as { id?: string } | undefined)?.id ?? "unknown";
  const lsKey = `${LS_KEY_PREFIX}${clinicId}`;

  // ── Filter state — initialise from URL, then localStorage, then defaults ──
  const [doctorFilter, setDoctorFilter] = useState(() => searchParams.get("doctorId") ?? "");
  const [statusFilter, setStatusFilter] = useState(() => searchParams.get("status") ?? "");
  const [dateFilter, setDateFilter] = useState(() => searchParams.get("date") ?? "today");
  const [roomFilter, setRoomFilter] = useState(() => searchParams.get("roomId") ?? "");
  const [search, setSearch] = useState(() => searchParams.get("q") ?? "");

  // ── Pagination state — initialise from URL ─────────────────────────────────
  const [page, setPage] = useState(() => {
    const p = parseInt(searchParams.get("page") ?? "1", 10);
    return isNaN(p) || p < 1 ? 1 : p;
  });
  const [pageSize, setPageSize] = useState(() => {
    const ps = parseInt(searchParams.get("pageSize") ?? "50", 10);
    return PAGE_SIZES.includes(ps) ? ps : 50;
  });
  const [total, setTotal] = useState(0);

  // ── Data state ─────────────────────────────────────────────────────────────
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [rooms, setRooms] = useState<ClinicRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [assigningRoomFor, setAssigningRoomFor] = useState<string | null>(null);

  // ── LocalStorage hydration — runs once clinicId is known ──────────────────
  const hydrated = useRef(false);
  useEffect(() => {
    if (clinicId === "unknown" || hydrated.current) return;
    // Only hydrate from localStorage if URL has no filter params
    const hasUrlFilters =
      searchParams.has("doctorId") ||
      searchParams.has("status") ||
      searchParams.has("date") ||
      searchParams.has("roomId") ||
      searchParams.has("q");
    if (!hasUrlFilters) {
      try {
        const raw = localStorage.getItem(lsKey);
        if (raw) {
          const saved = JSON.parse(raw) as {
            doctorFilter?: string;
            statusFilter?: string;
            dateFilter?: string;
            roomFilter?: string;
            search?: string;
          };
          if (saved.doctorFilter !== undefined) setDoctorFilter(saved.doctorFilter);
          if (saved.statusFilter !== undefined) setStatusFilter(saved.statusFilter);
          if (saved.dateFilter !== undefined) setDateFilter(saved.dateFilter);
          if (saved.roomFilter !== undefined) setRoomFilter(saved.roomFilter);
          if (saved.search !== undefined) setSearch(saved.search);
        }
      } catch {
        // ignore malformed localStorage
      }
    }
    hydrated.current = true;
  }, [clinicId, lsKey, searchParams]);

  // ── Persist filters to localStorage (debounced 200ms for search) ──────────
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!hydrated.current) return;
    const persist = () => {
      try {
        localStorage.setItem(
          lsKey,
          JSON.stringify({ doctorFilter, statusFilter, dateFilter, roomFilter, search })
        );
      } catch {
        // ignore quota errors
      }
    };
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(persist, 200);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [lsKey, doctorFilter, statusFilter, dateFilter, roomFilter, search]);

  // ── Sync URL ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams();
    if (doctorFilter) params.set("doctorId", doctorFilter);
    if (statusFilter) params.set("status", statusFilter);
    if (dateFilter) params.set("date", dateFilter);
    if (roomFilter) params.set("roomId", roomFilter);
    if (search) params.set("q", search);
    if (page > 1) params.set("page", String(page));
    if (pageSize !== 50) params.set("pageSize", String(pageSize));
    router.replace(`/clinique/rendez-vous?${params.toString()}`, { scroll: false });
  }, [router, doctorFilter, statusFilter, dateFilter, roomFilter, search, page, pageSize]);

  // ── Fetch appointments ─────────────────────────────────────────────────────
  const fetchAppointments = useCallback(() => {
    const params = new URLSearchParams();
    if (doctorFilter) params.set("doctorId", doctorFilter);
    if (statusFilter) params.set("status", statusFilter);
    if (dateFilter) params.set("date", dateFilter);
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));

    setLoading(true);
    fetch(`/api/clinique/appointments?${params}`)
      .then((r) => r.json())
      .then((data: ApiResponse) => {
        if (data.error) throw new Error(data.error);
        // Support both new `rows` shape and legacy `appointments` shape
        setAppointments(data.rows ?? data.appointments ?? []);
        setTotal(data.total ?? data.rows?.length ?? data.appointments?.length ?? 0);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [doctorFilter, statusFilter, dateFilter, page, pageSize]);

  // Load doctors + rooms once
  useEffect(() => {
    fetch("/api/clinique/doctors")
      .then((r) => r.json())
      .then((data: { doctors?: Doctor[] }) => setDoctors(data.doctors ?? []))
      .catch(() => {});
    fetch("/api/clinique/rooms")
      .then((r) => r.json())
      .then((data: { rooms?: ClinicRoom[] }) => setRooms(data.rooms ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // ── Filter change helpers — reset to page 1 ───────────────────────────────
  function changeDoctor(v: string) { setDoctorFilter(v); setPage(1); }
  function changeStatus(v: string) { setStatusFilter(v); setPage(1); }
  function changeDate(v: string) { setDateFilter(v); setPage(1); }
  function changeRoom(v: string) { setRoomFilter(v); setPage(1); }
  function changeSearch(v: string) { setSearch(v); setPage(1); }
  function changePageSize(v: number) { setPageSize(v); setPage(1); }

  // ── Reset all filters ─────────────────────────────────────────────────────
  function resetFilters() {
    setDoctorFilter("");
    setStatusFilter("");
    setDateFilter("today");
    setRoomFilter("");
    setSearch("");
    setPage(1);
    try { localStorage.removeItem(lsKey); } catch { /* ignore */ }
  }

  // ── Active filter count ───────────────────────────────────────────────────
  const activeFilterCount = [
    doctorFilter,
    statusFilter,
    dateFilter && dateFilter !== "today" ? dateFilter : "",
    roomFilter,
    search,
  ].filter(Boolean).length;

  // ── Status updates ────────────────────────────────────────────────────────
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

  // ── Room assignment ───────────────────────────────────────────────────────
  async function assignRoom(appointmentId: string, clinicRoomId: string | null) {
    setAssigningRoomFor(appointmentId);
    try {
      const res = await fetch(`/api/clinique/appointments/${appointmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clinicRoomId }),
      });
      if (!res.ok) throw new Error("Erreur lors de l'affectation");
      setAppointments((prev) =>
        prev.map((a) => {
          if (a.id !== appointmentId) return a;
          const room = rooms.find((r) => r.id === clinicRoomId);
          return {
            ...a,
            clinicRoomId: clinicRoomId ?? null,
            clinicRoomName: room?.name ?? null,
            clinicRoomColor: room?.color ?? null,
          };
        }),
      );
    } catch {
      alert("Impossible d'affecter la salle.");
    } finally {
      setAssigningRoomFor(null);
    }
  }

  // ── Client-side search + room filter (applied on top of server results) ────
  const filtered = appointments.filter((a) => {
    if (roomFilter && a.clinicRoomId !== roomFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      a.patientName.toLowerCase().includes(q) ||
      a.doctorName.toLowerCase().includes(q) ||
      (a.reason ?? "").toLowerCase().includes(q)
    );
  });

  // ── Pagination computed ───────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // ── Render ────────────────────────────────────────────────────────────────
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
        className="bg-white dark:bg-gray-900 rounded-2xl border border-border p-4 shadow-sm space-y-3"
      >
        {/* Active filter hint pill */}
        {activeFilterCount > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-50 border border-cyan-200 px-3 py-1 text-xs font-semibold text-cyan-700">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filtres enregistrés · {activeFilterCount} actif{activeFilterCount > 1 ? "s" : ""}
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

        <div className="flex flex-wrap gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Rechercher patient, médecin…"
              value={search}
              onChange={(e) => changeSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
            />
          </div>

          {/* Doctor filter */}
          <div className="relative">
            <select
              value={doctorFilter}
              onChange={(e) => changeDoctor(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
            >
              <option value="">Tous les médecins</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {formatDoctorName(d.name)}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          </div>

          {/* Status filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => changeStatus(e.target.value)}
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
              onChange={(e) => changeDate(e.target.value)}
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

          {/* Room filter */}
          {rooms.length > 0 && (
            <div className="relative">
              <select
                value={roomFilter}
                onChange={(e) => changeRoom(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
              >
                <option value="">Toutes les salles</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            </div>
          )}
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
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                    Salle
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
                      <div className="text-foreground font-medium">{formatDoctorName(appt.doctorName)}</div>
                      <div className="text-xs text-muted-foreground">{appt.doctorSpecialty}</div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground max-w-[180px] truncate">
                      {appt.reason ?? <span className="italic text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={appt.status} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {appt.clinicRoomId && appt.clinicRoomName && appt.clinicRoomColor ? (
                        <div className="flex items-center gap-1 group relative">
                          <RoomChip name={appt.clinicRoomName} color={appt.clinicRoomColor} />
                          <select
                            className="absolute inset-0 opacity-0 cursor-pointer w-full"
                            value={appt.clinicRoomId}
                            onChange={(e) => assignRoom(appt.id, e.target.value || null)}
                            disabled={assigningRoomFor === appt.id}
                            title="Changer de salle"
                          >
                            <option value="">— Aucune salle —</option>
                            {rooms.map((r) => (
                              <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        rooms.length > 0 ? (
                          <select
                            className="appearance-none rounded-lg border border-dashed border-border bg-transparent px-2 py-1 text-xs text-muted-foreground focus:outline-none focus:border-primary cursor-pointer"
                            value=""
                            onChange={(e) => e.target.value && assignRoom(appt.id, e.target.value)}
                            disabled={assigningRoomFor === appt.id}
                          >
                            <option value="">Affecter une salle</option>
                            {rooms.map((r) => (
                              <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )
                      )}
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

        {/* Footer: count summary + pagination */}
        {!loading && !error && (
          <div className="px-4 py-3 border-t border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {/* Left: result counts */}
            <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
              <span>
                {total} rendez-vous
                {search ? ` · filtrés par "${search}"` : ""}
              </span>
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

            {/* Right: page-size + page controls */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Page size selector */}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span>Par page :</span>
                <div className="flex gap-1">
                  {PAGE_SIZES.map((ps) => (
                    <button
                      key={ps}
                      onClick={() => changePageSize(ps)}
                      className={[
                        "px-2 py-0.5 rounded text-xs font-semibold border transition-colors",
                        pageSize === ps
                          ? "bg-primary text-white border-primary"
                          : "border-border text-muted-foreground hover:border-primary hover:text-primary",
                      ].join(" ")}
                    >
                      {ps}
                    </button>
                  ))}
                </div>
              </div>

              {/* Page navigation */}
              {totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="p-1 rounded-lg border border-border hover:border-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    aria-label="Page précédente"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-xs text-muted-foreground px-1 tabular-nums">
                    Page {page} sur {totalPages} ({total} résultats)
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="p-1 rounded-lg border border-border hover:border-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    aria-label="Page suivante"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
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

// ── Page wrapper (Suspense boundary required for useSearchParams) ──────────────

export default function RendezVousPage() {
  return (
    <Suspense>
      <RendezVousInner />
    </Suspense>
  );
}
