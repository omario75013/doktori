"use client";

import { useState, useEffect, useCallback } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

type AgendaEvent = {
  id: string;
  kind: "specimen" | "expected" | "uploaded" | "closed";
  patientName: string | null;
  doctorName: string | null;
  examLabel: string;
  time: string | null;
  status: string | null;
};

const KIND_COLORS: Record<string, string> = {
  specimen: "bg-green-100 text-green-800 border-green-200",
  expected: "bg-amber-100 text-amber-800 border-amber-200",
  uploaded: "bg-blue-100 text-blue-800 border-blue-200",
  closed: "bg-gray-200 text-gray-600 border-gray-300",
};

const KIND_DOT: Record<string, string> = {
  specimen: "bg-green-500",
  expected: "bg-amber-400",
  uploaded: "bg-blue-500",
  closed: "bg-gray-400",
};

function getWeekStart(d: Date): Date {
  const day = d.getDay(); // 0=Sun
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  const mon = new Date(d);
  mon.setDate(diff);
  mon.setHours(0, 0, 0, 0);
  return mon;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function isoDate(d: Date) {
  return d.toISOString().split("T")[0];
}

export default function LaboratoireAgendaPage() {
  const t = useTranslations("laboratoire.agenda");

  const [view, setView] = useState<"week" | "month">("week");
  const [weekStart, setWeekStart] = useState<Date>(() => getWeekStart(new Date()));
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [loading, setLoading] = useState(false);

  // Derive from/to based on view
  const from = view === "week" ? weekStart : new Date(weekStart.getFullYear(), weekStart.getMonth(), 1);
  const to = view === "week"
    ? addDays(weekStart, 6)
    : new Date(weekStart.getFullYear(), weekStart.getMonth() + 1, 0);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ from: from.toISOString(), to: to.toISOString() });
    const res = await fetch(`/api/laboratoire/agenda?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setEvents(data.events ?? []);
    }
    setLoading(false);
  }, [from.toISOString(), to.toISOString()]);

  useEffect(() => { load(); }, [load]);

  function goBack() {
    if (view === "week") setWeekStart((d) => addDays(d, -7));
    else setWeekStart((d) => { const n = new Date(d); n.setMonth(n.getMonth() - 1); return n; });
  }

  function goForward() {
    if (view === "week") setWeekStart((d) => addDays(d, 7));
    else setWeekStart((d) => { const n = new Date(d); n.setMonth(n.getMonth() + 1); return n; });
  }

  function goToday() {
    if (view === "week") setWeekStart(getWeekStart(new Date()));
    else setWeekStart(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  }

  // Week days
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Group events by date
  const byDate: Record<string, AgendaEvent[]> = {};
  for (const ev of events) {
    if (!ev.time) continue;
    const d = ev.time.length === 10 ? ev.time : isoDate(new Date(ev.time));
    if (!byDate[d]) byDate[d] = [];
    byDate[d].push(ev);
  }

  const orderLink = (ev: AgendaEvent) => {
    // id may be suffixed with _exp or _upl
    const orderId = ev.id.replace(/_exp$|_upl$/, "");
    return `/laboratoire/commandes/${orderId}`;
  };

  // Month view
  function renderMonth() {
    const year = from.getFullYear();
    const month = from.getMonth();
    const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < (firstDay === 0 ? 6 : firstDay - 1); i++) cells.push(null);
    for (let i = 1; i <= daysInMonth; i++) cells.push(new Date(year, month, i));

    return (
      <div>
        <div className="grid grid-cols-7 mb-1">
          {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (
            <div key={d} className="text-center text-xs font-bold text-muted-foreground py-2">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 border-l border-t border-border">
          {cells.map((day, i) => {
            if (!day) return <div key={i} className="border-r border-b border-border bg-gray-50 h-20" />;
            const d = isoDate(day);
            const dayEvents = byDate[d] ?? [];
            const isToday = d === isoDate(new Date());
            return (
              <div key={i} className={`border-r border-b border-border p-1 min-h-[5rem] ${isToday ? "bg-green-50" : "bg-white"}`}>
                <div className={`text-xs font-bold mb-1 ${isToday ? "text-green-600" : "text-muted-foreground"}`}>
                  {day.getDate()}
                </div>
                {dayEvents.length > 0 && (
                  <div className="flex flex-wrap gap-0.5">
                    {dayEvents.slice(0, 3).map((ev) => (
                      <span key={ev.id} className={`h-1.5 w-1.5 rounded-full ${KIND_DOT[ev.kind] ?? "bg-gray-400"}`} />
                    ))}
                    {dayEvents.length > 3 && <span className="text-[10px] text-muted-foreground">+{dayEvents.length - 3}</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
          <CalendarDays className="h-6 w-6 text-green-600" strokeWidth={2.5} />
          {t("title")}
        </h1>
        <div className="flex items-center gap-2">
          <button onClick={goBack} className="p-2 rounded-lg border border-border hover:bg-gray-50">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={goToday} className="px-3 py-1.5 rounded-lg border border-border text-sm font-semibold hover:bg-gray-50">
            {t("today")}
          </button>
          <button onClick={goForward} className="p-2 rounded-lg border border-border hover:bg-gray-50">
            <ChevronRight className="h-4 w-4" />
          </button>
          <div className="flex gap-1 bg-white rounded-xl border border-border p-1 ml-2">
            <button
              onClick={() => setView("week")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${view === "week" ? "bg-green-600 text-white" : "text-muted-foreground hover:bg-gray-100"}`}
            >
              {t("viewWeek")}
            </button>
            <button
              onClick={() => setView("month")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${view === "month" ? "bg-green-600 text-white" : "text-muted-foreground hover:bg-gray-100"}`}
            >
              {t("viewMonth")}
            </button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 flex-wrap">
        {(["specimen", "expected", "uploaded", "closed"] as const).map((kind) => (
          <div key={kind} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className={`h-2.5 w-2.5 rounded-full ${KIND_DOT[kind]}`} />
            {t(`legend.${kind}` as Parameters<typeof t>[0])}
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-green-600" />
        </div>
      ) : view === "week" ? (
        <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="grid grid-cols-7 border-b border-border">
            {weekDays.map((day) => {
              const isToday = isoDate(day) === isoDate(new Date());
              return (
                <div key={day.toISOString()} className={`text-center py-3 text-sm font-semibold border-r border-border last:border-r-0 ${isToday ? "bg-green-50 text-green-700" : "text-muted-foreground"}`}>
                  <div className="text-xs font-bold uppercase">{day.toLocaleDateString("fr-FR", { weekday: "short" })}</div>
                  <div className="text-base font-black mt-0.5">{day.getDate()}</div>
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-7 min-h-[400px]">
            {weekDays.map((day) => {
              const d = isoDate(day);
              const dayEvents = byDate[d] ?? [];
              const isToday = d === isoDate(new Date());
              const hasClosed = dayEvents.some((e) => e.kind === "closed");
              return (
                <div key={d} className={`border-r border-border last:border-r-0 p-2 space-y-1 ${isToday ? "bg-green-50/50" : ""} ${hasClosed ? "bg-gray-100/50" : ""}`}>
                  {hasClosed && (
                    <div className="text-[10px] text-gray-500 font-semibold text-center py-1">Fermé</div>
                  )}
                  {dayEvents.filter((e) => e.kind !== "closed").map((ev) => (
                    <a
                      key={ev.id}
                      href={orderLink(ev)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`block text-[10px] font-semibold border rounded-lg px-1.5 py-1 truncate hover:opacity-80 transition-opacity ${KIND_COLORS[ev.kind] ?? ""}`}
                      title={`${ev.patientName ?? ""} · ${ev.examLabel}`}
                    >
                      {ev.time && ev.time.length > 10 ? new Date(ev.time).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : ""} {ev.patientName ?? ev.examLabel}
                    </a>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-border shadow-sm p-4">
          {renderMonth()}
        </div>
      )}
    </div>
  );
}
