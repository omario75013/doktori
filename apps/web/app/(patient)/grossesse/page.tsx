"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pregnancy, setPregnancy] = useState<Pregnancy | null>(null);
  const [currentWeek, setCurrentWeek] = useState<number | null>(null);
  const [dueDate, setDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("doktori_patient_token");
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
        alert("Erreur");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEnd() {
    if (!token || !pregnancy) return;
    if (!confirm("Mettre fin au suivi de grossesse ?")) return;
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
            <Baby className="w-6 h-6 text-pink-600" /> Suivi de grossesse
          </h1>
          <p className="text-muted-foreground mb-6">
            Suivez votre grossesse semaine par semaine. Renseignez votre date prévue d&apos;accouchement.
          </p>
          <form onSubmit={handleCreate} className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Date prévue d&apos;accouchement
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-white"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Calculée généralement par votre médecin lors de la première consultation.
              </p>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
              Démarrer le suivi
            </button>
          </form>
          <div className="mt-6 bg-white rounded-2xl border border-border shadow-sm p-6">
            <h2 className="text-sm font-bold text-foreground mb-3">Articles à découvrir</h2>
            <ul className="space-y-2">
              {KEY_WEEKS.map((w) => (
                <li key={w}>
                  <Link href={`/grossesse/${w}`} className="text-sm text-primary hover:underline">
                    Semaine {w} →
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
          <Baby className="w-6 h-6 text-pink-600" /> Suivi de grossesse
        </h1>

        <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-2xl border border-pink-200 shadow-sm p-6 mb-6">
          <p className="text-sm text-muted-foreground">Semaine actuelle</p>
          <p className="text-5xl font-black text-pink-700 my-2">{currentWeek ?? "—"}</p>
          <p className="text-sm text-foreground">
            Date prévue : <strong>{new Date(pregnancy.dueDate).toLocaleDateString("fr-FR")}</strong>
          </p>
        </div>

        <h2 className="text-lg font-bold text-foreground mb-3">Étapes clés</h2>
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
                  Semaine {w}
                </p>
                <p className="font-semibold text-foreground mt-1">
                  {w === 4 && "Le test"}
                  {w === 12 && "Premier trimestre"}
                  {w === 20 && "Échographie morphologique"}
                  {w === 32 && "Préparation"}
                  {w === 40 && "Terme"}
                </p>
                {isClosest && (
                  <span className="inline-block mt-2 text-xs font-bold text-pink-700 bg-pink-100 px-2 py-0.5 rounded-full">
                    Vous y êtes
                  </span>
                )}
                {isPast && !isClosest && <span className="text-xs text-muted-foreground">Passée</span>}
              </Link>
            );
          })}
        </div>

        <button
          onClick={handleEnd}
          className="text-sm text-muted-foreground hover:text-red-600 inline-flex items-center gap-1"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Terminer le suivi
        </button>
      </div>
    </main>
  );
}
