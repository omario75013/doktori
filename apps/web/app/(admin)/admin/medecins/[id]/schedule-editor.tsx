"use client";

import useSWR, { mutate } from "swr";
import { useState, useEffect } from "react";
import { Plus, Trash2, Loader2, Save } from "lucide-react";

type Slot = {
  id?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDuration: number;
  isActive?: boolean;
};

const DAYS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function ScheduleEditor({ doctorId }: { doctorId: string }) {
  const url = `/api/admin/doctors/${doctorId}/schedule`;
  const { data, isLoading } = useSWR<{ schedule: Slot[] }>(url, fetcher);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (data?.schedule) {
      setSlots(
        data.schedule.map((s) => ({
          dayOfWeek: s.dayOfWeek,
          startTime: (s.startTime as string).slice(0, 5),
          endTime: (s.endTime as string).slice(0, 5),
          slotDuration: s.slotDuration,
          isActive: s.isActive ?? true,
        }))
      );
    }
  }, [data]);

  function addSlot() {
    setSlots([
      ...slots,
      { dayOfWeek: 1, startTime: "09:00", endTime: "17:00", slotDuration: 20 },
    ]);
  }

  function removeSlot(i: number) {
    setSlots(slots.filter((_, idx) => idx !== i));
  }

  function update(i: number, patch: Partial<Slot>) {
    setSlots(slots.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    const res = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slots }),
    });
    setSaving(false);
    if (res.ok) {
      setMsg("Horaires enregistrés");
      mutate(url);
    } else {
      const d = await res.json().catch(() => ({}));
      setMsg(d.error || "Erreur");
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-sm text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="space-y-2 mb-4">
        {slots.length === 0 && (
          <p className="text-sm text-slate-500 text-center py-6">
            Aucun créneau — cliquez sur « Ajouter » pour en créer
          </p>
        )}
        {slots.map((s, i) => (
          <div
            key={i}
            className="flex flex-wrap items-center gap-2 bg-slate-50 rounded-lg p-3"
          >
            <select
              value={s.dayOfWeek}
              onChange={(e) => update(i, { dayOfWeek: Number(e.target.value) })}
              className="px-2 py-1.5 text-sm border border-slate-200 rounded-md bg-white"
            >
              {DAYS.map((d, idx) => (
                <option key={idx} value={idx}>
                  {d}
                </option>
              ))}
            </select>
            <input
              type="time"
              value={s.startTime}
              onChange={(e) => update(i, { startTime: e.target.value })}
              className="px-2 py-1.5 text-sm border border-slate-200 rounded-md bg-white"
            />
            <span className="text-slate-400">→</span>
            <input
              type="time"
              value={s.endTime}
              onChange={(e) => update(i, { endTime: e.target.value })}
              className="px-2 py-1.5 text-sm border border-slate-200 rounded-md bg-white"
            />
            <select
              value={s.slotDuration}
              onChange={(e) => update(i, { slotDuration: Number(e.target.value) })}
              className="px-2 py-1.5 text-sm border border-slate-200 rounded-md bg-white"
            >
              {[10, 15, 20, 30, 45, 60].map((d) => (
                <option key={d} value={d}>
                  {d} min
                </option>
              ))}
            </select>
            <button
              onClick={() => removeSlot(i)}
              className="ml-auto p-1.5 text-red-500 hover:bg-red-50 rounded-md"
              aria-label="Supprimer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
        <button
          onClick={addSlot}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Ajouter un créneau
        </button>
        <div className="flex items-center gap-3">
          {msg && <span className="text-xs text-slate-500">{msg}</span>}
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}
