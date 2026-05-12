"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { ar, fr } from "date-fns/locale";
import Link from "next/link";
import { Baby, Calendar, Loader2, Trash2 } from "lucide-react";

interface Pregnancy {
  id: string;
  dueDate: string;
  startDate: string | null;
  endedAt: string | null;
  notes: string | null;
}

const KEY_WEEKS = [4, 12, 20, 32, 40];

export default function GrossessePage() {
  const router = useRouter();
  const t = useTranslations("patient.grossesse");
  const locale = useLocale();
  const dateLocale = locale === "ar" ? ar : fr;
  void dateLocale;
  const dateFnsLocaleTag = locale === "ar" ? "ar-TN" : "fr-FR";
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pregnancy, setPregnancy] = useState<Pregnancy | null>(null);
  const [currentWeek, setCurrentWeek] = useState<number | null>(null);
  const [dueDate, setDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("doktori_patient_session");
    if (!stored) {
      router.push("/connexion-patient");
      return;
    }
    setToken(stored);
  }, [router]);

  useEffect(() => {
    if (!token) return;
    void load(token);
  }, [token]);

  async function load(t: string) {
    setLoading(true);
    try {
      const res = await fetch("/api/me/pregnancy", { headers: { Authorization: `Bearer ${t}` } });
      if (res.ok) {
        const data = await res.json();
        setPregnancy(data.pregnancy);
        setCurrentWeek(data.currentWeek);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !dueDate) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/me/pregnancy", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ dueDate }),
      });
      if (res.ok) {
        await load(token);
        setDueDate("");
      } else {
        alert(t("alertError"));
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEnd() {
    if (!token || !pregnancy) return;
    if (!confirm(t("confirmEnd"))) return;
    const res = await fetch(`/api/me/pregnancy/${pregnancy.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) await load(token);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!pregnancy) {
    return (
      <main className="min-h-screen bg-secondary p-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold text-foreground mb-2 flex items-center gap-2">
            <Baby className="w-6 h-6 text-pink-600" /> {t("title")}
          </h1>
          <p className="text-muted-foreground mb-6">
            {t("introSubtitle")}
          </p>
          <form onSubmit={handleCreate} className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t("dueDateLabel")}
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-white"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t("dueDateHint")}
              </p>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
              {t("startTracking")}
            </button>
          </form>
          <div className="mt-6 bg-white rounded-2xl border border-border shadow-sm p-6">
            <h2 className="text-sm font-bold text-foreground mb-3">{t("articlesTitle")}</h2>
            <ul className="space-y-2">
              {KEY_WEEKS.map((w) => (
                <li key={w}>
                  <Link href={`/grossesse/${w}`} className="text-sm text-primary hover:underline">
                    {t("week", { n: w })} →
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </main>
    );
  }

  const closestWeek = currentWeek
    ? KEY_WEEKS.reduce((a, b) => (Math.abs(b - currentWeek) < Math.abs(a - currentWeek) ? b : a))
    : null;

  return (
    <main className="min-h-screen bg-secondary p-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-2 flex items-center gap-2">
          <Baby className="w-6 h-6 text-pink-600" /> {t("title")}
        </h1>

        <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-2xl border border-pink-200 shadow-sm p-6 mb-6">
          <p className="text-sm text-muted-foreground">{t("currentWeek")}</p>
          <p className="text-5xl font-black text-pink-700 my-2">{currentWeek ?? "—"}</p>
          <p className="text-sm text-foreground">
            {t("dueDateShort")} : <strong>{new Date(pregnancy.dueDate).toLocaleDateString(dateFnsLocaleTag)}</strong>
          </p>
        </div>

        <h2 className="text-lg font-bold text-foreground mb-3">{t("keyMilestones")}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          {KEY_WEEKS.map((w) => {
            const isClosest = w === closestWeek;
            const isPast = currentWeek !== null && w < currentWeek;
            return (
              <Link
                key={w}
                href={`/grossesse/${w}`}
                className={`block bg-white rounded-xl border p-4 shadow-sm hover:shadow-md transition-shadow ${
                  isClosest ? "border-pink-400 ring-2 ring-pink-200" : "border-border"
                }`}
              >
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {t("week", { n: w })}
                </p>
                <p className="font-semibold text-foreground mt-1">
                  {w === 4 && t("milestone.4")}
                  {w === 12 && t("milestone.12")}
                  {w === 20 && t("milestone.20")}
                  {w === 32 && t("milestone.32")}
                  {w === 40 && t("milestone.40")}
                </p>
                {isClosest && (
                  <span className="inline-block mt-2 text-xs font-bold text-pink-700 bg-pink-100 px-2 py-0.5 rounded-full">
                    {t("youAreHere")}
                  </span>
                )}
                {isPast && !isClosest && <span className="text-xs text-muted-foreground">{t("past")}</span>}
              </Link>
            );
          })}
        </div>

        <button
          onClick={handleEnd}
          className="text-sm text-muted-foreground hover:text-red-600 inline-flex items-center gap-1"
        >
          <Trash2 className="w-3.5 h-3.5" />
          {t("endTracking")}
        </button>
      </div>
    </main>
  );
}
