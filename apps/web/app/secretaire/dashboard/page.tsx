"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { format, isToday, isTomorrow, addDays, startOfDay, differenceInMinutes } from "date-fns";
import { fr } from "date-fns/locale";
import {
  CalendarDays,
  Users,
  CalendarPlus,
  UserPlus,
  Clock,
  CheckCircle2,
  AlertCircle,
  Phone,
  Coffee,
  ChevronRight,
  Plus,
  Minus,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

type Appointment = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  type: string;
  reason: string | null;
  patientName: string;
  patientPhone: string;
  patientId: string;
  checkedInAt: string | null;
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-orange-100 text-orange-700 border border-orange-200",
  confirmed: "bg-teal-50 text-teal-700 border border-teal-200",
  cancelled: "bg-gray-100 text-gray-500 border border-gray-200",
  completed: "bg-blue-50 text-blue-700 border border-blue-200",
  no_show: "bg-red-100 text-red-700 border border-red-200",
};

const STATUS_TIMELINE_BG: Record<string, string> = {
  pending: "border-l-orange-400 bg-orange-50/30 dark:bg-orange-900/10",
  confirmed: "border-l-teal-400 bg-teal-50/30 dark:bg-teal-900/10",
  cancelled: "border-l-gray-300 bg-gray-50/30 dark:bg-gray-800/20",
  completed: "border-l-blue-400 bg-blue-50/30 dark:bg-blue-900/10",
  no_show: "border-l-red-400 bg-red-50/30 dark:bg-red-900/10",
};

function StatCard({
  label,
  value,
  iconColor,
  index,
  children,
}: {
  label: string;
  value: number;
  iconColor: string;
  index: number;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.1 + index * 0.07, ease: "easeOut" }}
      className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-border shadow-sm"
    >
      <div className="flex items-center gap-2 mb-3">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ background: "#F0FDFA" }}
        >
          <span style={{ color: iconColor }} className="flex items-center">
            {children}
          </span>
        </div>
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
      </div>
      <div className="text-3xl font-black text-foreground">{value}</div>
    </motion.div>
  );
}

export default function SecretaireDashboardPage() {
  const { data: session, status } = useSession();
  const t = useTranslations("secretaire.dashboard");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());

  // Status labels built inside component to use t()
  const STATUS_LABELS: Record<string, string> = {
    pending: t("statusPending"),
    confirmed: t("statusConfirmed"),
    cancelled: t("statusCancelled"),
    completed: t("statusCompleted"),
    no_show: t("statusNoShow"),
  };

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  // ── Waiting-room manual counter ──────────────────────────────────
  // The list below tracks patients who were checked in against a
  // specific appointment. The secretary also needs to count walk-ins
  // and patients waiting without a slot — this counter does that.
  const [waitingCount, setWaitingCount] = useState(0);
  const [waitingBusy, setWaitingBusy] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    let sock: import("socket.io-client").Socket | null = null;

    async function pull() {
      try {
        const r = await fetch("/api/doctor/waiting-room", { credentials: "include" });
        if (!r.ok || cancelled) return;
        const d = await r.json();
        if (typeof d.count === "number") setWaitingCount(d.count);
      } catch {
        /* ignore */
      }
    }

    async function joinWaitingRoom() {
      try {
        // Need the doctorId to join the right WS room.
        const pr = await fetch("/api/secretary/profile", { credentials: "include" });
        if (!pr.ok || cancelled) return;
        const profile = await pr.json();
        const docId = profile?.doctorId;
        if (!docId) return;
        const { io } = await import("socket.io-client");
        if (cancelled) return;
        const url =
          typeof window !== "undefined"
            ? `${window.location.protocol}//${window.location.hostname}:3010`
            : "http://localhost:3010";
        sock = io(url, {
          path: "/sos-socket",
          transports: ["websocket", "polling"],
          reconnection: true,
          reconnectionDelay: 500,
        });
        sock.on("connect", () => sock?.emit("join-waiting-room", docId));
        sock.on("waiting:update", (payload: { count?: number }) => {
          if (typeof payload?.count === "number") setWaitingCount(payload.count);
        });
      } catch {
        /* WS unavailable — poll fallback covers this */
      }
    }

    void pull();
    void joinWaitingRoom();
    // 30s safety-net poll for missed WS pushes on disconnect/reconnect.
    const id = setInterval(pull, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
      try {
        sock?.disconnect();
      } catch {
        /* ignore */
      }
    };
  }, [status]);

  async function changeWaiting(op: "inc" | "dec" | "set", value?: number) {
    if (waitingBusy) return;
    const prev = waitingCount;
    const next =
      op === "inc" ? Math.min(prev + 1, 50)
      : op === "dec" ? Math.max(prev - 1, 0)
      : Math.max(0, Math.min(value ?? 0, 50));
    setWaitingCount(next);
    setWaitingBusy(true);
    try {
      const r = await fetch("/api/doctor/waiting-room", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(op === "set" ? { op, value: next } : { op }),
      });
      if (r.ok) {
        const d = await r.json();
        if (typeof d.count === "number") setWaitingCount(d.count);
      } else {
        setWaitingCount(prev);
      }
    } catch {
      setWaitingCount(prev);
    } finally {
      setWaitingBusy(false);
    }
  }

  useEffect(() => {
    if (status !== "authenticated") return;
    setLoading(true);
    fetch("/api/secretaire/appointments")
      .then((r) => {
        if (!r.ok) return r.json().then((d: { error: string }) => Promise.reject(d.error));
        return r.json() as Promise<Appointment[]>;
      })
      .then((data) => setAppointments(data))
      .catch((err: string) => setError(err ?? t("errorUnknown")))
      .finally(() => setLoading(false));
  }, [status]);

  if (status === "loading" || loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-7 w-56 bg-gray-200 rounded mb-2" />
          <div className="h-4 w-40 bg-gray-100 rounded" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-5 border border-border animate-pulse">
              <div className="h-3 w-20 bg-gray-200 rounded mb-3" />
              <div className="h-8 w-16 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20 text-red-500 text-sm">{t("errorPrefix", { message: error })}</div>
    );
  }

  const todayAppointments = appointments
    .filter((a) => isToday(new Date(a.startsAt)))
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

  const pendingCount = todayAppointments.filter((a) => a.status === "pending").length;
  const confirmedCount = todayAppointments.filter((a) => a.status === "confirmed").length;
  const noShowCount = todayAppointments.filter((a) => a.status === "no_show").length;

  // Waiting room: checked in, not yet completed or cancelled
  const waitingPatients = todayAppointments.filter(
    (a) => a.checkedInAt && a.status !== "completed" && a.status !== "cancelled" && a.status !== "no_show"
  );

  // Next confirmed patient (future, not started yet)
  const nextConfirmed = todayAppointments.find(
    (a) => a.status === "confirmed" && new Date(a.startsAt) > now
  );

  // Upcoming next 3 days (excluding today)
  const day1Start = startOfDay(addDays(now, 1));
  const day3End = startOfDay(addDays(now, 4));
  const upcomingAppts = appointments
    .filter((a) => {
      const d = new Date(a.startsAt);
      return d >= day1Start && d < day3End;
    })
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

  // Group upcoming by day
  const upcomingByDay: Record<string, Appointment[]> = {};
  for (const a of upcomingAppts) {
    const key = format(new Date(a.startsAt), "yyyy-MM-dd");
    if (!upcomingByDay[key]) upcomingByDay[key] = [];
    upcomingByDay[key].push(a);
  }
  const upcomingDays = Object.keys(upcomingByDay).slice(0, 3);

  const todayStr = format(now, "EEEE d MMMM yyyy", { locale: fr });

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <h1 className="text-2xl font-black text-foreground">
          {t("greeting")}, {session?.user?.name ?? ""}
        </h1>
        <p className="text-muted-foreground text-sm mt-1 capitalize">{todayStr}</p>
      </motion.div>

      {/* Quick actions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05 }}
        className="flex flex-wrap gap-3"
      >
        <Link
          href="/secretaire/rendez-vous"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90"
          style={{ background: "#0891B2" }}
        >
          <CalendarPlus className="h-4 w-4" strokeWidth={2.5} />
          {t("newAppointment")}
        </Link>
        <Link
          href="/secretaire/patients"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-border bg-white dark:bg-gray-900 text-foreground hover:bg-secondary transition-colors"
        >
          <UserPlus className="h-4 w-4" strokeWidth={2.5} />
          {t("addPatient")}
        </Link>
        {nextConfirmed && (
          <a
            href={`tel:${nextConfirmed.patientPhone}`}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
          >
            <Phone className="h-4 w-4" strokeWidth={2.5} />
            {t("callNextPatient")}
          </a>
        )}
      </motion.div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label={t("rdvToday")} value={todayAppointments.length} iconColor="#0891B2" index={0}>
          <CalendarDays className="h-4 w-4" strokeWidth={2.5} />
        </StatCard>
        <StatCard label={t("toConfirm")} value={pendingCount} iconColor="#D97706" index={1}>
          <Clock className="h-4 w-4" strokeWidth={2.5} />
        </StatCard>
        <StatCard label={t("confirmed")} value={confirmedCount} iconColor="#059669" index={2}>
          <CheckCircle2 className="h-4 w-4" strokeWidth={2.5} />
        </StatCard>
        <StatCard label={t("absences")} value={noShowCount} iconColor="#DC2626" index={3}>
          <AlertCircle className="h-4 w-4" strokeWidth={2.5} />
        </StatCard>
      </div>

      {/* ── Waiting Room Card ────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.2 }}
        className="bg-white dark:bg-gray-900 rounded-2xl border border-border shadow-sm overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-border flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Coffee className="h-4 w-4 shrink-0" style={{ color: "#0891B2" }} strokeWidth={2.5} />
            <h2 className="font-bold text-foreground">{t("waitingRoom")}</h2>
            <span className="ms-1 text-xs text-muted-foreground">
              {t("waitingRoomManualHint")}
            </span>
          </div>
          {/* Manual counter — secretary declares how many patients are
              currently in the room. Persists server-side so the doctor
              sees the same number. */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => changeWaiting("dec")}
              disabled={waitingBusy || waitingCount === 0}
              className="h-9 w-9 inline-flex items-center justify-center rounded-full border border-border bg-white hover:bg-secondary disabled:opacity-40 transition-colors"
              aria-label={t("waitingDecrease")}
            >
              <Minus className="h-4 w-4" />
            </button>
            <div className="min-w-[64px] text-center">
              <div className="text-2xl font-black text-foreground leading-none">
                {waitingCount}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">
                {waitingCount === 1 ? t("waitingPatientSg") : t("waitingPatientPl")}
              </div>
            </div>
            <button
              type="button"
              onClick={() => changeWaiting("inc")}
              disabled={waitingBusy || waitingCount >= 50}
              className="h-9 w-9 inline-flex items-center justify-center rounded-full text-white disabled:opacity-40 transition-colors"
              style={{ background: "#0891B2" }}
              aria-label={t("waitingIncrease")}
            >
              <Plus className="h-4 w-4" />
            </button>
            {waitingCount > 0 && (
              <button
                type="button"
                onClick={() => changeWaiting("set", 0)}
                disabled={waitingBusy}
                className="ms-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                title={t("waitingReset")}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {t("waitingReset")}
              </button>
            )}
          </div>
        </div>
        {waitingPatients.length === 0 ? (
          <div className="flex items-center gap-3 px-5 py-4 text-muted-foreground text-sm">
            <Coffee className="h-5 w-5 text-gray-200" strokeWidth={1.5} />
            <span>{t("noWaitingPatients")}</span>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {waitingPatients.map((a) => {
              const checkedAt = new Date(a.checkedInAt!);
              const waitMin = differenceInMinutes(now, checkedAt);
              return (
                <div key={a.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <div className="font-semibold text-foreground text-sm">{a.patientName}</div>
                    <div className="text-xs text-muted-foreground">
                      {t("arrivedAt", { time: format(checkedAt, "HH:mm"), min: waitMin })}
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium bg-teal-50 text-teal-700 border border-teal-200">
                    {t("arrived")}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* ── Today's Schedule Timeline ────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.25 }}
        className="bg-white dark:bg-gray-900 rounded-2xl border border-border shadow-sm overflow-hidden"
      >
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" style={{ color: "#0891B2" }} strokeWidth={2.5} />
            <h2 className="font-bold text-foreground">{t("todaySchedule")}</h2>
          </div>
          <Link
            href="/secretaire/rendez-vous"
            className="text-xs font-medium hover:underline"
            style={{ color: "#0891B2" }}
          >
            {t("seeAll")}
          </Link>
        </div>

        {todayAppointments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <CalendarDays className="h-10 w-10 mb-3 text-gray-200" strokeWidth={1.5} />
            <p className="font-medium text-sm">{t("noAppointmentsToday")}</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              {t("scheduleIsFree")}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {todayAppointments.map((appt, i) => {
              const isCheckedIn = !!appt.checkedInAt;
              return (
                <motion.div
                  key={appt.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25, delay: 0.3 + i * 0.05 }}
                  className={`flex items-start gap-4 p-4 border-l-4 ${STATUS_TIMELINE_BG[appt.status] ?? "border-l-gray-200"}`}
                >
                  {/* Time column */}
                  <div className="shrink-0 w-12 text-center">
                    <div
                      className="text-sm font-black tabular-nums"
                      style={{ color: "#0891B2" }}
                    >
                      {format(new Date(appt.startsAt), "HH:mm")}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground text-sm">{appt.patientName}</span>
                      {isCheckedIn && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-teal-50 text-teal-700 border border-teal-200">
                          {t("arrived")}
                        </span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[appt.status] ?? "bg-gray-100 text-gray-500"}`}>
                        {STATUS_LABELS[appt.status] ?? appt.status}
                      </span>
                    </div>
                    {appt.reason && (
                      <div className="text-xs text-muted-foreground mt-0.5 truncate">{appt.reason}</div>
                    )}
                    {appt.patientPhone && (
                      <div className="text-xs text-muted-foreground/70 mt-0.5">{appt.patientPhone}</div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* ── Upcoming Next 3 Days ─────────────────────────────────────────────── */}
      {upcomingDays.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.35 }}
          className="bg-white dark:bg-gray-900 rounded-2xl border border-border shadow-sm overflow-hidden"
        >
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" style={{ color: "#0891B2" }} strokeWidth={2.5} />
              <h2 className="font-bold text-foreground">{t("upcomingDays")}</h2>
            </div>
          </div>
          {upcomingDays.map((dayKey) => {
            const dayAppts = upcomingByDay[dayKey];
            const dayDate = new Date(dayKey);
            const label = isTomorrow(dayDate)
              ? t("tomorrow")
              : format(dayDate, "EEEE d MMMM", { locale: fr });
            return (
              <div key={dayKey}>
                <div className="px-4 py-2 bg-slate-50 dark:bg-gray-800 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400 capitalize">
                    {label}
                  </span>
                  <span className="text-xs font-semibold text-primary">{t("rdvCount", { count: dayAppts.length })}</span>
                </div>
                <div className="divide-y divide-border">
                  {dayAppts.map((a) => (
                    <div key={a.id} className="flex items-center justify-between px-4 py-3 gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0 text-white text-xs font-bold"
                          style={{ background: "#0891B2" }}
                        >
                          {format(new Date(a.startsAt), "HH")}
                          <span className="text-white/70">h</span>
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-foreground text-sm truncate">{a.patientName}</div>
                          {a.reason && (
                            <div className="text-xs text-muted-foreground truncate">{a.reason}</div>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </motion.div>
      )}

      {/* Quick link to all patients */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.4 }}
        className="bg-white dark:bg-gray-900 rounded-2xl border border-border shadow-sm p-4 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl flex-shrink-0"
            style={{ background: "#F0FDFA" }}
          >
            <Users className="h-5 w-5" style={{ color: "#0891B2" }} strokeWidth={2.5} />
          </div>
          <div>
            <p className="font-semibold text-foreground text-sm">{t("patientList")}</p>
            <p className="text-xs text-muted-foreground">{t("patientListSub")}</p>
          </div>
        </div>
        <Link
          href="/secretaire/patients"
          className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-border hover:bg-secondary transition-colors text-foreground"
        >
          {t("access")}
        </Link>
      </motion.div>
    </div>
  );
}
