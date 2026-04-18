"use client";

import { useState, useEffect, useRef } from "react";
import {
  format,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  eachDayOfInterval,
  differenceInMinutes,
  getHours,
  getMinutes,
} from "date-fns";
import { fr } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Video,
  X,
  Copy,
  Check,
  RefreshCw,
  Download,
  Globe,
  Apple,
  Clock,
  User,
  Phone,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Types ────────────────────────────────────────────────────────────────────

type Appointment = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  status: string;
  type: string;
  reason: string | null;
  patientName: string;
  patientPhone: string | null;
};

type View = "week" | "day";

// ─── Constants ────────────────────────────────────────────────────────────────

const HOUR_START = 8;
const HOUR_END = 20;
const TOTAL_HOURS = HOUR_END - HOUR_START;
// Each hour = 60px tall → 1 min = 1px
const HOUR_HEIGHT = 60;

const STATUS_CONFIG: Record<string, { bg: string; border: string; text: string; label: string }> = {
  confirmed:  { bg: "bg-teal-500",  border: "border-teal-600",  text: "text-white", label: "Confirmé" },
  pending:    { bg: "bg-orange-400", border: "border-orange-500", text: "text-white", label: "En attente" },
  teleconsult:{ bg: "bg-purple-500", border: "border-purple-600", text: "text-white", label: "Téléconsult" },
  completed:  { bg: "bg-blue-500",  border: "border-blue-600",  text: "text-white", label: "Terminé" },
  cancelled:  { bg: "bg-gray-400",  border: "border-gray-500",  text: "text-white", label: "Annulé" },
  no_show:    { bg: "bg-red-400",   border: "border-red-500",   text: "text-white", label: "Absent" },
};

function getApptConfig(appt: Appointment) {
  if (appt.type === "teleconsult" && appt.status !== "cancelled") return STATUS_CONFIG.teleconsult;
  return STATUS_CONFIG[appt.status] ?? STATUS_CONFIG.pending;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTopPercent(date: Date): number {
  const hours = getHours(date) + getMinutes(date) / 60;
  return Math.max(0, (hours - HOUR_START) / TOTAL_HOURS) * 100;
}

function getHeightPercent(startsAt: Date, endsAt: Date): number {
  const mins = differenceInMinutes(endsAt, startsAt);
  return Math.max(2, (mins / 60 / TOTAL_HOURS) * 100);
}

function getTopPx(date: Date): number {
  const hours = getHours(date) + getMinutes(date) / 60;
  return Math.max(0, (hours - HOUR_START) * HOUR_HEIGHT);
}

function getHeightPx(startsAt: Date, endsAt: Date): number {
  const mins = differenceInMinutes(endsAt, startsAt);
  return Math.max(20, (mins / 60) * HOUR_HEIGHT);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TimeAxis() {
  const slots: string[] = [];
  for (let h = HOUR_START; h <= HOUR_END; h++) {
    slots.push(`${String(h).padStart(2, "0")}:00`);
    if (h < HOUR_END) slots.push("");
  }
  return (
    <div className="flex flex-col" style={{ height: TOTAL_HOURS * HOUR_HEIGHT }}>
      {Array.from({ length: TOTAL_HOURS * 2 + 1 }, (_, i) => {
        const isHour = i % 2 === 0;
        const hour = HOUR_START + Math.floor(i / 2);
        return (
          <div
            key={i}
            className="flex items-start"
            style={{ height: HOUR_HEIGHT / 2 }}
          >
            {isHour && (
              <span className="text-[10px] text-[#134E4A]/40 font-medium w-12 pr-2 text-right leading-none -mt-2">
                {String(hour).padStart(2, "0")}:00
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function GridLines() {
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{ height: TOTAL_HOURS * HOUR_HEIGHT }}
    >
      {Array.from({ length: TOTAL_HOURS * 2 }, (_, i) => (
        <div
          key={i}
          className={`absolute left-0 right-0 ${i % 2 === 0 ? "border-t border-[#E6F4F1]" : "border-t border-[#E6F4F1]/40 border-dashed"}`}
          style={{ top: (i * HOUR_HEIGHT) / 2 }}
        />
      ))}
    </div>
  );
}

function CurrentTimeIndicator({ containerHeight }: { containerHeight: number }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const top = getTopPx(now);
  if (top < 0 || top > containerHeight) return null;

  return (
    <div
      className="absolute left-0 right-0 z-20 pointer-events-none flex items-center"
      style={{ top }}
    >
      <div className="w-2.5 h-2.5 rounded-full bg-red-500 -ml-1.5 flex-shrink-0" />
      <div className="flex-1 h-px bg-red-500" />
    </div>
  );
}

function AppointmentBlock({
  appt,
  onClick,
  isDay = false,
}: {
  appt: Appointment;
  onClick: (appt: Appointment) => void;
  isDay?: boolean;
}) {
  const config = getApptConfig(appt);
  const top = getTopPx(new Date(appt.startsAt));
  const height = getHeightPx(new Date(appt.startsAt), new Date(appt.endsAt));

  return (
    <motion.button
      whileHover={{ scale: 1.02, zIndex: 30 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onClick(appt)}
      className={`absolute left-0.5 right-0.5 rounded-lg border-l-2 ${config.bg} ${config.border} ${config.text} text-left overflow-hidden shadow-sm cursor-pointer z-10`}
      style={{ top, height }}
      title={`${appt.patientName} — ${format(new Date(appt.startsAt), "HH:mm")}`}
    >
      <div className="px-1.5 py-0.5 h-full flex flex-col justify-start">
        <p className="text-[10px] font-bold truncate leading-tight">
          {isDay ? format(new Date(appt.startsAt), "HH:mm") + " " : ""}
          {appt.patientName}
        </p>
        {height > 35 && (
          <p className="text-[9px] opacity-80 truncate leading-tight">
            {appt.reason ?? config.label}
          </p>
        )}
        {isDay && height > 50 && appt.type === "teleconsult" && (
          <Video className="h-3 w-3 mt-0.5 opacity-80" />
        )}
      </div>
    </motion.button>
  );
}

// ─── Calendar Sync Modal ───────────────────────────────────────────────────────

function CalendarSyncModal({ onClose }: { onClose: () => void }) {
  const [feedUrl, setFeedUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generateUrl() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/doctor/calendar/feed", { method: "POST" });
      if (!res.ok) throw new Error("Erreur lors de la génération");
      const data = await res.json();
      setFeedUrl(data.url ?? data.feedUrl ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setGenerating(false);
    }
  }

  async function copyUrl() {
    if (!feedUrl) return;
    await navigator.clipboard.writeText(feedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-[#E6F4F1]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[#E6F4F1]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#0891B2]/10 flex items-center justify-center">
              <RefreshCw className="h-4 w-4 text-[#0891B2]" />
            </div>
            <h2 className="text-lg font-black text-[#134E4A]">Synchroniser mon calendrier</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Generate URL */}
          <div className="bg-[#F0FDFA] rounded-xl p-4 border border-[#E6F4F1]">
            <p className="text-sm text-[#134E4A]/70 mb-3">
              Générez un lien d'abonnement unique pour synchroniser vos rendez-vous Doktori avec votre application de calendrier préférée.
            </p>
            {!feedUrl ? (
              <Button
                onClick={generateUrl}
                disabled={generating}
                className="h-9 px-4 rounded-xl bg-[#0891B2] hover:bg-[#0E7490] text-white font-semibold text-sm"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                    Génération...
                  </>
                ) : (
                  "Générer l'URL de synchronisation"
                )}
              </Button>
            ) : (
              <div className="flex gap-2">
                <input
                  readOnly
                  value={feedUrl}
                  className="flex-1 text-xs rounded-lg border border-[#E6F4F1] bg-white px-3 py-2 font-mono text-[#134E4A]/80 truncate"
                />
                <button
                  onClick={copyUrl}
                  className="px-3 py-2 rounded-lg border border-[#E6F4F1] bg-white hover:bg-[#F0FDFA] transition-colors flex-shrink-0"
                  title="Copier"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4 text-[#0891B2]" />
                  )}
                </button>
              </div>
            )}
            {error && (
              <p className="mt-2 text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {error}
              </p>
            )}
            <p className="mt-2 text-[10px] text-[#134E4A]/50">
              Synchronisation en lecture seule — vos rendez-vous Doktori apparaîtront dans votre calendrier.
            </p>
          </div>

          {/* Google Calendar */}
          <div className="border border-[#E6F4F1] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="h-4 w-4 text-blue-500" />
              <span className="font-bold text-sm text-[#134E4A]">Google Agenda</span>
            </div>
            <ol className="space-y-1 text-xs text-[#134E4A]/70 list-decimal list-inside">
              <li>Copiez l'URL ci-dessus</li>
              <li>Ouvrez <strong>Google Agenda</strong></li>
              <li>Cliquez sur <strong>Autres agendas</strong> → <strong>À partir de l'URL</strong></li>
              <li>Collez l'URL et cliquez sur <strong>Ajouter un agenda</strong></li>
            </ol>
          </div>

          {/* Apple / Outlook */}
          <div className="border border-[#E6F4F1] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Apple className="h-4 w-4 text-gray-700" />
              <span className="font-bold text-sm text-[#134E4A]">Apple Calendrier / Outlook</span>
            </div>
            <ol className="space-y-1 text-xs text-[#134E4A]/70 list-decimal list-inside">
              <li>Copiez l'URL ci-dessus</li>
              <li>Ouvrez <strong>Calendrier</strong> → <strong>Fichier</strong> → <strong>Nouvel abonnement à un calendrier</strong></li>
              <li>Collez l'URL et confirmez</li>
            </ol>
          </div>

          {/* Download .ics */}
          <a
            href="/api/doctor/calendar/export"
            download="rendez-vous.ics"
            className="flex items-center gap-3 border border-[#E6F4F1] rounded-xl p-4 hover:bg-[#F0FDFA] transition-colors group"
          >
            <Download className="h-4 w-4 text-[#0891B2] group-hover:scale-110 transition-transform" />
            <div>
              <p className="font-bold text-sm text-[#134E4A]">Télécharger .ics</p>
              <p className="text-xs text-[#134E4A]/60">Exporter les rendez-vous du mois en cours</p>
            </div>
          </a>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Appointment Detail Panel ──────────────────────────────────────────────────

function AppointmentPanel({
  appt,
  onClose,
}: {
  appt: Appointment;
  onClose: () => void;
}) {
  const config = getApptConfig(appt);
  const starts = new Date(appt.startsAt);
  const ends = new Date(appt.endsAt);

  return (
    <motion.div
      initial={{ x: "100%", opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: "100%", opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed right-0 top-0 bottom-0 w-80 bg-white shadow-2xl z-40 border-l border-[#E6F4F1] flex flex-col"
    >
      {/* Header */}
      <div className={`p-5 ${config.bg} flex items-start justify-between`}>
        <div>
          <span className={`text-xs font-bold uppercase tracking-wider ${config.text} opacity-80`}>
            {config.label}
          </span>
          <h3 className={`text-lg font-black ${config.text} mt-0.5`}>
            {appt.patientName}
          </h3>
          <p className={`text-sm ${config.text} opacity-80 mt-1`}>
            {format(starts, "EEEE d MMMM", { locale: fr })}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
        >
          <X className={`h-4 w-4 ${config.text}`} />
        </button>
      </div>

      {/* Details */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#F0FDFA] flex items-center justify-center flex-shrink-0">
            <Clock className="h-4 w-4 text-[#0891B2]" />
          </div>
          <div>
            <p className="text-xs text-[#134E4A]/50 font-medium">Horaire</p>
            <p className="text-sm font-bold text-[#134E4A]">
              {format(starts, "HH:mm")} – {format(ends, "HH:mm")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#F0FDFA] flex items-center justify-center flex-shrink-0">
            <User className="h-4 w-4 text-[#0891B2]" />
          </div>
          <div>
            <p className="text-xs text-[#134E4A]/50 font-medium">Patient</p>
            <p className="text-sm font-bold text-[#134E4A]">{appt.patientName}</p>
          </div>
        </div>

        {appt.patientPhone && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#F0FDFA] flex items-center justify-center flex-shrink-0">
              <Phone className="h-4 w-4 text-[#0891B2]" />
            </div>
            <div>
              <p className="text-xs text-[#134E4A]/50 font-medium">Téléphone</p>
              <a
                href={`tel:${appt.patientPhone}`}
                className="text-sm font-bold text-[#0891B2] hover:underline"
              >
                {appt.patientPhone}
              </a>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#F0FDFA] flex items-center justify-center flex-shrink-0">
            {appt.type === "teleconsult" ? (
              <Video className="h-4 w-4 text-purple-500" />
            ) : (
              <CalendarDays className="h-4 w-4 text-[#0891B2]" />
            )}
          </div>
          <div>
            <p className="text-xs text-[#134E4A]/50 font-medium">Type</p>
            <p className="text-sm font-bold text-[#134E4A]">
              {appt.type === "teleconsult" ? "Téléconsultation" : "Cabinet"}
            </p>
          </div>
        </div>

        {appt.reason && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#F0FDFA] flex items-center justify-center flex-shrink-0 mt-0.5">
              <FileText className="h-4 w-4 text-[#0891B2]" />
            </div>
            <div>
              <p className="text-xs text-[#134E4A]/50 font-medium">Motif</p>
              <p className="text-sm text-[#134E4A]">{appt.reason}</p>
            </div>
          </div>
        )}

        {/* Status badge */}
        <div className="mt-2">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${config.bg} ${config.text}`}
          >
            <CheckCircle2 className="h-3 w-3" />
            {config.label}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="p-5 border-t border-[#E6F4F1] space-y-2">
        {appt.status === "pending" && (
          <Button className="w-full h-10 rounded-xl bg-[#0891B2] hover:bg-[#0E7490] text-white font-bold text-sm">
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Confirmer le RDV
          </Button>
        )}
        {appt.type === "teleconsult" && appt.status === "confirmed" && (
          <Button className="w-full h-10 rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-bold text-sm">
            <Video className="h-4 w-4 mr-2" />
            Rejoindre la téléconsultation
          </Button>
        )}
      </div>
    </motion.div>
  );
}

// ─── Mini Calendar (used in day view sidebar) ─────────────────────────────────

function MiniCalendar({
  currentDate,
  onSelectDay,
  appointments,
}: {
  currentDate: Date;
  onSelectDay: (d: Date) => void;
  appointments: Appointment[];
}) {
  const [monthRef, setMonthRef] = useState(currentDate);

  const monthStart = startOfMonth(monthRef);
  const monthEnd = endOfMonth(monthRef);
  const startDay = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDay = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: startDay, end: endDay });

  const apptDays = new Set(
    appointments.map((a) => format(new Date(a.startsAt), "yyyy-MM-dd"))
  );

  return (
    <div className="bg-white rounded-2xl border border-[#E6F4F1] shadow-sm p-4 w-64 flex-shrink-0">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setMonthRef((m) => subMonths(m, 1))}
          className="p-1 rounded-lg hover:bg-[#F0FDFA] transition-colors"
        >
          <ChevronLeft className="h-4 w-4 text-[#134E4A]/60" />
        </button>
        <span className="text-sm font-bold text-[#134E4A] capitalize">
          {format(monthRef, "MMMM yyyy", { locale: fr })}
        </span>
        <button
          onClick={() => setMonthRef((m) => addMonths(m, 1))}
          className="p-1 rounded-lg hover:bg-[#F0FDFA] transition-colors"
        >
          <ChevronRight className="h-4 w-4 text-[#134E4A]/60" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
          <div key={i} className="text-center text-[10px] font-bold text-[#134E4A]/40 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const hasAppt = apptDays.has(key);
          const isCurrentDay = isToday(day);
          const isSelected = isSameDay(day, currentDate);
          const isCurrentMonth = isSameMonth(day, monthRef);

          return (
            <button
              key={key}
              onClick={() => {
                setMonthRef(day);
                onSelectDay(day);
              }}
              className={`relative aspect-square flex items-center justify-center rounded-lg text-[11px] font-medium transition-colors
                ${!isCurrentMonth ? "text-gray-300" : "text-[#134E4A]"}
                ${isSelected ? "bg-[#0891B2] text-white font-bold" : ""}
                ${isCurrentDay && !isSelected ? "ring-1 ring-[#0891B2]" : ""}
                ${!isSelected ? "hover:bg-[#F0FDFA]" : ""}
              `}
            >
              {format(day, "d")}
              {hasAppt && !isSelected && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#0891B2]" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Week View ─────────────────────────────────────────────────────────────────

function WeekView({
  weekStart,
  appointments,
  onSelectAppt,
}: {
  weekStart: Date;
  appointments: Appointment[];
  onSelectAppt: (appt: Appointment) => void;
}) {
  const days = eachDayOfInterval({
    start: weekStart,
    end: endOfWeek(weekStart, { weekStartsOn: 1 }),
  });

  const containerHeight = TOTAL_HOURS * HOUR_HEIGHT;

  return (
    <div className="flex-1 overflow-auto">
      {/* Day headers */}
      <div className="flex sticky top-0 z-20 bg-white border-b border-[#E6F4F1]">
        <div className="w-12 flex-shrink-0" />
        {days.map((day) => (
          <div
            key={day.toISOString()}
            className={`flex-1 py-2 text-center border-l border-[#E6F4F1] ${isToday(day) ? "bg-[#F0FDFA]" : ""}`}
          >
            <p className="text-[10px] font-bold uppercase text-[#134E4A]/50 tracking-wider">
              {format(day, "EEE", { locale: fr })}
            </p>
            <p
              className={`text-sm font-black mt-0.5 ${
                isToday(day)
                  ? "w-7 h-7 rounded-full bg-[#0891B2] text-white flex items-center justify-center mx-auto"
                  : "text-[#134E4A]"
              }`}
            >
              {format(day, "d")}
            </p>
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="flex" style={{ height: containerHeight }}>
        {/* Time axis */}
        <div className="w-12 flex-shrink-0 relative">
          <TimeAxis />
        </div>

        {/* Day columns */}
        {days.map((day) => {
          const dayAppts = appointments.filter((a) =>
            isSameDay(new Date(a.startsAt), day)
          );

          return (
            <div
              key={day.toISOString()}
              className={`flex-1 relative border-l border-[#E6F4F1] ${isToday(day) ? "bg-[#F0FDFA]/40" : ""}`}
              style={{ height: containerHeight }}
            >
              <GridLines />
              {isToday(day) && <CurrentTimeIndicator containerHeight={containerHeight} />}
              {dayAppts.map((appt) => (
                <AppointmentBlock
                  key={appt.id}
                  appt={appt}
                  onClick={onSelectAppt}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Day View ──────────────────────────────────────────────────────────────────

function DayView({
  currentDay,
  appointments,
  onSelectAppt,
  onSelectDay,
}: {
  currentDay: Date;
  appointments: Appointment[];
  onSelectAppt: (appt: Appointment) => void;
  onSelectDay: (d: Date) => void;
}) {
  const containerHeight = TOTAL_HOURS * HOUR_HEIGHT;
  const dayAppts = appointments.filter((a) =>
    isSameDay(new Date(a.startsAt), currentDay)
  );

  return (
    <div className="flex gap-4 flex-1 overflow-hidden">
      {/* Mini calendar sidebar */}
      <div className="hidden md:block">
        <MiniCalendar
          currentDate={currentDay}
          onSelectDay={onSelectDay}
          appointments={appointments}
        />
      </div>

      {/* Day column */}
      <div className="flex-1 overflow-auto">
        <div className="sticky top-0 z-20 bg-white border-b border-[#E6F4F1] py-3 px-4">
          <p className="text-xs font-bold uppercase text-[#134E4A]/50 tracking-wider">
            {format(currentDay, "EEEE", { locale: fr })}
          </p>
          <p className="text-xl font-black text-[#134E4A]">
            {format(currentDay, "d MMMM yyyy", { locale: fr })}
          </p>
          <p className="text-xs text-[#134E4A]/50 mt-0.5">
            {dayAppts.length} rendez-vous
          </p>
        </div>

        <div className="flex" style={{ height: containerHeight }}>
          <div className="w-12 flex-shrink-0">
            <TimeAxis />
          </div>

          <div
            className={`flex-1 relative border-l border-[#E6F4F1] ${isToday(currentDay) ? "bg-[#F0FDFA]/30" : ""}`}
            style={{ height: containerHeight }}
          >
            <GridLines />
            {isToday(currentDay) && <CurrentTimeIndicator containerHeight={containerHeight} />}
            {dayAppts.map((appt) => (
              <AppointmentBlock
                key={appt.id}
                appt={appt}
                onClick={onSelectAppt}
                isDay
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function CalendarClient({ appointments }: { appointments: Appointment[] }) {
  const [view, setView] = useState<View>("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [showSync, setShowSync] = useState(false);

  // On mobile default to day view
  useEffect(() => {
    if (window.innerWidth < 768) setView("day");
  }, []);

  // Derived navigation state
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });

  function goBack() {
    if (view === "week") setCurrentDate((d) => subWeeks(d, 1));
    else setCurrentDate((d) => subDays(d, 1));
  }

  function goForward() {
    if (view === "week") setCurrentDate((d) => addWeeks(d, 1));
    else setCurrentDate((d) => addDays(d, 1));
  }

  function goToday() {
    setCurrentDate(new Date());
  }

  // Header label
  const headerLabel =
    view === "week"
      ? `${format(weekStart, "d MMM", { locale: fr })} – ${format(
          endOfWeek(weekStart, { weekStartsOn: 1 }),
          "d MMM yyyy",
          { locale: fr }
        )}`
      : format(currentDate, "d MMMM yyyy", { locale: fr });

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-h-[calc(100vh-4rem)]">
      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#0891B2]/10 flex items-center justify-center">
            <CalendarDays className="h-4 w-4 text-[#0891B2]" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-[#134E4A] leading-tight">Calendrier</h1>
            <p className="text-xs text-[#134E4A]/50">Visualisez vos rendez-vous</p>
          </div>
        </div>

        <button
          onClick={() => setShowSync(true)}
          className="inline-flex items-center gap-2 px-4 h-9 rounded-xl border border-[#E6F4F1] bg-white hover:bg-[#F0FDFA] text-sm font-semibold text-[#134E4A] transition-colors shadow-sm"
        >
          <RefreshCw className="h-3.5 w-3.5 text-[#0891B2]" />
          Synchroniser
        </button>
      </div>

      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between gap-2 mb-3 flex-shrink-0 flex-wrap">
        {/* Nav controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={goBack}
            className="p-1.5 rounded-lg border border-[#E6F4F1] bg-white hover:bg-[#F0FDFA] transition-colors"
          >
            <ChevronLeft className="h-4 w-4 text-[#134E4A]" />
          </button>
          <button
            onClick={goForward}
            className="p-1.5 rounded-lg border border-[#E6F4F1] bg-white hover:bg-[#F0FDFA] transition-colors"
          >
            <ChevronRight className="h-4 w-4 text-[#134E4A]" />
          </button>
          <motion.span
            key={headerLabel}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm font-bold text-[#134E4A] ml-1 capitalize"
          >
            {headerLabel}
          </motion.span>
        </div>

        <div className="flex items-center gap-2">
          {/* Today button */}
          <button
            onClick={goToday}
            className="px-3 h-8 rounded-lg border border-[#E6F4F1] bg-white hover:bg-[#F0FDFA] text-xs font-semibold text-[#134E4A] transition-colors"
          >
            Aujourd&apos;hui
          </button>

          {/* View toggle */}
          <div className="flex rounded-lg border border-[#E6F4F1] overflow-hidden bg-white">
            {(["week", "day"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 h-8 text-xs font-semibold transition-colors ${
                  view === v
                    ? "bg-[#0891B2] text-white"
                    : "text-[#134E4A]/60 hover:bg-[#F0FDFA]"
                }`}
              >
                {v === "week" ? "Semaine" : "Jour"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Calendar body ── */}
      <div className="flex-1 bg-white rounded-2xl border border-[#E6F4F1] shadow-sm overflow-hidden flex flex-col">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${view}-${currentDate.toDateString()}`}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.15 }}
            className="flex-1 overflow-hidden flex flex-col"
          >
            {view === "week" ? (
              <WeekView
                weekStart={weekStart}
                appointments={appointments}
                onSelectAppt={setSelectedAppt}
              />
            ) : (
              <DayView
                currentDay={currentDate}
                appointments={appointments}
                onSelectAppt={setSelectedAppt}
                onSelectDay={setCurrentDate}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Status legend ── */}
      <div className="flex flex-wrap gap-3 mt-3 flex-shrink-0">
        {Object.entries(STATUS_CONFIG)
          .filter(([k]) => k !== "teleconsult")
          .map(([, cfg]) => (
            <div key={cfg.label} className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-sm ${cfg.bg}`} />
              <span className="text-[10px] text-[#134E4A]/60 font-medium">{cfg.label}</span>
            </div>
          ))}
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-purple-500" />
          <span className="text-[10px] text-[#134E4A]/60 font-medium">Téléconsult</span>
        </div>
      </div>

      {/* ── Appointment detail panel ── */}
      <AnimatePresence>
        {selectedAppt && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-30 bg-black/20"
              onClick={() => setSelectedAppt(null)}
            />
            <AppointmentPanel
              appt={selectedAppt}
              onClose={() => setSelectedAppt(null)}
            />
          </>
        )}
      </AnimatePresence>

      {/* ── Sync modal ── */}
      <AnimatePresence>
        {showSync && <CalendarSyncModal onClose={() => setShowSync(false)} />}
      </AnimatePresence>
    </div>
  );
}
