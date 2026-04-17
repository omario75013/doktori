"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarDays, Sun, Sunset, Clock, CheckCircle2, AlertCircle } from "lucide-react";

type DaySchedule = {
  dayOfWeek: number;
  open: boolean;
  morningStart: string;
  morningEnd: string;
  afternoonStart: string;
  afternoonEnd: string;
  slotDuration: number;
};

const DAY_LABELS: Record<number, string> = {
  1: "Lundi",
  2: "Mardi",
  3: "Mercredi",
  4: "Jeudi",
  5: "Vendredi",
  6: "Samedi",
  0: "Dimanche",
};

// Display order: Mon–Sun
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

const SLOT_DURATIONS = [10, 15, 20, 30, 45, 60];

function buildDefaultDays(): DaySchedule[] {
  return DAY_ORDER.map((dayOfWeek) => ({
    dayOfWeek,
    open: false,
    morningStart: "08:00",
    morningEnd: "12:00",
    afternoonStart: "14:00",
    afternoonEnd: "18:00",
    slotDuration: 20,
  }));
}

type ApiSlot = {
  id: string;
  doctorId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDuration: number;
  isActive: boolean;
};

function mergeApiSlots(defaults: DaySchedule[], apiSlots: ApiSlot[]): DaySchedule[] {
  // Group slots by dayOfWeek
  const byDay: Record<number, ApiSlot[]> = {};
  for (const slot of apiSlots) {
    if (!byDay[slot.dayOfWeek]) byDay[slot.dayOfWeek] = [];
    byDay[slot.dayOfWeek].push(slot);
  }

  return defaults.map((day) => {
    const slots = byDay[day.dayOfWeek];
    if (!slots || slots.length === 0) return day;

    // Sort by start time to identify morning vs afternoon
    const sorted = [...slots].sort((a, b) => a.startTime.localeCompare(b.startTime));
    const first = sorted[0];
    const second = sorted[1];

    return {
      dayOfWeek: day.dayOfWeek,
      open: true,
      morningStart: first.startTime.slice(0, 5),
      morningEnd: first.endTime.slice(0, 5),
      afternoonStart: second ? second.startTime.slice(0, 5) : "14:00",
      afternoonEnd: second ? second.endTime.slice(0, 5) : "18:00",
      slotDuration: first.slotDuration,
    };
  });
}

const timeInputClass =
  "w-28 h-10 rounded-xl border-[#E6F4F1] focus-visible:ring-[#0891B2] text-sm";

export default function AgendaPage() {
  const [days, setDays] = useState<DaySchedule[]>(buildDefaultDays());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );

  useEffect(() => {
    async function fetchSchedule() {
      try {
        const res = await fetch("/api/schedules");
        if (!res.ok) throw new Error("Erreur lors du chargement");
        const data: ApiSlot[] = await res.json();
        setDays((prev) => mergeApiSlots(prev, data));
      } catch {
        setFeedback({ type: "error", message: "Impossible de charger l'agenda." });
      } finally {
        setLoading(false);
      }
    }
    fetchSchedule();
  }, []);

  function updateDay(dayOfWeek: number, patch: Partial<DaySchedule>) {
    setDays((prev) =>
      prev.map((d) => (d.dayOfWeek === dayOfWeek ? { ...d, ...patch } : d))
    );
  }

  async function handleSave() {
    setSaving(true);
    setFeedback(null);

    const slots: Array<{
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      slotDuration: number;
      isActive: boolean;
    }> = [];

    for (const day of days) {
      if (!day.open) continue;
      if (day.morningStart && day.morningEnd) {
        if (day.morningStart >= day.morningEnd) {
          setFeedback({
            type: "error",
            message: `${DAY_LABELS[day.dayOfWeek]} : l'heure de fin du matin doit être après l'heure de début.`,
          });
          setSaving(false);
          return;
        }
        slots.push({
          dayOfWeek: day.dayOfWeek,
          startTime: day.morningStart,
          endTime: day.morningEnd,
          slotDuration: day.slotDuration,
          isActive: true,
        });
      }
      if (day.afternoonStart && day.afternoonEnd) {
        if (day.afternoonStart >= day.afternoonEnd) {
          setFeedback({
            type: "error",
            message: `${DAY_LABELS[day.dayOfWeek]} : l'heure de fin de l'après-midi doit être après l'heure de début.`,
          });
          setSaving(false);
          return;
        }
        slots.push({
          dayOfWeek: day.dayOfWeek,
          startTime: day.afternoonStart,
          endTime: day.afternoonEnd,
          slotDuration: day.slotDuration,
          isActive: true,
        });
      }
    }

    try {
      const res = await fetch("/api/schedules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slots }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.error ? JSON.stringify(err.error) : "Erreur serveur");
      }

      setFeedback({ type: "success", message: "Agenda sauvegardé avec succès." });
    } catch (e) {
      setFeedback({
        type: "error",
        message: e instanceof Error ? e.message : "Erreur lors de la sauvegarde.",
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-[#0891B2] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-[#134E4A]/60 text-sm">Chargement de l'agenda...</p>
        </div>
      </div>
    );
  }

  const openDaysCount = days.filter((d) => d.open).length;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Page header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#0891B2]/10">
            <CalendarDays className="h-4 w-4 text-[#0891B2]" strokeWidth={2} />
          </div>
          <h1 className="text-2xl font-black text-[#134E4A]">Configuration de l'agenda</h1>
        </div>
        <p className="text-sm text-[#134E4A]/60 ml-10">
          Définissez vos horaires de disponibilité pour chaque jour de la semaine.
        </p>
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div
          className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium ${
            feedback.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-green-600" />
          ) : (
            <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-600" />
          )}
          {feedback.message}
        </div>
      )}

      {/* Summary pill */}
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0891B2]/10 px-3 py-1 text-xs font-semibold text-[#0891B2]">
          <Clock className="h-3 w-3" />
          {openDaysCount} jour{openDaysCount !== 1 ? "s" : ""} ouvert{openDaysCount !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Schedule grid */}
      <div className="bg-white rounded-2xl border border-[#E6F4F1] shadow-sm divide-y divide-[#E6F4F1]">
        {days.map((day) => (
          <div
            key={day.dayOfWeek}
            className={`p-5 transition-colors ${day.open ? "bg-white" : "bg-[#F0FDFA]/30"}`}
          >
            {/* Day header row */}
            <div className="flex items-center gap-3">
              <Checkbox
                id={`day-${day.dayOfWeek}`}
                checked={day.open}
                onCheckedChange={(checked) =>
                  updateDay(day.dayOfWeek, { open: Boolean(checked) })
                }
                className="data-[state=checked]:bg-[#0891B2] data-[state=checked]:border-[#0891B2]"
              />
              <Label
                htmlFor={`day-${day.dayOfWeek}`}
                className="cursor-pointer select-none"
              >
                {day.open ? (
                  <span className="inline-flex items-center justify-center rounded-lg bg-[#0891B2] px-3 py-1 text-sm font-bold text-white min-w-[90px] text-center">
                    {DAY_LABELS[day.dayOfWeek]}
                  </span>
                ) : (
                  <span className="inline-flex items-center justify-center rounded-lg bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-400 min-w-[90px] text-center">
                    {DAY_LABELS[day.dayOfWeek]}
                  </span>
                )}
              </Label>
              {!day.open && (
                <span className="text-xs text-gray-400 italic">Fermé</span>
              )}
            </div>

            {/* Time blocks (visible when day is open) */}
            {day.open && (
              <div className="mt-4 ml-8 space-y-4">
                {/* Morning block */}
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-1.5 w-24 flex-shrink-0">
                    <Sun className="h-3.5 w-3.5 text-amber-400" />
                    <span className="text-xs font-semibold text-[#134E4A]/70">Matin</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Label htmlFor={`ms-${day.dayOfWeek}`} className="sr-only">
                      Début matin
                    </Label>
                    <Input
                      id={`ms-${day.dayOfWeek}`}
                      type="time"
                      value={day.morningStart}
                      onChange={(e) =>
                        updateDay(day.dayOfWeek, { morningStart: e.target.value })
                      }
                      className={timeInputClass}
                    />
                    <span className="text-[#134E4A]/40 font-bold">—</span>
                    <Label htmlFor={`me-${day.dayOfWeek}`} className="sr-only">
                      Fin matin
                    </Label>
                    <Input
                      id={`me-${day.dayOfWeek}`}
                      type="time"
                      value={day.morningEnd}
                      onChange={(e) =>
                        updateDay(day.dayOfWeek, { morningEnd: e.target.value })
                      }
                      className={timeInputClass}
                    />
                  </div>
                </div>

                {/* Afternoon block */}
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-1.5 w-24 flex-shrink-0">
                    <Sunset className="h-3.5 w-3.5 text-orange-400" />
                    <span className="text-xs font-semibold text-[#134E4A]/70">Après-midi</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Label htmlFor={`as-${day.dayOfWeek}`} className="sr-only">
                      Début après-midi
                    </Label>
                    <Input
                      id={`as-${day.dayOfWeek}`}
                      type="time"
                      value={day.afternoonStart}
                      onChange={(e) =>
                        updateDay(day.dayOfWeek, { afternoonStart: e.target.value })
                      }
                      className={timeInputClass}
                    />
                    <span className="text-[#134E4A]/40 font-bold">—</span>
                    <Label htmlFor={`ae-${day.dayOfWeek}`} className="sr-only">
                      Fin après-midi
                    </Label>
                    <Input
                      id={`ae-${day.dayOfWeek}`}
                      type="time"
                      value={day.afternoonEnd}
                      onChange={(e) =>
                        updateDay(day.dayOfWeek, { afternoonEnd: e.target.value })
                      }
                      className={timeInputClass}
                    />
                  </div>
                </div>

                {/* Slot duration */}
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-1.5 w-24 flex-shrink-0">
                    <Clock className="h-3.5 w-3.5 text-[#0891B2]" />
                    <span className="text-xs font-semibold text-[#134E4A]/70">Durée RDV</span>
                  </div>
                  <Select
                    value={String(day.slotDuration)}
                    onValueChange={(val) => {
                      if (val) updateDay(day.dayOfWeek, { slotDuration: Number(val) });
                    }}
                  >
                    <SelectTrigger className="w-32 h-10 rounded-xl border-[#E6F4F1] focus:ring-[#0891B2]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SLOT_DURATIONS.map((d) => (
                        <SelectItem key={d} value={String(d)}>
                          {d} min
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Save button */}
      <div className="flex justify-end pb-6">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="h-12 px-8 rounded-xl bg-[#0891B2] hover:bg-[#0E7490] font-bold text-white text-base transition-colors"
          size="lg"
        >
          {saving ? "Sauvegarde en cours..." : "Enregistrer l'agenda"}
        </Button>
      </div>
    </div>
  );
}
