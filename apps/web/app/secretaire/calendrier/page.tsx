"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  CalendarRange,
  Calendar as CalendarIcon,
  CalendarClock,
  Loader2,
  Pencil,
} from "lucide-react";
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  addDays,
  addWeeks,
  addMonths,
  addYears,
  subWeeks,
  subMonths,
  subYears,
  eachDayOfInterval,
  isSameDay,
  getHours,
  getMinutes,
  differenceInMinutes,
} from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

type Appt = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  type: string;
  reason: string | null;
  patientId: string;
  patientName: string;
  patientPhone: string;
};

type View = "day" | "week" | "month" | "year";

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-orange-200 text-orange-900 border-orange-300",
  confirmed: "bg-teal-200 text-teal-900 border-teal-300",
  cancelled: "bg-gray-200 text-gray-600 border-gray-300",
  completed: "bg-blue-200 text-blue-900 border-blue-300",
  no_show: "bg-red-200 text-red-900 border-red-300",
};

export default function SecretaryCalendar() {
  const t = useTranslations("secretaire.calendrier");
  const [view, setView] = useState<View>("week");
  const [anchor, setAnchor] = useState(new Date());
  const [workingHoursOnly, setWorkingHoursOnly] = useState(true);
  const [appts, setAppts] = useState<Appt[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Appt | null>(null);

  const range = useMemo(() => {
    if (view === "day") {
      const start = new Date(anchor);
      start.setHours(0, 0, 0, 0);
      const end = new Date(anchor);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    if (view === "week") {
      return {
        start: startOfWeek(anchor, { weekStartsOn: 1 }),
        end: endOfWeek(anchor, { weekStartsOn: 1 }),
      };
    }
    if (view === "month") {
      return { start: startOfMonth(anchor), end: endOfMonth(anchor) };
    }
    return { start: startOfYear(anchor), end: endOfYear(anchor) };
  }, [view, anchor]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/secretary/appointments?from=${range.start.toISOString()}&to=${range.end.toISOString()}`
        );
        if (!res.ok) throw new Error();
        setAppts(await res.json());
      } catch {
        toast.error(t("loadError"));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [range.start, range.end, t]);

  function navigate(dir: -1 | 1) {
    if (view === "day") setAnchor(addDays(anchor, dir));
    else if (view === "week") setAnchor(dir === 1 ? addWeeks(anchor, 1) : subWeeks(anchor, 1));
    else if (view === "month") setAnchor(dir === 1 ? addMonths(anchor, 1) : subMonths(anchor, 1));
    else setAnchor(dir === 1 ? addYears(anchor, 1) : subYears(anchor, 1));
  }

  const filteredAppts = workingHoursOnly
    ? appts.filter((a) => {
        const d = new Date(a.startsAt);
        const h = getHours(d);
        const dow = d.getDay();
        return dow >= 1 && dow <= 6 && h >= 8 && h < 20;
      })
    : appts;

  const title =
    view === "day"
      ? format(anchor, "EEEE d MMMM yyyy", { locale: fr })
      : view === "week"
        ? `${format(range.start, "d MMM", { locale: fr })} – ${format(range.end, "d MMM yyyy", { locale: fr })}`
        : view === "month"
          ? format(anchor, "MMMM yyyy", { locale: fr })
          : format(anchor, "yyyy", { locale: fr });

  const viewOptions = [
    { key: "day" as const, label: t("day"), icon: CalendarClock },
    { key: "week" as const, label: t("week"), icon: CalendarDays },
    { key: "month" as const, label: t("month"), icon: CalendarRange },
    { key: "year" as const, label: t("year"), icon: CalendarIcon },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <CalendarDays className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-sm text-gray-500">{t("subtitle")}</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-2xl bg-white border border-border p-1">
          {viewOptions.map((v) => {
            const Icon = v.icon;
            return (
              <button
                key={v.key}
                type="button"
                onClick={() => setView(v.key)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                  view === v.key ? "bg-primary text-white" : "text-gray-600 hover:bg-secondary"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {v.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="h-9 w-9 rounded-xl border border-border bg-white flex items-center justify-center hover:bg-secondary"
            aria-label={t("previous")}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setAnchor(new Date())}
            className="rounded-xl border border-border bg-white px-3 py-2 text-sm font-medium hover:bg-secondary"
          >
            {t("today")}
          </button>
          <button
            type="button"
            onClick={() => navigate(1)}
            className="h-9 w-9 rounded-xl border border-border bg-white flex items-center justify-center hover:bg-secondary"
            aria-label={t("next")}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <span className="ml-2 text-sm font-semibold capitalize">{title}</span>
        </div>

        <label className="flex items-center gap-2 rounded-xl bg-white border border-border px-3 py-2 text-xs text-gray-600">
          <input
            type="checkbox"
            checked={workingHoursOnly}
            onChange={(e) => setWorkingHoursOnly(e.target.checked)}
          />
          {t("filterWorkingHours")}
        </label>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : view === "day" ? (
        <DayView appts={filteredAppts} date={anchor} onEdit={setEditing} t={t} />
      ) : view === "week" ? (
        <WeekView appts={filteredAppts} start={range.start} onEdit={setEditing} t={t} />
      ) : view === "month" ? (
        <MonthView appts={filteredAppts} date={anchor} onDayClick={(d) => { setAnchor(d); setView("day"); }} t={t} />
      ) : (
        <YearView appts={filteredAppts} year={anchor.getFullYear()} onMonthClick={(m) => { const d = new Date(anchor); d.setMonth(m); setAnchor(d); setView("month"); }} />
      )}

      {editing && (
        <RescheduleDialog
          appt={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            fetch(`/api/secretary/appointments?from=${range.start.toISOString()}&to=${range.end.toISOString()}`)
              .then((r) => r.json())
              .then(setAppts)
              .catch(() => {});
          }}
          t={t}
        />
      )}
    </div>
  );
}

type TFunc = ReturnType<typeof useTranslations>;

function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold border ${
        STATUS_COLOR[status] ?? "bg-gray-100 text-gray-500 border-gray-200"
      }`}
    >
      {status}
    </span>
  );
}

function DayView({ appts, date, onEdit, t }: { appts: Appt[]; date: Date; onEdit: (a: Appt) => void; t: TFunc }) {
  const list = appts.filter((a) => isSameDay(new Date(a.startsAt), date));
  if (list.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-white p-10 text-center text-sm text-gray-400">
        {t("noDayAppointments")}
      </div>
    );
  }
  return (
    <ul className="rounded-2xl border border-border bg-white shadow-sm divide-y divide-border">
      {list.map((a) => (
        <li key={a.id} className="p-4 flex items-center gap-4">
          <div className="text-sm font-mono font-bold text-primary w-20 shrink-0">
            {format(new Date(a.startsAt), "HH:mm")}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground truncate">
              {a.patientName}
              <span className="text-gray-400 font-normal text-xs ml-2">{a.patientPhone}</span>
            </p>
            {a.reason && <p className="text-xs text-gray-500 truncate">{a.reason}</p>}
          </div>
          <StatusPill status={a.status} />
          <button
            type="button"
            onClick={() => onEdit(a)}
            className="h-8 w-8 rounded-lg border border-border bg-white flex items-center justify-center hover:bg-secondary"
            title={t("reschedule")}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        </li>
      ))}
    </ul>
  );
}

function WeekView({ appts, start, onEdit, t }: { appts: Appt[]; start: Date; onEdit: (a: Appt) => void; t: TFunc }) {
  const days = eachDayOfInterval({ start, end: addDays(start, 6) });
  const HOUR_START = 8;
  const HOUR_END = 20;
  const TOTAL_MIN = (HOUR_END - HOUR_START) * 60;

  const byDay = useMemo(() => {
    const map: Record<string, Appt[]> = {};
    for (const a of appts) {
      const key = format(new Date(a.startsAt), "yyyy-MM-dd");
      (map[key] = map[key] ?? []).push(a);
    }
    return map;
  }, [appts]);

  return (
    <div className="rounded-2xl border border-border bg-white shadow-sm overflow-x-auto">
      <div className="grid" style={{ gridTemplateColumns: "60px repeat(7, minmax(120px, 1fr))" }}>
        <div className="bg-secondary border-b border-border" />
        {days.map((d) => (
          <div
            key={d.toISOString()}
            className={`text-center p-2 border-b border-border text-xs font-semibold ${
              isSameDay(d, new Date()) ? "bg-teal-50 text-teal-700" : "bg-secondary text-gray-600"
            }`}
          >
            <div className="capitalize">{format(d, "EEE", { locale: fr })}</div>
            <div>{format(d, "d MMM", { locale: fr })}</div>
          </div>
        ))}
        {/* time rows */}
        <div className="relative" style={{ height: TOTAL_MIN }}>
          {Array.from({ length: HOUR_END - HOUR_START }).map((_, i) => (
            <div
              key={i}
              style={{ top: i * 60, height: 60 }}
              className="absolute left-0 right-0 text-[10px] text-gray-400 pr-1 text-right border-t border-dashed border-border"
            >
              {String(HOUR_START + i).padStart(2, "0")}:00
            </div>
          ))}
        </div>
        {days.map((d) => {
          const key = format(d, "yyyy-MM-dd");
          const dayAppts = byDay[key] ?? [];
          return (
            <div key={key} className="relative border-l border-border" style={{ height: TOTAL_MIN }}>
              {Array.from({ length: HOUR_END - HOUR_START }).map((_, i) => (
                <div
                  key={i}
                  style={{ top: i * 60, height: 60 }}
                  className="absolute left-0 right-0 border-t border-dashed border-border"
                />
              ))}
              {dayAppts.map((a) => {
                const s = new Date(a.startsAt);
                const e = new Date(a.endsAt);
                const topMin = (getHours(s) - HOUR_START) * 60 + getMinutes(s);
                const heightMin = Math.max(20, differenceInMinutes(e, s));
                if (topMin < 0 || topMin > TOTAL_MIN) return null;
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => onEdit(a)}
                    style={{ top: topMin, height: heightMin }}
                    className={`absolute left-1 right-1 rounded-lg border text-[10px] px-1.5 py-0.5 shadow-sm overflow-hidden ${
                      STATUS_COLOR[a.status] ?? "bg-gray-200 border-gray-300"
                    }`}
                  >
                    <p className="font-bold truncate">{format(s, "HH:mm")} · {a.patientName}</p>
                    {a.reason && <p className="truncate opacity-80">{a.reason}</p>}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MonthView({ appts, date, onDayClick, t }: { appts: Appt[]; date: Date; onDayClick: (d: Date) => void; t: TFunc }) {
  const start = startOfWeek(startOfMonth(date), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(date), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start, end });
  const byDay: Record<string, number> = {};
  for (const a of appts) {
    const key = format(new Date(a.startsAt), "yyyy-MM-dd");
    byDay[key] = (byDay[key] ?? 0) + 1;
  }

  const dayAbbrevs = [
    t("dayMon"), t("dayTue"), t("dayWed"), t("dayThu"), t("dayFri"), t("daySat"), t("daySun"),
  ];

  return (
    <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
      <div className="grid grid-cols-7 bg-secondary text-xs font-semibold text-center">
        {dayAbbrevs.map((d) => (
          <div key={d} className="py-2 border-r last:border-r-0 border-border">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d) => {
          const count = byDay[format(d, "yyyy-MM-dd")] ?? 0;
          const isCurrentMonth = d.getMonth() === date.getMonth();
          return (
            <button
              key={d.toISOString()}
              type="button"
              onClick={() => onDayClick(d)}
              className={`min-h-[84px] p-2 text-left border-r border-b border-border last-of-type:border-r-0 hover:bg-secondary/40 ${
                !isCurrentMonth ? "text-gray-300 bg-gray-50" : ""
              } ${isSameDay(d, new Date()) ? "bg-teal-50" : ""}`}
            >
              <span className="text-sm font-semibold">{d.getDate()}</span>
              {count > 0 && (
                <p className="mt-1 text-[10px] inline-flex items-center rounded-full bg-primary text-white px-1.5 font-bold">
                  {count} {t("rdv")}
                </p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function YearView({ appts, year, onMonthClick }: { appts: Appt[]; year: number; onMonthClick: (m: number) => void }) {
  const counts = Array.from({ length: 12 }).map((_, i) => {
    return appts.filter((a) => {
      const d = new Date(a.startsAt);
      return d.getFullYear() === year && d.getMonth() === i;
    }).length;
  });
  const maxCount = Math.max(1, ...counts);
  const monthName = (i: number) => format(new Date(year, i, 1), "MMMM", { locale: fr });
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {counts.map((c, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onMonthClick(i)}
          className="rounded-2xl border border-border bg-white p-4 text-left hover:shadow-md transition-shadow"
        >
          <p className="text-xs text-gray-500 capitalize">{monthName(i)}</p>
          <p className="text-2xl font-bold text-primary mt-1">{c}</p>
          <p className="text-[10px] text-gray-400">RDV</p>
          <div className="mt-2 h-1.5 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${(c / maxCount) * 100}%` }}
            />
          </div>
        </button>
      ))}
    </div>
  );
}

function RescheduleDialog({
  appt,
  onClose,
  onSaved,
  t,
}: {
  appt: Appt;
  onClose: () => void;
  onSaved: () => void;
  t: TFunc;
}) {
  const start = new Date(appt.startsAt);
  const end = new Date(appt.endsAt);
  const [date, setDate] = useState(format(start, "yyyy-MM-dd"));
  const [startTime, setStartTime] = useState(format(start, "HH:mm"));
  const [endTime, setEndTime] = useState(format(end, "HH:mm"));
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const s = new Date(`${date}T${startTime}:00`);
      const e2 = new Date(`${date}T${endTime}:00`);
      if (e2 <= s) throw new Error(t("endTimeError"));
      const res = await fetch(`/api/appointments/${appt.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startsAt: s.toISOString(), endsAt: e2.toISOString() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? t("endTimeError"));
      }
      toast.success(t("reschedule"));
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("endTimeError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-2xl bg-white shadow-xl p-5 space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold">{t("rescheduleTitle")}</h2>
        <p className="text-sm text-gray-500">{appt.patientName}</p>
        <label className="block space-y-1 text-xs font-medium text-gray-600">
          <span>{t("dateLabel")}</span>
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full h-10 rounded-xl border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block space-y-1 text-xs font-medium text-gray-600">
            <span>{t("startLabel")}</span>
            <input
              type="time"
              required
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full h-10 rounded-xl border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </label>
          <label className="block space-y-1 text-xs font-medium text-gray-600">
            <span>{t("endLabel")}</span>
            <input
              type="time"
              required
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full h-10 rounded-xl border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </label>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} disabled={saving} className="rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-secondary">
            {t("cancel")}
          </button>
          <button type="submit" disabled={saving} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">
            {saving ? t("saving") : t("validate")}
          </button>
        </div>
      </form>
    </div>
  );
}
