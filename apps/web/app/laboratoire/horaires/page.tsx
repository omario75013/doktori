"use client";

import { useState, useEffect } from "react";
import { Clock, Loader2, Plus, Trash2, Save } from "lucide-react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";

type WeekDay = {
  dayOfWeek: number;
  opensAt: string | null;
  closesAt: string | null;
  isClosed: boolean;
};

type ClosedDay = {
  id: string;
  date: string;
  reason: string | null;
};

const WEEKDAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

function defaultWeekly(): WeekDay[] {
  return Array.from({ length: 7 }, (_, i) => ({
    dayOfWeek: i,
    opensAt: "08:00",
    closesAt: "18:00",
    isClosed: i === 0, // Sunday closed by default
  }));
}

export default function LaboratoireHorairesPage() {
  const { data: session } = useSession();
  const t = useTranslations("laboratoire.schedule");
  const user = session?.user as { role?: string; labUserRole?: string } | undefined;
  const isAdmin = user?.role === "lab" || user?.labUserRole === "admin";

  const [weekly, setWeekly] = useState<WeekDay[]>(defaultWeekly());
  const [closedDays, setClosedDays] = useState<ClosedDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Add closed day form
  const [newDate, setNewDate] = useState("");
  const [newReason, setNewReason] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/laboratoire/schedule");
      if (res.ok) {
        const data = await res.json();
        if (data.weekly && data.weekly.length > 0) {
          // Merge fetched with defaults (fill gaps)
          const byDay: Record<number, WeekDay> = {};
          for (const d of data.weekly) byDay[d.dayOfWeek] = d;
          setWeekly(defaultWeekly().map((d) => byDay[d.dayOfWeek] ?? d));
        }
        setClosedDays(data.closedDays ?? []);
      }
      setLoading(false);
    }
    load();
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    await fetch("/api/laboratoire/schedule", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weekly }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleAddClosedDay() {
    if (!newDate) return;
    setAdding(true);
    const res = await fetch("/api/laboratoire/schedule/closed-days", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: newDate, reason: newReason.trim() || null }),
    });
    if (res.ok) {
      const data = await res.json();
      setClosedDays((prev) => [...prev, data.closedDay]);
      setNewDate("");
      setNewReason("");
    }
    setAdding(false);
  }

  async function handleDeleteClosedDay(id: string) {
    await fetch(`/api/laboratoire/schedule/closed-days/${id}`, { method: "DELETE" });
    setClosedDays((prev) => prev.filter((d) => d.id !== id));
  }

  function updateDay(i: number, patch: Partial<WeekDay>) {
    setWeekly((prev) => prev.map((d, idx) => idx === i ? { ...d, ...patch } : d));
  }

  if (loading) {
    return <div className="flex items-center justify-center py-32"><Loader2 className="h-8 w-8 animate-spin text-green-600" /></div>;
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
          <Clock className="h-6 w-6 text-green-600" strokeWidth={2.5} />
          {t("title")}
        </h1>
      </div>

      {/* Weekly schedule */}
      <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-gray-50">
                <th className="text-start px-4 py-3 font-semibold text-muted-foreground">{t("day")}</th>
                <th className="text-start px-4 py-3 font-semibold text-muted-foreground">{t("opensAt")}</th>
                <th className="text-start px-4 py-3 font-semibold text-muted-foreground">{t("closesAt")}</th>
                <th className="text-start px-4 py-3 font-semibold text-muted-foreground">{t("closed")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {weekly.map((day, i) => (
                <tr key={day.dayOfWeek} className={day.isClosed ? "bg-gray-50 opacity-60" : ""}>
                  <td className="px-4 py-3 font-semibold text-foreground capitalize">
                    {t(`weekdays.${WEEKDAY_KEYS[day.dayOfWeek]}` as Parameters<typeof t>[0])}
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="time"
                      className="border border-border rounded-lg px-2 py-1 text-sm disabled:opacity-40"
                      value={day.opensAt ?? ""}
                      disabled={!isAdmin || day.isClosed}
                      onChange={(e) => updateDay(i, { opensAt: e.target.value || null })}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="time"
                      className="border border-border rounded-lg px-2 py-1 text-sm disabled:opacity-40"
                      value={day.closesAt ?? ""}
                      disabled={!isAdmin || day.isClosed}
                      onChange={(e) => updateDay(i, { closesAt: e.target.value || null })}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      className="rounded border-border h-4 w-4"
                      checked={day.isClosed}
                      disabled={!isAdmin}
                      onChange={(e) => updateDay(i, { isClosed: e.target.checked })}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {isAdmin && (
          <div className="px-4 py-3 border-t border-border flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-50"
              style={{ background: "#16A34A" }}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {t("save")}
            </button>
            {saved && <span className="text-sm text-green-600 font-semibold">Enregistré ✓</span>}
          </div>
        )}
      </div>

      {/* Closed days */}
      <div className="space-y-4">
        <h2 className="text-lg font-black text-foreground">{t("closedDays")}</h2>

        {isAdmin && (
          <div className="flex gap-3 flex-wrap items-end">
            <div>
              <label className="block text-xs font-semibold mb-1">{t("date")}</label>
              <input
                type="date"
                className="border border-border rounded-xl px-3 py-2 text-sm"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">{t("reason")}</label>
              <input
                className="border border-border rounded-xl px-3 py-2 text-sm w-48"
                placeholder="Fête nationale…"
                value={newReason}
                onChange={(e) => setNewReason(e.target.value)}
              />
            </div>
            <button
              onClick={handleAddClosedDay}
              disabled={!newDate || adding}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-50"
              style={{ background: "#16A34A" }}
            >
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {t("addClosedDay")}
            </button>
          </div>
        )}

        {closedDays.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune fermeture exceptionnelle.</p>
        ) : (
          <div className="bg-white rounded-2xl border border-border shadow-sm divide-y divide-border">
            {closedDays.map((cd) => (
              <div key={cd.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <span className="font-semibold text-sm">{cd.date}</span>
                  {cd.reason && <span className="ml-2 text-sm text-muted-foreground">· {cd.reason}</span>}
                </div>
                {isAdmin && (
                  <button
                    onClick={() => handleDeleteClosedDay(cd.id)}
                    className="text-red-500 hover:text-red-700 p-1 rounded-lg hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
