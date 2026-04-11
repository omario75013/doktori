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
        slots.push({
          dayOfWeek: day.dayOfWeek,
          startTime: day.morningStart,
          endTime: day.morningEnd,
          slotDuration: day.slotDuration,
          isActive: true,
        });
      }
      if (day.afternoonStart && day.afternoonEnd) {
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
      <div className="flex items-center justify-center h-64 text-gray-500">
        Chargement de l'agenda…
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Configuration de l'agenda</h1>
      <p className="text-sm text-gray-500 mb-6">
        Définissez vos horaires de disponibilité pour chaque jour de la semaine.
      </p>

      {feedback && (
        <div
          className={`mb-4 rounded-lg px-4 py-3 text-sm ${
            feedback.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {feedback.message}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        {days.map((day) => (
          <div key={day.dayOfWeek} className="p-4">
            {/* Day header row */}
            <div className="flex items-center gap-3 mb-3">
              <Checkbox
                id={`day-${day.dayOfWeek}`}
                checked={day.open}
                onCheckedChange={(checked) =>
                  updateDay(day.dayOfWeek, { open: Boolean(checked) })
                }
              />
              <Label
                htmlFor={`day-${day.dayOfWeek}`}
                className="w-24 font-semibold text-gray-700"
              >
                {DAY_LABELS[day.dayOfWeek]}
              </Label>
              {!day.open && (
                <span className="text-xs text-gray-400 italic">Fermé</span>
              )}
            </div>

            {/* Time blocks (visible when day is open) */}
            {day.open && (
              <div className="ml-7 space-y-3">
                {/* Morning block */}
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-xs text-gray-500 w-16">Matin</span>
                  <div className="flex items-center gap-2">
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
                      className="w-28"
                    />
                    <span className="text-gray-400">—</span>
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
                      className="w-28"
                    />
                  </div>
                </div>

                {/* Afternoon block */}
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-xs text-gray-500 w-16">Après-midi</span>
                  <div className="flex items-center gap-2">
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
                      className="w-28"
                    />
                    <span className="text-gray-400">—</span>
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
                      className="w-28"
                    />
                  </div>
                </div>

                {/* Slot duration */}
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-16">Durée RDV</span>
                  <Select
                    value={String(day.slotDuration)}
                    onValueChange={(val) => {
                      if (val) updateDay(day.dayOfWeek, { slotDuration: Number(val) });
                    }}
                  >
                    <SelectTrigger className="w-28">
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

      <div className="mt-6 flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving ? "Sauvegarde…" : "Enregistrer l'agenda"}
        </Button>
      </div>
    </div>
  );
}
