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
    const stored = sessionStorage.getItem("doktori_patient_session");
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
          sessionStorage.removeItem("doktori_patient_session");
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
    <>
      {/* Page header */}
      <div className="mb-6 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="ds-eyebrow">MA FAMILLE</div>
          <h1 className="ds-page-title">Mes proches</h1>
          <p className="ds-page-sub">
            {items.length} proche{items.length > 1 ? "s" : ""} enregistré
            {items.length > 1 ? "s" : ""}
          </p>
        </div>
        <button onClick={() => setEditing("new")} className="ds-btn ds-btn-primary">
          <Plus className="h-4 w-4" /> Ajouter un proche
        </button>
      </div>

      <div className="ds-card-patient p-5">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[color:var(--line-cool)] bg-[color:var(--surface-2)] p-10 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[color:var(--primary-50)] mb-4">
              <Users className="h-7 w-7 text-[color:var(--primary-600)]" />
            </div>
            <p className="font-bold text-[color:var(--ink-900)] mb-1">Aucun proche enregistré</p>
            <p className="text-sm text-[color:var(--ink-500)] mb-4 max-w-xs mx-auto">
              Ajoutez vos enfants, parents ou conjoint(e) pour prendre rendez-vous en leur nom.
            </p>
            <button onClick={() => setEditing("new")} className="ds-btn ds-btn-primary">
              <Plus className="h-4 w-4" /> Ajouter un proche
            </button>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {items.map((d) => {
              const rel = RELATIONS.find((r) => r.value === d.relation);
              return (
                <li
                  key={d.id}
                  className="flex items-center gap-3 rounded-xl border border-[color:var(--line-cool)] bg-white p-3.5 hover:border-[color:var(--primary-300)] transition-colors"
                >
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 text-base font-bold"
                    style={{ background: "var(--primary-50)", color: "var(--primary-700)" }}
                  >
                    {d.name
                      .split(" ")
                      .map((p) => p[0])
                      .filter(Boolean)
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[color:var(--ink-900)] truncate">{d.name}</p>
                    <div className="flex items-center gap-1.5 text-xs text-[color:var(--ink-500)] mt-0.5 flex-wrap">
                      {rel && (
                        <span className="ds-chip ds-chip-primary" style={{ padding: "2px 8px", fontSize: 11 }}>
                          {rel.label}
                        </span>
                      )}
                      {d.dateOfBirth && (
                        <span>· Né(e) le {format(new Date(d.dateOfBirth), "d MMM yyyy", { locale: fr })}</span>
                      )}
                      {d.gender && <span>· {d.gender === "M" ? "Homme" : "Femme"}</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => setEditing(d)}
                    aria-label="Modifier"
                    className="inline-flex items-center justify-center w-9 h-9 rounded-full text-[color:var(--ink-500)] hover:bg-[color:var(--surface-2)] hover:text-[color:var(--primary-600)] transition-colors"
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
    </>
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
