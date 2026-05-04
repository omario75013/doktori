"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Pill, Plus, Pencil, Trash2, X, ChevronLeft, ChevronDown, History } from "lucide-react";

interface Medication {
  id: string;
  medicationName: string;
  dosage: string | null;
  frequency: string | null;
  startedAt: string | null;
  endedAt: string | null;
  notes: string | null;
  createdAt: string;
}

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
        medicationName: medicationName.trim(),
        dosage: dosage.trim() || null,
        frequency: frequency.trim() || null,
        startedAt: startedAt || null,
        endedAt: endedAt || null,
        notes: notes.trim() || null,
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
      <div className="min-h-screen bg-secondary/40 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const current = items.filter((m) => !m.endedAt);
  const history = items.filter((m) => m.endedAt);

  return (
    <div className="min-h-screen bg-secondary/40">
      <div className="bg-gradient-to-br from-primary to-foreground px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <a href="/dossier-medical" className="inline-flex items-center gap-1 text-white/80 hover:text-white text-sm mb-3">
            <ChevronLeft className="h-4 w-4" /> Retour au dossier
          </a>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/20">
              <Pill className="h-5 w-5 text-white" strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-xl font-black text-white">Traitements</h1>
              <p className="text-white/70 text-xs mt-0.5">{current.length} en cours · {history.length} archivé{history.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <Button onClick={openAdd} className="w-full h-12 rounded-xl bg-primary hover:bg-doktori-teal-dark text-white font-bold">
          <Plus className="h-4 w-4 mr-2" /> Ajouter un traitement
        </Button>

        <section>
          <h2 className="text-sm font-bold text-foreground/80 uppercase tracking-wider mb-2">En cours</h2>
          {current.length === 0 ? (
            <div className="rounded-2xl border border-border bg-white p-6 text-center text-sm text-muted-foreground">
              Aucun traitement en cours
            </div>
          ) : (
            <ul className="space-y-2">
              {current.map((m) => <MedItem key={m.id} m={m} onEdit={openEdit} onDelete={handleDelete} />)}
            </ul>
          )}
        </section>

        {history.length > 0 && (
          <section>
            <button
              type="button"
              onClick={() => setHistoryOpen((v) => !v)}
              className="w-full flex items-center justify-between text-sm font-bold text-foreground/80 uppercase tracking-wider mb-2 hover:text-primary"
            >
              <span className="flex items-center gap-2">
                <History className="h-4 w-4" />
                Historique ({history.length})
              </span>
              <ChevronDown className={`h-4 w-4 transition-transform ${historyOpen ? "rotate-180" : ""}`} />
            </button>
            {historyOpen && (
              <ul className="space-y-2">
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
                  <Input id="m-end" type="date" value={endedAt} onChange={(e) => setEndedAt(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="m-notes" className="text-sm font-semibold">Notes</Label>
                <Textarea id="m-notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} rows={2} />
              </div>
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
