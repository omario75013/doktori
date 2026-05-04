"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Users, Plus, Trash2, X, Pencil } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Dependent {
  id: string;
  name: string;
  dateOfBirth: string | null;
  gender: string | null;
  relation: string | null;
  createdAt: string;
}

const RELATIONS = [
  { value: "child", label: "Enfant" },
  { value: "parent", label: "Parent" },
  { value: "spouse", label: "Conjoint(e)" },
  { value: "sibling", label: "Frère / sœur" },
  { value: "other", label: "Autre" },
];

export default function MaFamillePage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [items, setItems] = useState<Dependent[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Dependent | "new" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Dependent | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("doktori_patient_token");
    if (!stored) {
      router.replace("/mes-rdv");
      return;
    }
    setToken(stored);
  }, [router]);

  const load = useCallback(
    async (t: string) => {
      setLoading(true);
      try {
        const res = await fetch("/api/me/dependents", {
          headers: { Authorization: `Bearer ${t}` },
          cache: "no-store",
        });
        if (res.status === 401) {
          localStorage.removeItem("doktori_patient_token");
          router.replace("/mes-rdv");
          return;
        }
        const data = await res.json();
        setItems(Array.isArray(data.items) ? data.items : []);
      } finally {
        setLoading(false);
      }
    },
    [router],
  );

  useEffect(() => {
    if (token) void load(token);
  }, [token, load]);

  async function deleteOne(id: string) {
    if (!token) return;
    const res = await fetch(`/api/me/dependents/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setItems((p) => p.filter((d) => d.id !== id));
      toast.success("Proche supprimé");
    } else {
      toast.error("Erreur");
    }
    setConfirmDelete(null);
  }

  return (
    <div className="min-h-screen bg-secondary/40 dark:bg-gray-900">
      <div className="bg-gradient-to-br from-primary to-foreground px-4 py-8">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/20">
              <Users className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white">Ma famille</h1>
              <p className="text-white/70 text-xs mt-0.5">
                {items.length} proche{items.length > 1 ? "s" : ""} enregistré
                {items.length > 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <button
            onClick={() => setEditing("new")}
            className="text-xs font-bold text-white bg-white/15 hover:bg-white/25 rounded-lg px-3 py-2 transition-colors flex items-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            Ajouter
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-border shadow-sm p-10 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
              <Users className="h-7 w-7 text-primary/40" />
            </div>
            <p className="font-semibold text-foreground mb-1">Aucun proche enregistré</p>
            <p className="text-sm text-foreground/50 mb-4">
              Ajoutez vos enfants, parents ou conjoint(e) pour prendre rendez-vous en leur nom.
            </p>
            <button
              onClick={() => setEditing("new")}
              className="inline-flex items-center gap-2 bg-primary hover:bg-doktori-teal-dark text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors"
            >
              <Plus className="h-4 w-4" />
              Ajouter un proche
            </button>
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((d) => {
              const rel = RELATIONS.find((r) => r.value === d.relation);
              return (
                <li
                  key={d.id}
                  className="bg-white dark:bg-gray-800 rounded-2xl border border-border shadow-sm p-4 flex items-center gap-3"
                >
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center shrink-0 text-lg font-bold text-blue-700">
                    {d.name
                      .split(" ")
                      .map((p) => p[0])
                      .filter(Boolean)
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-foreground truncate">{d.name}</p>
                    <div className="flex items-center gap-2 text-xs text-foreground/60 mt-0.5 flex-wrap">
                      {rel && <span className="font-semibold text-blue-700">{rel.label}</span>}
                      {d.dateOfBirth && (
                        <span>· Né(e) le {format(new Date(d.dateOfBirth), "d MMM yyyy", { locale: fr })}</span>
                      )}
                      {d.gender && <span>· {d.gender === "M" ? "Homme" : "Femme"}</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => setEditing(d)}
                    aria-label="Modifier"
                    className="inline-flex items-center justify-center w-9 h-9 rounded-full text-foreground/60 hover:bg-secondary transition-colors"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setConfirmDelete(d)}
                    aria-label="Supprimer"
                    className="inline-flex items-center justify-center w-9 h-9 rounded-full text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {editing && token && (
        <DependentFormModal
          token={token}
          existing={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            if (token) void load(token);
          }}
        />
      )}

      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
          onClick={() => setConfirmDelete(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-2xl border border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-red-50 mx-auto mb-4">
              <Trash2 className="h-6 w-6 text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-foreground text-center">Supprimer {confirmDelete.name} ?</h3>
            <p className="mt-2 text-sm text-foreground/60 text-center">
              Cette action est irréversible. Les rendez-vous passés ne seront pas affectés.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => deleteOne(confirmDelete.id)}
                className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700 transition-colors"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DependentFormModal({
  token,
  existing,
  onClose,
  onSaved,
}: {
  token: string;
  existing: Dependent | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const initialParts = existing?.name.split(/\s+/) ?? [];
  const [firstName, setFirstName] = useState(initialParts[0] ?? "");
  const [lastName, setLastName] = useState(initialParts.slice(1).join(" "));
  const [dob, setDob] = useState(existing?.dateOfBirth ?? "");
  const [gender, setGender] = useState(existing?.gender ?? "");
  const [relationship, setRelationship] = useState(existing?.relation ?? "");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      dob: dob || null,
      gender: gender || null,
      relationship: relationship || null,
    };
    const url = existing ? `/api/me/dependents/${existing.id}` : "/api/me/dependents";
    const method = existing ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (res.ok) {
      toast.success(existing ? "Proche mis à jour" : "Proche ajouté");
      onSaved();
    } else {
      toast.error("Erreur, vérifiez les champs");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full sm:max-w-md bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-2xl shadow-2xl border border-border max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h3 className="font-bold text-foreground">{existing ? "Modifier" : "Ajouter un proche"}</h3>
          <button onClick={onClose} aria-label="Fermer" className="p-1 rounded-full hover:bg-secondary">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="firstName" className="text-xs font-semibold">Prénom *</Label>
              <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName" className="text-xs font-semibold">Nom *</Label>
              <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dob" className="text-xs font-semibold">Date de naissance</Label>
            <Input id="dob" type="date" value={dob ?? ""} onChange={(e) => setDob(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="gender" className="text-xs font-semibold">Sexe</Label>
              <select
                id="gender"
                value={gender ?? ""}
                onChange={(e) => setGender(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">—</option>
                <option value="M">Homme</option>
                <option value="F">Femme</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="relationship" className="text-xs font-semibold">Relation</Label>
              <select
                id="relationship"
                value={relationship ?? ""}
                onChange={(e) => setRelationship(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">—</option>
                {RELATIONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
          </div>
          <Button type="submit" disabled={saving} className="w-full h-11 rounded-xl bg-primary hover:bg-doktori-teal-dark text-white font-bold">
            {saving ? "Enregistrement..." : existing ? "Mettre à jour" : "Ajouter"}
          </Button>
        </form>
      </div>
    </div>
  );
}
