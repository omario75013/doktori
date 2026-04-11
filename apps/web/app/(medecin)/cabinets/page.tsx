"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Phone, Plus, Pencil, Trash2, Star, ArrowLeft, Check, X } from "lucide-react";
import Link from "next/link";

interface Practice {
  id: string;
  name: string;
  address: string;
  city: string;
  phone: string | null;
  latitude: string | null;
  longitude: string | null;
  isPrimary: boolean;
  isActive: boolean;
  createdAt: string;
}

interface PracticeForm {
  name: string;
  address: string;
  city: string;
  phone: string;
  isPrimary: boolean;
}

const emptyForm: PracticeForm = {
  name: "",
  address: "",
  city: "",
  phone: "",
  isPrimary: false,
};

export default function CabinetsPage() {
  const [practices, setPractices] = useState<Practice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<PracticeForm>(emptyForm);
  const [addError, setAddError] = useState<string | null>(null);
  const [addSubmitting, setAddSubmitting] = useState(false);

  // Edit form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<PracticeForm>(emptyForm);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function loadPractices() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/doctor/practices");
      if (!res.ok) throw new Error("Erreur de chargement");
      const data = await res.json() as Practice[];
      setPractices(data);
    } catch {
      setError("Impossible de charger vos cabinets.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPractices();
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddSubmitting(true);
    setAddError(null);
    try {
      const res = await fetch("/api/doctor/practices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(typeof data.error === "string" ? data.error : "Erreur");
      }
      setAddForm(emptyForm);
      setShowAddForm(false);
      await loadPractices();
    } catch (err: unknown) {
      setAddError(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setAddSubmitting(false);
    }
  }

  function startEdit(p: Practice) {
    setEditingId(p.id);
    setEditForm({
      name: p.name,
      address: p.address,
      city: p.city,
      phone: p.phone ?? "",
      isPrimary: p.isPrimary,
    });
    setEditError(null);
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setEditSubmitting(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/doctor/practices/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editForm,
          phone: editForm.phone || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(typeof data.error === "string" ? data.error : "Erreur");
      }
      setEditingId(null);
      await loadPractices();
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setEditSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/doctor/practices/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(typeof data.error === "string" ? data.error : "Erreur");
      }
      await loadPractices();
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleSetPrimary(id: string) {
    try {
      await fetch(`/api/doctor/practices/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPrimary: true }),
      });
      await loadPractices();
    } catch {
      // ignore
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/profil"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-[#0891B2] hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Profil
          </Link>
          <span className="text-[#134E4A]/30">/</span>
          <h1 className="text-xl font-heading font-black text-[#134E4A]">
            Mes cabinets
          </h1>
        </div>
        <Button
          onClick={() => {
            setShowAddForm((v) => !v);
            setAddError(null);
          }}
          className="bg-[#0891B2] hover:bg-[#0E7490] gap-1.5"
          size="sm"
        >
          <Plus className="h-4 w-4" />
          Ajouter
        </Button>
      </div>

      {deleteError && (
        <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2">
          {deleteError}
        </div>
      )}

      {/* Add form */}
      {showAddForm && (
        <div className="rounded-3xl border border-[#E6F4F1] bg-white shadow-sm p-5 space-y-4">
          <h2 className="font-heading font-black text-[#134E4A]">Nouveau cabinet</h2>
          <form onSubmit={handleAdd} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="add-name">Nom du cabinet *</Label>
                <Input
                  id="add-name"
                  placeholder="ex: Cabinet Menzah"
                  value={addForm.name}
                  onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
                  required
                  maxLength={100}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="add-city">Ville *</Label>
                <Input
                  id="add-city"
                  placeholder="ex: Tunis"
                  value={addForm.city}
                  onChange={(e) => setAddForm((f) => ({ ...f, city: e.target.value }))}
                  required
                  maxLength={100}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-address">Adresse *</Label>
              <Input
                id="add-address"
                placeholder="Rue, numéro, quartier..."
                value={addForm.address}
                onChange={(e) => setAddForm((f) => ({ ...f, address: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-phone">Téléphone</Label>
              <Input
                id="add-phone"
                type="tel"
                placeholder="+216 XX XXX XXX"
                value={addForm.phone}
                onChange={(e) => setAddForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={addForm.isPrimary}
                onChange={(e) => setAddForm((f) => ({ ...f, isPrimary: e.target.checked }))}
                className="rounded border-[#E6F4F1] text-[#0891B2]"
              />
              <span className="text-sm text-[#134E4A]">Cabinet principal</span>
            </label>
            {addError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {addError}
              </p>
            )}
            <div className="flex gap-2 pt-1">
              <Button type="submit" disabled={addSubmitting} size="sm" className="bg-[#0891B2] hover:bg-[#0E7490]">
                {addSubmitting ? "Enregistrement..." : "Enregistrer"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => { setShowAddForm(false); setAddForm(emptyForm); }}
              >
                Annuler
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Practices list */}
      {loading ? (
        <div className="text-sm text-[#134E4A]/40 py-8 text-center">Chargement...</div>
      ) : error ? (
        <div className="text-sm text-red-500 py-4">{error}</div>
      ) : practices.length === 0 ? (
        <div className="rounded-3xl border border-[#E6F4F1] bg-white shadow-sm p-8 text-center space-y-2">
          <MapPin className="h-8 w-8 text-[#0891B2]/40 mx-auto" />
          <p className="text-sm text-[#134E4A]/60">
            Aucun cabinet pour l&apos;instant. Ajoutez votre premier cabinet.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {practices.map((p) => (
            <div
              key={p.id}
              className={`rounded-3xl border bg-white shadow-sm p-5 space-y-3 transition ${
                p.isActive ? "border-[#E6F4F1]" : "border-[#E6F4F1] opacity-60"
              }`}
            >
              {editingId === p.id ? (
                /* Edit form inline */
                <form onSubmit={handleEdit} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor={`edit-name-${p.id}`}>Nom *</Label>
                      <Input
                        id={`edit-name-${p.id}`}
                        value={editForm.name}
                        onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                        required
                        maxLength={100}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`edit-city-${p.id}`}>Ville *</Label>
                      <Input
                        id={`edit-city-${p.id}`}
                        value={editForm.city}
                        onChange={(e) => setEditForm((f) => ({ ...f, city: e.target.value }))}
                        required
                        maxLength={100}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`edit-address-${p.id}`}>Adresse *</Label>
                    <Input
                      id={`edit-address-${p.id}`}
                      value={editForm.address}
                      onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`edit-phone-${p.id}`}>Téléphone</Label>
                    <Input
                      id={`edit-phone-${p.id}`}
                      type="tel"
                      value={editForm.phone}
                      onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                    />
                  </div>
                  {!p.isPrimary && (
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={editForm.isPrimary}
                        onChange={(e) => setEditForm((f) => ({ ...f, isPrimary: e.target.checked }))}
                        className="rounded border-[#E6F4F1] text-[#0891B2]"
                      />
                      <span className="text-sm text-[#134E4A]">Définir comme cabinet principal</span>
                    </label>
                  )}
                  {editError && (
                    <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                      {editError}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <Button type="submit" disabled={editSubmitting} size="sm" className="bg-[#0891B2] hover:bg-[#0E7490] gap-1">
                      <Check className="h-3.5 w-3.5" />
                      {editSubmitting ? "..." : "Sauvegarder"}
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                      <X className="h-3.5 w-3.5" />
                      Annuler
                    </Button>
                  </div>
                </form>
              ) : (
                /* Display row */
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-heading font-black text-[#134E4A]">{p.name}</span>
                        {p.isPrimary && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#0891B2]/10 px-2 py-0.5 text-xs font-bold text-[#0891B2]">
                            <Star className="h-3 w-3 fill-[#0891B2]" />
                            Principal
                          </span>
                        )}
                        {!p.isActive && (
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                            Inactif
                          </span>
                        )}
                      </div>
                      <div className="mt-1 space-y-0.5">
                        <div className="flex items-center gap-1.5 text-sm text-[#134E4A]/70">
                          <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-[#0891B2]/60" />
                          <span className="truncate">{p.address}, {p.city}</span>
                        </div>
                        {p.phone && (
                          <div className="flex items-center gap-1.5 text-sm text-[#134E4A]/70">
                            <Phone className="h-3.5 w-3.5 flex-shrink-0 text-[#0891B2]/60" />
                            <span>{p.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {!p.isPrimary && p.isActive && (
                        <button
                          title="Définir comme principal"
                          onClick={() => void handleSetPrimary(p.id)}
                          className="rounded-lg border border-[#E6F4F1] p-1.5 text-[#134E4A]/40 hover:border-[#0891B2] hover:text-[#0891B2] transition"
                        >
                          <Star className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        title="Modifier"
                        onClick={() => startEdit(p)}
                        className="rounded-lg border border-[#E6F4F1] p-1.5 text-[#134E4A]/40 hover:border-[#0891B2] hover:text-[#0891B2] transition"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      {!p.isPrimary && (
                        <button
                          title="Supprimer"
                          disabled={deletingId === p.id}
                          onClick={() => void handleDelete(p.id)}
                          className="rounded-lg border border-[#E6F4F1] p-1.5 text-[#134E4A]/40 hover:border-red-400 hover:text-red-500 transition disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
