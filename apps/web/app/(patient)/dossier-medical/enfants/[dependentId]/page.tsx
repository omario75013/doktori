"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Baby, Check, ChevronLeft, Clock, Loader2, Plus, Trash2, X } from "lucide-react";

interface VaccineInfo {
  slug: string;
  nameFr: string;
  ageMinMonths: number;
  ageMaxMonths: number | null;
  descriptionFr: string;
  dosesCount: number;
  isMandatoryTn: boolean;
  displayOrder: number;
}

interface Record {
  id: string;
  vaccineSlug: string;
  doseNumber: number;
  dateReceived: string;
  notes: string | null;
}

interface Dependent {
  id: string;
  name: string;
  dateOfBirth: string | null;
  gender: string | null;
}

function ageInMonths(dob: string, ref: Date = new Date()): number {
  const birth = new Date(dob);
  return (ref.getFullYear() - birth.getFullYear()) * 12 + (ref.getMonth() - birth.getMonth());
}

export default function CarnetEnfantDetailPage({ params }: { params: Promise<{ dependentId: string }> }) {
  const { dependentId } = use(params);
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [dependent, setDependent] = useState<Dependent | null>(null);
  const [schedule, setSchedule] = useState<VaccineInfo[]>([]);
  const [records, setRecords] = useState<Record[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeVaccine, setActiveVaccine] = useState<VaccineInfo | null>(null);
  const [dateReceived, setDateReceived] = useState("");
  const [doseNumber, setDoseNumber] = useState(1);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("doktori_patient_token");
    if (!stored) {
      router.push("/connexion-patient");
      return;
    }
    setToken(stored);
  }, [router]);

  const load = useCallback(async (t: string) => {
    setLoading(true);
    try {
      const [depRes, vaccRes] = await Promise.all([
        fetch("/api/me/dependents", { headers: { Authorization: `Bearer ${t}` } }),
        fetch(`/api/me/dependents/${dependentId}/vaccinations`, {
          headers: { Authorization: `Bearer ${t}` },
        }),
      ]);
      if (depRes.ok) {
        const data = await depRes.json();
        const all: Dependent[] = data.items ?? data.dependents ?? [];
        setDependent(all.find((d) => d.id === dependentId) ?? null);
      }
      if (vaccRes.ok) {
        const data = await vaccRes.json();
        setSchedule(data.schedule ?? []);
        setRecords(data.records ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [dependentId]);

  useEffect(() => {
    if (!token) return;
    void load(token);
  }, [token, load]);

  function openMark(v: VaccineInfo) {
    setActiveVaccine(v);
    setDateReceived(new Date().toISOString().slice(0, 10));
    setDoseNumber(1);
    setNotes("");
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !activeVaccine) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/me/dependents/${dependentId}/vaccinations`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          vaccineSlug: activeVaccine.slug,
          doseNumber,
          dateReceived,
          notes: notes.trim() || null,
        }),
      });
      if (res.ok) {
        setModalOpen(false);
        await load(token);
      } else {
        alert("Erreur lors de l'enregistrement");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(recordId: string) {
    if (!token) return;
    if (!confirm("Supprimer cet enregistrement ?")) return;
    const res = await fetch(`/api/me/dependents/${dependentId}/vaccinations/${recordId}`, {
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

  if (!dependent) {
    return (
      <div className="min-h-screen p-6">
        <p className="text-center text-muted-foreground">Enfant introuvable.</p>
      </div>
    );
  }

  const childMonths = dependent.dateOfBirth ? ageInMonths(dependent.dateOfBirth) : null;

  return (
    <main className="min-h-screen bg-secondary p-4">
      <div className="max-w-2xl mx-auto">
        <Link href="/dossier-medical/enfants" className="inline-flex items-center gap-1 text-sm text-primary mb-3">
          <ChevronLeft className="w-4 h-4" /> Retour
        </Link>

        <div className="bg-white rounded-2xl border border-border shadow-sm p-5 mb-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-3xl">
            {dependent.gender === "M" ? "👦" : dependent.gender === "F" ? "👧" : "🧒"}
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">{dependent.name}</h1>
            {childMonths !== null && (
              <p className="text-sm text-muted-foreground">
                {childMonths < 24 ? `${childMonths} mois` : `${Math.floor(childMonths / 12)} an(s)`}
              </p>
            )}
          </div>
        </div>

        <h2 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
          <Baby className="w-5 h-5" /> Calendrier vaccinal officiel TN
        </h2>

        <div className="space-y-2">
          {schedule.map((vacc) => {
            const matching = records.filter((r) => r.vaccineSlug === vacc.slug);
            const received = matching.length > 0;
            const isCurrent =
              !received &&
              childMonths !== null &&
              childMonths >= vacc.ageMinMonths &&
              (vacc.ageMaxMonths === null || childMonths <= vacc.ageMaxMonths);
            const isUpcoming =
              !received && childMonths !== null && childMonths < vacc.ageMinMonths;

            return (
              <div
                key={vacc.slug}
                className={`bg-white rounded-xl border shadow-sm p-4 ${
                  received ? "border-emerald-300 bg-emerald-50/30" : isCurrent ? "border-amber-300" : "border-border"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-foreground text-sm">{vacc.nameFr}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {vacc.ageMinMonths === vacc.ageMaxMonths
                        ? `À ${vacc.ageMinMonths} mois`
                        : `${vacc.ageMinMonths}-${vacc.ageMaxMonths ?? "?"} mois`}
                    </p>
                    {matching.map((r) => (
                      <div key={r.id} className="mt-2 inline-flex items-center gap-2 text-xs bg-emerald-100 text-emerald-800 rounded-full px-2.5 py-1">
                        <Check className="w-3 h-3" />
                        Reçu le {new Date(r.dateReceived).toLocaleDateString("fr-FR")}
                        {vacc.dosesCount > 1 && <span>· dose {r.doseNumber}</span>}
                        <button
                          onClick={() => handleDelete(r.id)}
                          className="ml-1 hover:text-red-600"
                          aria-label="Supprimer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="shrink-0">
                    {received && matching.length >= vacc.dosesCount ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                        <Check className="w-3.5 h-3.5" /> Complet
                      </span>
                    ) : isCurrent ? (
                      <button
                        onClick={() => openMark(vacc)}
                        className="bg-amber-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-amber-600 inline-flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> À jour
                      </button>
                    ) : isUpcoming ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500">
                        <Clock className="w-3.5 h-3.5" /> À venir
                      </span>
                    ) : (
                      <button
                        onClick={() => openMark(vacc)}
                        className="bg-primary text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:opacity-90 inline-flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Marquer
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {schedule.length === 0 && (
            <p className="text-center text-muted-foreground p-8">
              Aucun vaccin dans le calendrier. (Le seed n&apos;est peut-être pas encore appliqué.)
            </p>
          )}
        </div>

        {modalOpen && activeVaccine && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
            <form onSubmit={handleSave} className="bg-white rounded-2xl shadow-xl max-w-md w-full p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">{activeVaccine.nameFr}</h3>
                <button type="button" onClick={() => setModalOpen(false)}>
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Date d&apos;administration</label>
                <input
                  type="date"
                  required
                  value={dateReceived}
                  onChange={(e) => setDateReceived(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border"
                />
              </div>
              {activeVaccine.dosesCount > 1 && (
                <div>
                  <label className="block text-sm font-medium mb-1">Numéro de dose</label>
                  <input
                    type="number"
                    min={1}
                    max={activeVaccine.dosesCount}
                    value={doseNumber}
                    onChange={(e) => setDoseNumber(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 rounded-lg border border-border"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">Notes (optionnel)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-border"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-primary text-white px-5 py-2 rounded-lg text-sm font-bold disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
