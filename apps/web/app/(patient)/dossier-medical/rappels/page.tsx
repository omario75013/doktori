"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bell, Plus, Pencil, Trash2, X, ChevronLeft, Pause, Play } from "lucide-react";

interface Reminder {
  id: string;
  diseaseSlug: string | null;
  medicationName: string;
  dosage: string | null;
  frequencyHours: number;
  notificationChannel: string;
  active: boolean;
  pausedUntil: string | null;
  lastSentAt: string | null;
  nextReminderAt: string;
}

interface Disease {
  slug: string;
  nameFr: string;
  nameAr: string | null;
  reminderDefaultFreqHours: number;
}

const FREQUENCY_OPTIONS = [
  { value: 8, label: "Toutes les 8 heures" },
  { value: 12, label: "Toutes les 12 heures" },
  { value: 24, label: "Tous les jours (24h)" },
  { value: 48, label: "Tous les 2 jours (48h)" },
  { value: 168, label: "Toutes les semaines" },
];

export default function ChronicRemindersPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [diseases, setDiseases] = useState<Disease[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Reminder | null>(null);
  const [saving, setSaving] = useState(false);

  // form state
  const [diseaseSlug, setDiseaseSlug] = useState<string>("");
  const [medicationName, setMedicationName] = useState("");
  const [dosage, setDosage] = useState("");
  const [frequencyHours, setFrequencyHours] = useState<number>(24);
  const [channel, setChannel] = useState<"sms" | "email" | "push">("sms");

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
      const res = await fetch("/api/me/chronic-reminders", {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (res.ok) {
        const data = await res.json();
        setReminders(data.reminders ?? []);
        setDiseases(data.diseases ?? []);
      }
    } finally {
      setLoading(false);
    }
  }

  function openAdd() {
    setEditing(null);
    setDiseaseSlug("");
    setMedicationName("");
    setDosage("");
    setFrequencyHours(24);
    setChannel("sms");
    setModalOpen(true);
  }

  function openEdit(r: Reminder) {
    setEditing(r);
    setDiseaseSlug(r.diseaseSlug ?? "");
    setMedicationName(r.medicationName);
    setDosage(r.dosage ?? "");
    setFrequencyHours(r.frequencyHours);
    setChannel(r.notificationChannel as "sms" | "email" | "push");
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    if (!medicationName.trim()) {
      toast.error("Nom du médicament requis");
      return;
    }
    setSaving(true);
    try {
      const body = {
        diseaseSlug: diseaseSlug || undefined,
        medicationName: medicationName.trim(),
        dosage: dosage.trim() || null,
        frequencyHours,
        channel,
      };
      const url = editing
        ? `/api/me/chronic-reminders/${editing.id}`
        : "/api/me/chronic-reminders";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        toast.success(editing ? "Rappel modifié" : "Rappel ajouté");
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
    if (!confirm("Désactiver ce rappel ?")) return;
    const res = await fetch(`/api/me/chronic-reminders/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok || res.status === 204) {
      toast.success("Rappel désactivé");
      await load(token);
    } else {
      toast.error("Erreur lors de la suppression");
    }
  }

  async function togglePause(r: Reminder) {
    if (!token) return;
    const isPaused =
      r.pausedUntil && new Date(r.pausedUntil).getTime() > Date.now();
    const pausedUntil = isPaused
      ? null
      : new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
    const res = await fetch(`/api/me/chronic-reminders/${r.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ pausedUntil }),
    });
    if (res.ok) {
      toast.success(isPaused ? "Rappel réactivé" : "Rappel mis en pause 7 jours");
      await load(token);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-secondary/40 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const active = reminders.filter((r) => r.active);
  const inactive = reminders.filter((r) => !r.active);

  return (
    <div className="min-h-screen bg-secondary/40">
      <div className="bg-gradient-to-br from-primary to-foreground px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <a
            href="/dossier-medical"
            className="inline-flex items-center gap-1 text-white/80 hover:text-white text-sm mb-3"
          >
            <ChevronLeft className="h-4 w-4" /> Retour au dossier
          </a>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/20">
              <Bell className="h-5 w-5 text-white" strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-xl font-black text-white">Rappels traitements</h1>
              <p className="text-white/70 text-xs mt-0.5">
                {active.length} actif{active.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <Button
          onClick={openAdd}
          className="w-full h-12 rounded-xl bg-primary hover:bg-doktori-teal-dark text-white font-bold"
        >
          <Plus className="h-4 w-4 mr-2" /> Ajouter un rappel
        </Button>

        <section>
          <h2 className="text-sm font-bold text-foreground/80 uppercase tracking-wider mb-2">
            Actifs
          </h2>
          {active.length === 0 ? (
            <div className="rounded-2xl border border-border bg-white p-6 text-center text-sm text-muted-foreground">
              Aucun rappel actif. Ajoutez-en un pour ne plus oublier votre traitement.
            </div>
          ) : (
            <ul className="space-y-2">
              {active.map((r) => (
                <ReminderItem
                  key={r.id}
                  r={r}
                  diseases={diseases}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                  onTogglePause={togglePause}
                />
              ))}
            </ul>
          )}
        </section>

        {inactive.length > 0 && (
          <section>
            <h2 className="text-sm font-bold text-foreground/80 uppercase tracking-wider mb-2">
              Désactivés
            </h2>
            <ul className="space-y-2">
              {inactive.map((r) => (
                <ReminderItem
                  key={r.id}
                  r={r}
                  diseases={diseases}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                  onTogglePause={togglePause}
                  archived
                />
              ))}
            </ul>
          </section>
        )}
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white shadow-xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-lg">
                  {editing ? "Modifier le rappel" : "Nouveau rappel"}
                </h2>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="p-1 rounded hover:bg-gray-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">Maladie chronique</Label>
                <Select
                  value={diseaseSlug || "none"}
                  onValueChange={(v) => {
                    if (v === "none") {
                      setDiseaseSlug("");
                    } else {
                      setDiseaseSlug(v);
                      const d = diseases.find((d) => d.slug === v);
                      if (d) setFrequencyHours(d.reminderDefaultFreqHours);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir une maladie (optionnel)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucune (autre)</SelectItem>
                    {diseases.map((d) => (
                      <SelectItem key={d.slug} value={d.slug}>
                        {d.nameFr}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="r-name" className="text-sm font-semibold">
                  Médicament *
                </Label>
                <Input
                  id="r-name"
                  value={medicationName}
                  onChange={(e) => setMedicationName(e.target.value)}
                  maxLength={160}
                  required
                  placeholder="Ex: Glucophage"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="r-dosage" className="text-sm font-semibold">
                  Dosage
                </Label>
                <Input
                  id="r-dosage"
                  value={dosage}
                  onChange={(e) => setDosage(e.target.value)}
                  maxLength={80}
                  placeholder="500mg"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">Fréquence</Label>
                <Select
                  value={String(frequencyHours)}
                  onValueChange={(v) => setFrequencyHours(Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FREQUENCY_OPTIONS.map((f) => (
                      <SelectItem key={f.value} value={String(f.value)}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">Canal de notification</Label>
                <Select
                  value={channel}
                  onValueChange={(v) =>
                    setChannel(v as "sms" | "email" | "push")
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="push">Push (notification)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setModalOpen(false)}
                  className="flex-1"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-primary hover:bg-doktori-teal-dark text-white font-bold"
                >
                  {saving ? "..." : editing ? "Enregistrer" : "Ajouter"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function ReminderItem({
  r,
  diseases,
  onEdit,
  onDelete,
  onTogglePause,
  archived = false,
}: {
  r: Reminder;
  diseases: Disease[];
  onEdit: (r: Reminder) => void;
  onDelete: (id: string) => void;
  onTogglePause: (r: Reminder) => void;
  archived?: boolean;
}) {
  const disease = diseases.find((d) => d.slug === r.diseaseSlug);
  const isPaused =
    r.pausedUntil && new Date(r.pausedUntil).getTime() > Date.now();
  const freqLabel =
    FREQUENCY_OPTIONS.find((f) => f.value === r.frequencyHours)?.label ||
    `Toutes les ${r.frequencyHours}h`;

  return (
    <li
      className={`rounded-2xl border ${
        archived ? "border-border bg-gray-50/50 opacity-70" : "border-border bg-white"
      } shadow-sm p-4`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-foreground">{r.medicationName}</p>
          {r.dosage && (
            <p className="text-xs text-primary font-semibold mt-0.5">{r.dosage}</p>
          )}
          {disease && (
            <p className="text-xs text-muted-foreground mt-1">{disease.nameFr}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            {freqLabel} · {r.notificationChannel.toUpperCase()}
          </p>
          {isPaused && (
            <p className="text-xs text-amber-600 font-semibold mt-1">
              En pause jusqu'au{" "}
              {new Date(r.pausedUntil!).toLocaleDateString("fr-FR")}
            </p>
          )}
        </div>
        <div className="flex gap-1 shrink-0">
          {!archived && (
            <button
              type="button"
              onClick={() => onTogglePause(r)}
              className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary"
              aria-label={isPaused ? "Reprendre" : "Mettre en pause"}
            >
              {isPaused ? (
                <Play className="h-4 w-4" />
              ) : (
                <Pause className="h-4 w-4" />
              )}
            </button>
          )}
          <button
            type="button"
            onClick={() => onEdit(r)}
            className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary"
            aria-label="Modifier"
          >
            <Pencil className="h-4 w-4" />
          </button>
          {!archived && (
            <button
              type="button"
              onClick={() => onDelete(r.id)}
              className="p-2 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600"
              aria-label="Désactiver"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </li>
  );
}
