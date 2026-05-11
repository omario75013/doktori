"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
import {
  CalendarDays,
  Sun,
  Sunset,
  Clock,
  CheckCircle2,
  AlertCircle,
  Building2,
  Plus,
} from "lucide-react";
import { useTranslations } from "next-intl";

type DaySchedule = {
  dayOfWeek: number;
  open: boolean;
  morningOpen: boolean;
  morningStart: string;
  morningEnd: string;
  afternoonOpen: boolean;
  afternoonStart: string;
  afternoonEnd: string;
  slotDuration: number;
};

type Practice = {
  id: string;
  name: string;
  city: string;
  kind: "cabinet" | "clinic";
  isPrimary: boolean;
  isActive: boolean;
};

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const SLOT_DURATIONS = [10, 15, 20, 30, 45, 60];

function buildDefaultDays(): DaySchedule[] {
  return DAY_ORDER.map((dayOfWeek) => ({
    dayOfWeek,
    open: false,
    morningOpen: true,
    morningStart: "08:00",
    morningEnd: "12:00",
    afternoonOpen: true,
    afternoonStart: "14:00",
    afternoonEnd: "18:00",
    slotDuration: 20,
  }));
}

type ApiSlot = {
  id: string;
  doctorId: string;
  practiceId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDuration: number;
  isActive: boolean;
};

function mergeApiSlots(defaults: DaySchedule[], apiSlots: ApiSlot[]): DaySchedule[] {
  const byDay: Record<number, ApiSlot[]> = {};
  for (const slot of apiSlots) {
    if (!byDay[slot.dayOfWeek]) byDay[slot.dayOfWeek] = [];
    byDay[slot.dayOfWeek].push(slot);
  }

  return defaults.map((day) => {
    const slots = byDay[day.dayOfWeek];
    if (!slots || slots.length === 0) return day;

    const sorted = [...slots].sort((a, b) => a.startTime.localeCompare(b.startTime));
    // A slot starting before 12:00 is considered "morning"; others "afternoon".
    const morning = sorted.find((s) => s.startTime < "12:00");
    const afternoon = sorted.find((s) => s.startTime >= "12:00");
    const reference = morning ?? afternoon ?? sorted[0];

    return {
      dayOfWeek: day.dayOfWeek,
      open: true,
      morningOpen: !!morning,
      morningStart: morning ? morning.startTime.slice(0, 5) : "08:00",
      morningEnd: morning ? morning.endTime.slice(0, 5) : "12:00",
      afternoonOpen: !!afternoon,
      afternoonStart: afternoon ? afternoon.startTime.slice(0, 5) : "14:00",
      afternoonEnd: afternoon ? afternoon.endTime.slice(0, 5) : "18:00",
      slotDuration: reference.slotDuration,
    };
  });
}

const timeInputClass =
  "w-28 h-10 rounded-xl border-border focus-visible:ring-primary text-sm";

export function AgendaEditor() {
  const t = useTranslations("medecin.agenda");
  const tCal = useTranslations("medecin.calendrier");
  const tCommon = useTranslations("medecin.common");

  const DAY_LABELS: Record<number, string> = {
    1: t("days.1"),
    2: t("days.2"),
    3: t("days.3"),
    4: t("days.4"),
    5: t("days.5"),
    6: t("days.6"),
    0: t("days.0"),
  };

  const [practices, setPractices] = useState<Practice[]>([]);
  const [selectedPracticeId, setSelectedPracticeId] = useState<string | null>(null);
  const [days, setDays] = useState<DaySchedule[]>(buildDefaultDays());
  const [loadingPractices, setLoadingPractices] = useState(true);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );

  // Load practices once
  useEffect(() => {
    async function fetchPractices() {
      try {
        const res = await fetch("/api/doctor/practices");
        if (!res.ok) throw new Error(t("loadError"));
        const data: Practice[] = await res.json();
        const active = data.filter((p) => p.isActive);
        setPractices(active);
        if (active.length > 0) {
          const primary = active.find((p) => p.isPrimary) ?? active[0];
          setSelectedPracticeId(primary.id);
        }
      } catch {
        setFeedback({ type: "error", message: t("loadError") });
      } finally {
        setLoadingPractices(false);
      }
    }
    fetchPractices();
  }, []);

  // Load schedule whenever selected practice changes
  useEffect(() => {
    if (!selectedPracticeId) return;
    async function fetchSchedule() {
      setLoadingSchedule(true);
      setDays(buildDefaultDays());
      setFeedback(null);
      try {
        const res = await fetch(`/api/schedules?practiceId=${selectedPracticeId}`);
        if (!res.ok) throw new Error(t("loadError"));
        const data: ApiSlot[] = await res.json();
        // Server currently returns all doctor schedules (backward-compat).
        // Filter client-side to the selected practice.
        const filtered = data.filter((s) => s.practiceId === selectedPracticeId);
        setDays((prev) => mergeApiSlots(prev, filtered));
      } catch {
        setFeedback({ type: "error", message: t("loadError") });
      } finally {
        setLoadingSchedule(false);
      }
    }
    fetchSchedule();
  }, [selectedPracticeId, t]);

  function updateDay(dayOfWeek: number, patch: Partial<DaySchedule>) {
    setDays((prev) => prev.map((d) => (d.dayOfWeek === dayOfWeek ? { ...d, ...patch } : d)));
  }

  async function handleSave() {
    if (!selectedPracticeId) return;
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
      // Require at least one period (morning or afternoon) to be enabled
      if (!day.morningOpen && !day.afternoonOpen) {
        setFeedback({
          type: "error",
          message: tCal("errorAtLeastOnePeriod", { day: DAY_LABELS[day.dayOfWeek] }),
        });
        setSaving(false);
        return;
      }
      if (day.morningOpen && day.morningStart && day.morningEnd) {
        if (day.morningStart >= day.morningEnd) {
          setFeedback({
            type: "error",
            message: `${DAY_LABELS[day.dayOfWeek]} : ${t("morningEndError")}`,
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
      if (day.afternoonOpen && day.afternoonStart && day.afternoonEnd) {
        if (day.afternoonStart >= day.afternoonEnd) {
          setFeedback({
            type: "error",
            message: `${DAY_LABELS[day.dayOfWeek]} : ${t("afternoonEndError")}`,
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
        body: JSON.stringify({ slots, practiceId: selectedPracticeId }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.error ? JSON.stringify(err.error) : "Erreur serveur");
      }

      setFeedback({ type: "success", message: t("saved") });
    } catch (e) {
      setFeedback({
        type: "error",
        message: e instanceof Error ? e.message : t("saveError"),
      });
    } finally {
      setSaving(false);
    }
  }

  // ─── Loading ─────
  if (loadingPractices) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-foreground/60 text-sm">{t("loading")}</p>
        </div>
      </div>
    );
  }

  // ─── Empty: no cabinet yet ─────
  if (practices.length === 0) {
    return (
      <div className="w-full">
        <div className="rounded-2xl border border-dashed border-border bg-secondary/40 p-10 text-center">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Building2 className="h-7 w-7 text-primary" />
          </div>
          <h3 className="mt-4 text-lg font-bold text-foreground">
            {tCal("emptyAddCabinetTitle")}
          </h3>
          <p className="mt-2 text-sm text-foreground/60 max-w-md mx-auto">
            {tCal("emptyAddCabinetDesc")}
          </p>
          <Link
            href="/cabinets"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            {tCal("managePracticesBtn")}
          </Link>
        </div>
      </div>
    );
  }

  const openDaysCount = days.filter((d) => d.open).length;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
            <CalendarDays className="h-4 w-4 text-primary" strokeWidth={2} />
          </div>
          <h2 className="text-xl font-black text-foreground">{t("title")}</h2>
        </div>
        <p className="text-sm text-foreground/60 ml-10">{t("subtitle")}</p>
      </div>

      {/* Cabinet tabs */}
      <div className="flex flex-wrap gap-2">
        {practices.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelectedPracticeId(p.id)}
            className={`inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-medium transition-colors ${
              selectedPracticeId === p.id
                ? "bg-primary text-white shadow-sm"
                : "bg-white border border-border text-foreground hover:bg-secondary"
            }`}
          >
            <Building2 className="h-3.5 w-3.5" />
            {p.name}
            {p.isPrimary && (
              <span className="text-[10px] rounded-full bg-white/20 px-1.5 py-0.5">
                {tCommon("primary")}
              </span>
            )}
            {p.kind === "clinic" && (
              <span className="text-[10px] rounded-full bg-blue-100 text-blue-700 px-1.5 py-0.5">
                {tCommon("clinic")}
              </span>
            )}
          </button>
        ))}
        <Link
          href="/cabinets"
          className="inline-flex items-center gap-1 rounded-xl border border-dashed border-border px-3 py-1.5 text-sm font-medium text-foreground/60 hover:bg-secondary"
        >
          <Plus className="h-3.5 w-3.5" />
          {tCal("addCabinetBtn")}
        </Link>
      </div>

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

      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <Clock className="h-3 w-3" />
          {openDaysCount !== 1
            ? t("openDaysPlural", { count: openDaysCount })
            : t("openDays", { count: openDaysCount })}
        </span>
      </div>

      {loadingSchedule ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="ds-card divide-y divide-[color:var(--line-cool)] overflow-hidden">
          {days.map((day) => (
            <div
              key={day.dayOfWeek}
              className={`p-5 transition-colors ${
                day.open ? "bg-white dark:bg-gray-900" : "bg-secondary/30 dark:bg-gray-800/30"
              }`}
            >
              <div className="flex items-center gap-3">
                <Checkbox
                  id={`day-${day.dayOfWeek}`}
                  checked={day.open}
                  onCheckedChange={(checked) =>
                    updateDay(day.dayOfWeek, { open: Boolean(checked) })
                  }
                  className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                <Label htmlFor={`day-${day.dayOfWeek}`} className="cursor-pointer select-none">
                  {day.open ? (
                    <span className="inline-flex items-center justify-center rounded-lg bg-primary px-3 py-1 text-sm font-bold text-white min-w-[90px] text-center">
                      {DAY_LABELS[day.dayOfWeek]}
                    </span>
                  ) : (
                    <span className="inline-flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 px-3 py-1 text-sm font-semibold text-gray-400 dark:text-gray-500 min-w-[90px] text-center">
                      {DAY_LABELS[day.dayOfWeek]}
                    </span>
                  )}
                </Label>
                {!day.open && <span className="text-xs text-gray-400 italic">{t("closed")}</span>}
              </div>

              {day.open && (
                <div className="mt-4 ml-8 space-y-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2 w-32 flex-shrink-0">
                      <Checkbox
                        id={`morning-${day.dayOfWeek}`}
                        checked={day.morningOpen}
                        onCheckedChange={(checked) =>
                          updateDay(day.dayOfWeek, { morningOpen: Boolean(checked) })
                        }
                        className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                      <Label
                        htmlFor={`morning-${day.dayOfWeek}`}
                        className="flex items-center gap-1.5 cursor-pointer select-none"
                      >
                        <Sun className="h-3.5 w-3.5 text-amber-400" />
                        <span className="text-xs font-semibold text-foreground/70">
                          {t("morning")}
                        </span>
                      </Label>
                    </div>
                    {day.morningOpen ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        <Input
                          type="time"
                          value={day.morningStart}
                          onChange={(e) =>
                            updateDay(day.dayOfWeek, { morningStart: e.target.value })
                          }
                          className={timeInputClass}
                        />
                        <span className="text-foreground/40 font-bold">—</span>
                        <Input
                          type="time"
                          value={day.morningEnd}
                          onChange={(e) =>
                            updateDay(day.dayOfWeek, { morningEnd: e.target.value })
                          }
                          className={timeInputClass}
                        />
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 italic">
                        {t("closed")}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2 w-32 flex-shrink-0">
                      <Checkbox
                        id={`afternoon-${day.dayOfWeek}`}
                        checked={day.afternoonOpen}
                        onCheckedChange={(checked) =>
                          updateDay(day.dayOfWeek, { afternoonOpen: Boolean(checked) })
                        }
                        className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                      <Label
                        htmlFor={`afternoon-${day.dayOfWeek}`}
                        className="flex items-center gap-1.5 cursor-pointer select-none"
                      >
                        <Sunset className="h-3.5 w-3.5 text-orange-400" />
                        <span className="text-xs font-semibold text-foreground/70">
                          {t("afternoon")}
                        </span>
                      </Label>
                    </div>
                    {day.afternoonOpen ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        <Input
                          type="time"
                          value={day.afternoonStart}
                          onChange={(e) =>
                            updateDay(day.dayOfWeek, { afternoonStart: e.target.value })
                          }
                          className={timeInputClass}
                        />
                        <span className="text-foreground/40 font-bold">—</span>
                        <Input
                          type="time"
                          value={day.afternoonEnd}
                          onChange={(e) =>
                            updateDay(day.dayOfWeek, { afternoonEnd: e.target.value })
                          }
                          className={timeInputClass}
                        />
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 italic">
                        {t("closed")}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-1.5 w-24 flex-shrink-0">
                      <Clock className="h-3.5 w-3.5 text-primary" />
                      <span className="text-xs font-semibold text-foreground/70">
                        {t("duration")}
                      </span>
                    </div>
                    <Select
                      value={String(day.slotDuration)}
                      onValueChange={(val) => {
                        if (val) updateDay(day.dayOfWeek, { slotDuration: Number(val) });
                      }}
                    >
                      <SelectTrigger className="w-32 h-10 rounded-xl border-border focus:ring-primary">
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
      )}

      <div className="flex justify-end pb-6">
        <Button
          onClick={handleSave}
          disabled={saving || loadingSchedule}
          className="h-12 px-8 rounded-xl bg-primary hover:bg-doktori-teal-dark font-bold text-white text-base transition-colors"
          size="lg"
        >
          {saving ? t("saving") : t("save")}
        </Button>
      </div>
    </div>
  );
}
