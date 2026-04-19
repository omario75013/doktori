"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Stethoscope, Plus, Loader2 } from "lucide-react";

interface AppointmentType {
  id: string;
  name: string;
  durationMinutes: number;
  fee: number | null;
  color: string;
  isActive: boolean;
}

interface FormErrors {
  name?: string;
  duration?: string;
}

export default function MotifsPage() {
  const [types, setTypes] = useState<AppointmentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [duration, setDuration] = useState("20");
  const [fee, setFee] = useState("");
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function refresh() {
    const res = await fetch("/api/appointment-types");
    const data = await res.json();
    setTypes(data.filter((t: AppointmentType) => t.isActive));
    setLoading(false);
  }

  useEffect(() => { refresh(); }, []);

  function validate(): boolean {
    const errors: FormErrors = {};
    if (!name.trim()) {
      errors.name = "Le nom du motif est requis";
    }
    const dur = Number(duration);
    if (!duration || isNaN(dur) || dur < 5 || dur > 120) {
      errors.duration = "La durée doit être entre 5 et 120 minutes";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      const res = await fetch("/api/appointment-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          durationMinutes: Number(duration),
          fee: fee ? Number(fee) : undefined,
        }),
      });
      if (!res.ok) {
        toast.error("Erreur lors de la création du motif");
        return;
      }
      toast.success(`Motif "${name.trim()}" ajouté avec succès`);
      setName(""); setDuration("20"); setFee("");
      setFormErrors({});
      await refresh();
    } catch {
      toast.error("Une erreur est survenue");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, motifName: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/appointment-types/${id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Erreur lors de la suppression");
        return;
      }
      toast.success(`Motif "${motifName}" supprimé`);
      await refresh();
    } catch {
      toast.error("Une erreur est survenue");
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 text-[#0891B2] text-sm p-6">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Chargement des motifs...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center text-primary">
          <Stethoscope className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Motifs de consultation</h1>
          <p className="text-sm text-gray-500">Définissez les types de consultations avec leurs durées et tarifs.</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-white p-6 shadow-sm max-w-xl">
        <h2 className="font-semibold text-foreground mb-4">Ajouter un motif</h2>
        <form onSubmit={handleCreate} className="space-y-4" noValidate>
          <div>
            <Label htmlFor="name" className="text-foreground font-medium">Nom</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (formErrors.name) setFormErrors((prev) => ({ ...prev, name: undefined }));
              }}
              placeholder="ex: Première consultation"
              className={`h-12 rounded-xl border-border focus-visible:ring-primary mt-1 ${formErrors.name ? "border-red-400 focus-visible:ring-red-400" : ""}`}
            />
            {formErrors.name && (
              <p className="text-xs text-red-600 mt-1">{formErrors.name}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="duration" className="text-foreground font-medium">Durée (minutes)</Label>
              <Input
                id="duration"
                type="number"
                min={5}
                max={120}
                value={duration}
                onChange={(e) => {
                  setDuration(e.target.value);
                  if (formErrors.duration) setFormErrors((prev) => ({ ...prev, duration: undefined }));
                }}
                className={`h-12 rounded-xl border-border focus-visible:ring-primary mt-1 ${formErrors.duration ? "border-red-400 focus-visible:ring-red-400" : ""}`}
              />
              {formErrors.duration && (
                <p className="text-xs text-red-600 mt-1">{formErrors.duration}</p>
              )}
            </div>
            <div>
              <Label htmlFor="fee" className="text-foreground font-medium">Tarif (DT)</Label>
              <Input
                id="fee"
                type="number"
                min={0}
                value={fee}
                onChange={(e) => setFee(e.target.value)}
                placeholder="optionnel"
                className="h-12 rounded-xl border-border focus-visible:ring-primary mt-1"
              />
            </div>
          </div>
          <Button
            type="submit"
            disabled={saving}
            className="bg-primary hover:bg-doktori-teal-dark h-12 rounded-xl font-bold text-white flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Ajout en cours...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Ajouter
              </>
            )}
          </Button>
        </form>
      </div>

      <div className="rounded-2xl border border-border bg-white shadow-sm max-w-xl">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Motifs actifs</h2>
          <span className="text-xs text-primary font-semibold bg-secondary px-2.5 py-1 rounded-full">{types.length}</span>
        </div>
        {types.length === 0 ? (
          <div className="p-10 text-center">
            <div className="h-12 w-12 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-3">
              <Stethoscope className="h-6 w-6 text-primary" />
            </div>
            <p className="text-foreground font-medium mb-1">Aucun motif défini</p>
            <p className="text-sm text-gray-400">Ajoutez votre premier motif de consultation ci-dessus.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {types.map((t) => (
              <div key={t.id} className="p-4 flex items-center justify-between hover:bg-secondary transition-colors">
                <div>
                  <div className="font-medium text-foreground">{t.name}</div>
                  <div className="text-sm text-gray-500">
                    {t.durationMinutes} min
                    {t.fee ? ` · ${t.fee / 1000} DT` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/motifs/${t.id}/questions`}
                    className="text-xs font-semibold text-primary hover:bg-border border border-border rounded-xl px-3 py-1.5 transition-colors"
                  >
                    Questions
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={deletingId === t.id}
                    onClick={() => handleDelete(t.id, t.name)}
                    className="border border-border hover:bg-red-50 hover:text-red-600 hover:border-red-200 rounded-xl text-xs transition-colors"
                  >
                    {deletingId === t.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      "Supprimer"
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
