"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Sun, Sunset, Moon } from "lucide-react";
import { format, addDays, isSameDay, isToday, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

export interface AvailabilityDay {
  date: string; // yyyy-MM-dd
  slots: Array<{ startTime: string; endTime: string }>;
}

interface Props {
  doctorSlug: string;
  typeId?: string;
  /** Called when the patient picks a slot. */
  onSelect: (date: string, startTime: string) => void;
  /** Current selected slot (to highlight). */
  selected?: { date: string; startTime: string } | null;
}

const PAGE_SIZE = 7;
const WINDOW_DAYS = 28; // we fetch 28 days max, paginated 7 at a time

/**
 * Doctolib-style availability picker.
 *
 * - Horizontal date carousel (7 days visible, paginated).
 * - Slots split into Matin / Après-midi / Soir.
 * - Unavailable slots are never rendered.
 */
export function AvailabilityCalendar({ doctorSlug, typeId, onSelect, selected }: Props) {
  const [offset, setOffset] = useState(0); // offset in days from today
  const [days, setDays] = useState<AvailabilityDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(() =>
    format(new Date(), "yyyy-MM-dd"),
  );

  // Fetch availability for the current 28-day window
  useEffect(() => {
    const controller = new AbortController();
    const start = format(addDays(new Date(), offset), "yyyy-MM-dd");
    const params = new URLSearchParams({ start, days: String(WINDOW_DAYS) });
    if (typeId) params.set("typeId", typeId);

    setLoading(true);
    setError(null);

    fetch(`/api/doctors/by-slug/${doctorSlug}/availability?${params.toString()}`, {
      signal: controller.signal,
    })
      .then((r) => {
        if (!r.ok) throw new Error("fetch failed");
        return r.json() as Promise<{ days: AvailabilityDay[] }>;
      })
      .then((data) => {
        setDays(data.days);
        // Auto-select the first day with slots if nothing selected yet
        const firstWithSlots = data.days.find((d) => d.slots.length > 0);
        if (firstWithSlots) {
          setSelectedDate((cur) => {
            const curInRange = data.days.find((d) => d.date === cur);
            if (curInRange && curInRange.slots.length > 0) return cur;
            return firstWithSlots.date;
          });
        } else if (data.days.length > 0) {
          setSelectedDate(data.days[0].date);
        }
        setLoading(false);
      })
      .catch((e) => {
        if (e.name === "AbortError") return;
        setError("Impossible de charger les disponibilités");
        setLoading(false);
      });

    return () => controller.abort();
  }, [doctorSlug, typeId, offset]);

  // The visible week = first 7 days of the fetched window
  const visibleDays = useMemo(() => days.slice(0, PAGE_SIZE), [days]);

  const selectedDay = useMemo(
    () => days.find((d) => d.date === selectedDate),
    [days, selectedDate],
  );

  // Partition slots into morning / afternoon / evening
  const sections = useMemo(() => {
    const slots = selectedDay?.slots ?? [];
    const morning: typeof slots = [];
    const afternoon: typeof slots = [];
    const evening: typeof slots = [];
    for (const s of slots) {
      const h = parseInt(s.startTime.slice(0, 2), 10);
      if (h < 12) morning.push(s);
      else if (h < 17) afternoon.push(s);
      else evening.push(s);
    }
    return { morning, afternoon, evening };
  }, [selectedDay]);

  const canGoPrev = offset > 0;

  return (
    <div className="space-y-5">
      {/* Header with pagination */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          disabled={!canGoPrev || loading}
          onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
          className="inline-flex items-center justify-center h-10 w-10 rounded-full border border-[#E6F4F1] bg-white text-[#0891B2] hover:bg-[#F0FDFA] hover:border-[#0891B2] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Semaine précédente"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <div className="text-center">
          <p className="text-xs uppercase tracking-wider text-[#0E7490]/60 font-semibold">
            Disponibilités
          </p>
          <p className="text-sm font-bold text-[#134E4A]">
            {visibleDays.length > 0
              ? `${format(parseISO(visibleDays[0].date), "d MMM", { locale: fr })} – ${format(
                  parseISO(visibleDays[visibleDays.length - 1].date),
                  "d MMM yyyy",
                  { locale: fr },
                )}`
              : ""}
          </p>
        </div>

        <button
          type="button"
          disabled={loading}
          onClick={() => setOffset((o) => o + PAGE_SIZE)}
          className="inline-flex items-center justify-center h-10 w-10 rounded-full border border-[#E6F4F1] bg-white text-[#0891B2] hover:bg-[#F0FDFA] hover:border-[#0891B2] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Semaine suivante"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Day carousel — flex-nowrap + overflow-x-auto so days scroll horizontally on mobile */}
      <div className="flex flex-nowrap gap-2 overflow-x-auto snap-x snap-mandatory pb-2 -mx-1 px-1 scrollbar-thin">
        {loading && visibleDays.length === 0
          ? Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className="flex-1 min-w-[72px] h-[84px] rounded-2xl bg-[#F0FDFA] animate-pulse snap-start"
              />
            ))
          : visibleDays.map((day) => {
              const d = parseISO(day.date);
              const isSelected = day.date === selectedDate;
              const count = day.slots.length;
              const disabled = count === 0;
              return (
                <button
                  key={day.date}
                  type="button"
                  onClick={() => !disabled && setSelectedDate(day.date)}
                  disabled={disabled}
                  className={`flex-1 min-w-[72px] snap-start rounded-2xl px-2 py-3 flex flex-col items-center justify-center gap-0.5 transition-all ${
                    isSelected
                      ? "bg-[#0891B2] text-white shadow-md border border-[#0891B2]"
                      : disabled
                        ? "bg-white border border-[#E6F4F1] text-[#134E4A]/30 cursor-not-allowed"
                        : "bg-white border border-[#E6F4F1] hover:border-[#0891B2] text-[#134E4A]"
                  }`}
                >
                  <span
                    className={`text-[10px] uppercase font-bold tracking-wider ${
                      isSelected ? "text-white/80" : "text-[#0E7490]/70"
                    }`}
                  >
                    {format(d, "EEE", { locale: fr }).replace(".", "")}
                  </span>
                  <span className="text-xl font-heading font-black leading-none">
                    {format(d, "d")}
                  </span>
                  <span
                    className={`text-[10px] font-semibold ${
                      isSelected ? "text-white/80" : "text-[#0E7490]/60"
                    }`}
                  >
                    {format(d, "MMM", { locale: fr }).replace(".", "")}
                  </span>
                  <span
                    className={`text-[10px] mt-0.5 font-bold ${
                      isSelected
                        ? "text-white"
                        : count > 0
                          ? "text-[#22C55E]"
                          : "text-[#134E4A]/30"
                    }`}
                  >
                    {count > 0 ? `${count} créneau${count > 1 ? "x" : ""}` : "—"}
                  </span>
                  {isToday(d) && !isSelected && (
                    <span className="text-[9px] uppercase text-[#0891B2] font-bold">
                      Aujourd&apos;hui
                    </span>
                  )}
                </button>
              );
            })}
      </div>

      {/* Slot sections */}
      {error ? (
        <div className="text-center py-10">
          <p className="text-sm text-red-500">{error}</p>
        </div>
      ) : loading ? (
        <div className="text-center py-10">
          <p className="text-sm text-[#134E4A]/40">Chargement des créneaux...</p>
        </div>
      ) : !selectedDay || selectedDay.slots.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#E6F4F1] bg-[#F0FDFA]/40 py-10 px-4 text-center space-y-3">
          <p className="text-sm font-semibold text-[#134E4A]">
            Aucun créneau disponible ce jour
          </p>
          <button
            type="button"
            onClick={() => {
              // jump to next day with slots in current window
              const idx = days.findIndex((d) => d.date === selectedDate);
              const next = days.slice(idx + 1).find((d) => d.slots.length > 0);
              if (next) setSelectedDate(next.date);
              else setOffset((o) => o + PAGE_SIZE);
            }}
            className="text-sm font-bold text-[#0891B2] hover:underline"
          >
            Voir le prochain créneau disponible →
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          <SlotSection
            icon={<Sun className="h-4 w-4" />}
            label="Matin"
            slots={sections.morning}
            selectedDate={selectedDate}
            selected={selected}
            onSelect={onSelect}
          />
          <SlotSection
            icon={<Sunset className="h-4 w-4" />}
            label="Après-midi"
            slots={sections.afternoon}
            selectedDate={selectedDate}
            selected={selected}
            onSelect={onSelect}
          />
          <SlotSection
            icon={<Moon className="h-4 w-4" />}
            label="Soir"
            slots={sections.evening}
            selectedDate={selectedDate}
            selected={selected}
            onSelect={onSelect}
          />
        </div>
      )}
    </div>
  );
}

function SlotSection({
  icon,
  label,
  slots,
  selectedDate,
  selected,
  onSelect,
}: {
  icon: React.ReactNode;
  label: string;
  slots: Array<{ startTime: string; endTime: string }>;
  selectedDate: string;
  selected?: { date: string; startTime: string } | null;
  onSelect: (date: string, startTime: string) => void;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2.5 text-[#0E7490]">
        {icon}
        <h3 className="text-xs uppercase tracking-wider font-bold">{label}</h3>
        <span className="text-xs font-semibold text-[#134E4A]/40">
          ({slots.length})
        </span>
      </div>
      {slots.length === 0 ? (
        <p className="text-xs text-[#134E4A]/40 italic pl-6">Aucun créneau</p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {slots.map((slot) => {
            const isSelected =
              selected?.date === selectedDate && selected?.startTime === slot.startTime;
            return (
              <button
                key={slot.startTime}
                type="button"
                onClick={() => onSelect(selectedDate, slot.startTime)}
                className={`min-h-[44px] rounded-xl px-4 py-2.5 text-sm font-bold transition-colors border ${
                  isSelected
                    ? "bg-[#0891B2] text-white border-[#0891B2] shadow-md"
                    : "border-[#E6F4F1] text-[#0891B2] hover:bg-[#F0FDFA] hover:border-[#0891B2] bg-white"
                }`}
              >
                {slot.startTime}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Helper to keep it used without ts warning if user prunes
export { isSameDay };
