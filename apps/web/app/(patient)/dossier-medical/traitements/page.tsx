"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Pill, Plus, Pencil, Trash2, X, ChevronLeft, ChevronDown, History, Bell } from "lucide-react";

interface Medication {
  id: string;
  medicationName: string;
  dosage: string | null;
  frequency: string | null;
  startedAt: string | null;
  endedAt: string | null;
  notes: string | null;
  reminderEnabled?: boolean;
  reminderTimes?: string[];
  createdAt: string;
}

const PRESET_TIMES: Array<{ key: string; label: string; time: string }> = [
  { key: "morning", label: "Matin", time: "08:00" },
  { key: "midday", label: "Midi", time: "13:00" },
  { key: "evening", label: "Soir", time: "20:00" },
];

export default function TraitementsPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [items, setItems] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Medication | null>(null);
  const [saving, setSaving] = useState(false);

  // form
  const [medicationName, setMedicationName] = useState("");
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState("");
  const [startedAt, setStartedAt] = useState("");
  const [endedAt, setEndedAt] = useState("");
  const [notes, setNotes] = useState("");
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTimes, setReminderTimes] = useState<string[]>([]);
  const [modalTab, setModalTab] = useState<"info" | "reminder">("info");

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
      const res = await fetch("/api/me/medications", { headers: { Authorization: `Bearer ${t}` } });
      if (res.ok) {
        const data = await res.json();
        setItems(data.medications ?? []);
      }
    } finally {
      setLoading(false);
    }
  }

  function openAdd() {
    setEditing(null);
    setMedicationName("");
    setDosage("");
    setFrequency("");
    setStartedAt("");
    setEndedAt("");
    setNotes("");
    setReminderEnabled(false);
    setReminderTimes([]);
    setModalTab("info");
    setModalOpen(true);
  }

  function openEdit(m: Medication) {
    setEditing(m);
    setMedicationName(m.medicationName);
    setDosage(m.dosage ?? "");
    setFrequency(m.frequency ?? "");
    setStartedAt(m.startedAt ?? "");
    setEndedAt(m.endedAt ?? "");
    setNotes(m.notes ?? "");
    setReminderEnabled(!!m.reminderEnabled);
    setReminderTimes(Array.isArray(m.reminderTimes) ? m.reminderTimes : []);
    setModalTab("info");
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    if (!medicationName.trim()) {
      toast.error("Nom du médicament requis");
      return;
    }
    if (startedAt && endedAt && endedAt < startedAt) {
      toast.error("La date de fin doit être supérieure ou égale à la date de début");
      return;
    }
    setSaving(true);
    try {
      const body = {
        medicationName: medicationName.trim(),
        dosage: dosage.trim() || null,
        frequency: frequency.trim() || null,
        startedAt: startedAt || null,
        endedAt: endedAt || null,
        notes: notes.trim() || null,
        reminderEnabled,
        reminderTimes: reminderEnabled ? reminderTimes : [],
      };
      const url = editing ? `/api/me/medications/${editing.id}` : "/api/me/medications";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        toast.success(editing ? "Traitement modifié" : "Traitement ajouté");
        setModalOpen(false);
        await load(token);
      } else {
        toast.error("Erreur lors de l'enregistrement");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!token) return;
    if (!confirm("Supprimer ce traitement ?")) return;
    const res = await fetch(`/api/me/medications/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok || res.status === 204) {
      toast.success("Traitement supprimé");
      await load(token);
    } else {
      toast.error("Erreur lors de la suppression");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // "En cours" = no end date set, OR end date is today/in the future
  // "Historique" = end date is set AND is strictly in the past
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  function isPastEnd(end: string | null) {
    if (!end) return false;
    const d = new Date(end);
    d.setHours(0, 0, 0, 0);
    return d.getTime() < today.getTime();
  }
  const current = items.filter((m) => !isPastEnd(m.endedAt));
  const history = items.filter((m) => isPastEnd(m.endedAt));

  return (
    <>
      {/* Page header */}
      <div className="mb-6">
        <a
          href="/dossier-medical"
          className="inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--ink-500)] hover:text-[color:var(--primary-600)] mb-2"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Retour au dossier
        </a>
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="ds-eyebrow">DOSSIER MÉDICAL</div>
            <h1 className="ds-page-title">Traitements</h1>
            <p className="ds-page-sub">
              {current.length} en cours · {history.length} archivé{history.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button onClick={openAdd} className="ds-btn ds-btn-primary">
            <Plus className="h-4 w-4" /> Ajouter un traitement
          </button>
        </div>
      </div>

      <div className="grid gap-4">
        <section className="ds-card-patient p-5">
          <div className="ds-eyebrow mb-3 flex items-center gap-2">
            <Pill className="h-3.5 w-3.5" /> EN COURS
          </div>
          {current.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[color:var(--line-cool)] bg-[color:var(--surface-2)] p-8 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[color:var(--primary-50)] mb-3">
                <Pill className="h-5 w-5 text-[color:var(--primary-600)]" />
              </div>
              <p className="text-sm font-semibold text-[color:var(--ink-700)]">Aucun traitement en cours</p>
              <p className="text-xs text-[color:var(--ink-500)] mt-1">
                Ajoutez vos médicaments pour en garder une trace.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {current.map((m) => <MedItem key={m.id} m={m} onEdit={openEdit} onDelete={handleDelete} />)}
            </ul>
          )}
        </section>

        {history.length > 0 && (
          <section className="ds-card-patient p-5">
            <button
              type="button"
              onClick={() => setHistoryOpen((v) => !v)}
              className="w-full flex items-center justify-between hover:opacity-80 transition-opacity"
            >
              <span className="ds-eyebrow flex items-center gap-2">
                <History className="h-3.5 w-3.5" />
                HISTORIQUE ({history.length})
              </span>
              <ChevronDown
                className={`h-4 w-4 text-[color:var(--ink-500)] transition-transform ${historyOpen ? "rotate-180" : ""}`}
              />
            </button>
            {historyOpen && (
              <ul className="space-y-2 mt-3">
                {history.map((m) => <MedItem key={m.id} m={m} onEdit={openEdit} onDelete={handleDelete} archived />)}
              </ul>
            )}
          </section>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4" onClick={() => setModalOpen(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-lg">{editing ? "Modifier le traitement" : "Ajouter un traitement"}</h2>
                <button type="button" onClick={() => setModalOpen(false)} className="p-1 rounded hover:bg-gray-100">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Tabs: Infos / Rappels */}
              <div className="flex gap-1 rounded-xl p-1" style={{ background: "var(--surface-2)" }}>
                <button
                  type="button"
                  onClick={() => setModalTab("info")}
                  className={`flex-1 px-3 py-2 rounded-lg text-[13px] font-semibold ${
                    modalTab === "info"
                      ? "bg-white shadow-sm"
                      : ""
                  }`}
                  style={{ color: modalTab === "info" ? "var(--ink-900)" : "var(--ink-500)" }}
                >
                  Informations
                </button>
                <button
                  type="button"
                  onClick={() => setModalTab("reminder")}
                  className={`flex-1 px-3 py-2 rounded-lg text-[13px] font-semibold flex items-center justify-center gap-1.5 ${
                    modalTab === "reminder"
                      ? "bg-white shadow-sm"
                      : ""
                  }`}
                  style={{ color: modalTab === "reminder" ? "var(--ink-900)" : "var(--ink-500)" }}
                >
                  <Bell className="w-3.5 h-3.5" />
                  Rappels
                  {reminderEnabled && reminderTimes.length > 0 && (
                    <span
                      className="px-1.5 rounded-full text-[10px] font-bold"
                      style={{
                        background: "var(--primary-100)",
                        color: "var(--primary-700)",
                      }}
                    >
                      {reminderTimes.length}
                    </span>
                  )}
                </button>
              </div>
              {modalTab === "info" && (
              <>
              <div className="space-y-1.5">
                <Label htmlFor="m-name" className="text-sm font-semibold">Médicament *</Label>
                <Input id="m-name" value={medicationName} onChange={(e) => setMedicationName(e.target.value)} maxLength={160} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="m-dosage" className="text-sm font-semibold">Dosage</Label>
                  <Input id="m-dosage" value={dosage} onChange={(e) => setDosage(e.target.value)} maxLength={80} placeholder="500mg" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="m-freq" className="text-sm font-semibold">Fréquence</Label>
                  <Input id="m-freq" value={frequency} onChange={(e) => setFrequency(e.target.value)} maxLength={80} placeholder="2x/jour" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="m-start" className="text-sm font-semibold">Début</Label>
                  <Input id="m-start" type="date" value={startedAt} onChange={(e) => setStartedAt(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="m-end" className="text-sm font-semibold">Fin (si arrêté)</Label>
                  <Input
                    id="m-end"
                    type="date"
                    value={endedAt}
                    min={startedAt || undefined}
                    onChange={(e) => setEndedAt(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="m-notes" className="text-sm font-semibold">Notes</Label>
                <Textarea id="m-notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} rows={2} />
              </div>
              </>
              )}

              {modalTab === "reminder" && (
                <ReminderTab
                  enabled={reminderEnabled}
                  onEnabledChange={setReminderEnabled}
                  times={reminderTimes}
                  onTimesChange={setReminderTimes}
                />
              )}

              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setModalOpen(false)} className="flex-1">Annuler</Button>
                <Button type="submit" disabled={saving} className="flex-1 bg-primary hover:bg-doktori-teal-dark text-white font-bold">
                  {saving ? "..." : editing ? "Enregistrer" : "Ajouter"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

/* ───────── Reminder tab (modal) ───────── */
function ReminderTab({
  enabled,
  onEnabledChange,
  times,
  onTimesChange,
}: {
  enabled: boolean;
  onEnabledChange: (v: boolean) => void;
  times: string[];
  onTimesChange: (v: string[]) => void;
}) {
  function togglePreset(time: string) {
    if (times.includes(time)) onTimesChange(times.filter((t) => t !== time));
    else onTimesChange([...times, time].sort());
  }
  function addCustom() {
    onTimesChange([...times, "12:00"].sort());
  }
  function removeAt(idx: number) {
    onTimesChange(times.filter((_, i) => i !== idx));
  }
  function updateAt(idx: number, value: string) {
    const next = [...times];
    next[idx] = value;
    onTimesChange(next);
  }

  return (
    <div className="space-y-4">
      <div
        className="flex items-center justify-between gap-3 rounded-xl p-3"
        style={{ background: "var(--surface-2)" }}
      >
        <div>
          <div className="text-[13.5px] font-semibold">
            Activer un rappel pour ce traitement
          </div>
          <div className="text-[12px]" style={{ color: "var(--ink-500)" }}>
            Vous recevrez une notification aux horaires choisis.
          </div>
        </div>
        <button
          type="button"
          onClick={() => onEnabledChange(!enabled)}
          aria-pressed={enabled}
          className="relative shrink-0"
          style={{
            width: 42,
            height: 24,
            borderRadius: 999,
            background: enabled ? "var(--primary-500)" : "var(--line-strong)",
            transition: "background .15s",
          }}
        >
          <span
            className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow"
            style={{ left: enabled ? 19 : 3, transition: "left .15s" }}
          />
        </button>
      </div>

      {enabled && (
        <>
          <div>
            <Label className="text-sm font-semibold">Moments de la journée</Label>
            <div className="flex gap-2 mt-2 flex-wrap">
              {PRESET_TIMES.map((p) => {
                const on = times.includes(p.time);
                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => togglePreset(p.time)}
                    className={`px-3 py-1.5 rounded-full text-[12.5px] font-semibold transition ${
                      on
                        ? "bg-[color:var(--primary-600)] text-white"
                        : "border border-[color:var(--line-cool)] bg-white text-[color:var(--ink-700)] hover:border-[color:var(--primary-300)]"
                    }`}
                  >
                    {p.label} ({p.time})
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-semibold">Horaires programmés</Label>
              <button
                type="button"
                onClick={addCustom}
                className="ds-btn ds-btn-soft ds-btn-sm"
              >
                <Plus className="w-3.5 h-3.5" /> Ajouter une heure
              </button>
            </div>
            {times.length === 0 ? (
              <p
                className="text-[12px] rounded-lg p-3"
                style={{ background: "var(--surface-2)", color: "var(--ink-500)" }}
              >
                Aucun horaire programmé. Choisissez un moment ou ajoutez une heure libre.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {times.map((t, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={t}
                      onChange={(e) => updateAt(i, e.target.value)}
                      className="flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => removeAt(i)}
                      aria-label="Supprimer"
                      className="p-2 rounded-lg hover:bg-red-50"
                      style={{ color: "#E11D48" }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-[11.5px] mt-2" style={{ color: "var(--ink-500)" }}>
              Les rappels suivent les canaux configurés dans Paramètres &gt; Notifications.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

function MedItem({ m, onEdit, onDelete, archived = false }: { m: Medication; onEdit: (m: Medication) => void; onDelete: (id: string) => void; archived?: boolean }) {
  return (
    <li className={`rounded-2xl border ${archived ? "border-border bg-gray-50/50 opacity-80" : "border-border bg-white"} shadow-sm p-4`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-foreground">{m.medicationName}</p>
          {(m.dosage || m.frequency) && (
            <p className="text-xs text-primary font-semibold mt-0.5">
              {[m.dosage, m.frequency].filter(Boolean).join(" · ")}
            </p>
          )}
          {(m.startedAt || m.endedAt) && (
            <p className="text-xs text-muted-foreground mt-1">
              {m.startedAt && `Depuis ${new Date(m.startedAt).toLocaleDateString("fr-FR")}`}
              {m.startedAt && m.endedAt && " — "}
              {m.endedAt && `Arrêté ${new Date(m.endedAt).toLocaleDateString("fr-FR")}`}
            </p>
          )}
          {m.notes && <p className="text-xs text-foreground/70 mt-2 whitespace-pre-line">{m.notes}</p>}
        </div>
        <div className="flex gap-1 shrink-0">
          <button type="button" onClick={() => onEdit(m)} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary" aria-label="Modifier">
            <Pencil className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => onDelete(m.id)} className="p-2 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600" aria-label="Supprimer">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </li>
  );
}
