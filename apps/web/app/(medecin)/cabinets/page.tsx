"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Phone, Plus, Pencil, Trash2, Star, ArrowLeft, Check, X, Loader2, Building2, Camera, ImagePlus } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface CabinetPhoto {
  url: string;
  alt?: string;
}

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
  photos: CabinetPhoto[];
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

  // Photo upload state: practiceId → uploading boolean
  const [uploadingPhoto, setUploadingPhoto] = useState<string | null>(null);
  // Photo delete state: `${practiceId}-${index}` → boolean
  const [deletingPhoto, setDeletingPhoto] = useState<string | null>(null);

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
      toast.success("Cabinet ajouté avec succès");
      await loadPractices();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur inattendue";
      setAddError(msg);
      toast.error(msg);
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
      toast.success("Cabinet mis à jour");
      await loadPractices();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur inattendue";
      setEditError(msg);
      toast.error(msg);
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
      toast.success("Cabinet supprimé");
      await loadPractices();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur inattendue";
      setDeleteError(msg);
      toast.error(msg);
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

  async function handlePhotoUpload(practiceId: string, file: File) {
    const MAX_BYTES = 5 * 1024 * 1024;
    const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

    if (!ALLOWED.includes(file.type)) {
      toast.error("Type de fichier non autorisé (jpeg, png, webp uniquement)");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Fichier trop volumineux (max 5 Mo)");
      return;
    }

    setUploadingPhoto(practiceId);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/medecin/cabinets/${practiceId}/photos`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(typeof data.error === "string" ? data.error : "Erreur");
      }
      toast.success("Photo ajoutée");
      await loadPractices();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur inattendue";
      toast.error(msg);
    } finally {
      setUploadingPhoto(null);
    }
  }

  async function handlePhotoDelete(practiceId: string, index: number) {
    const key = `${practiceId}-${index}`;
    setDeletingPhoto(key);
    try {
      const res = await fetch(
        `/api/medecin/cabinets/${practiceId}/photos?index=${index}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(typeof data.error === "string" ? data.error : "Erreur");
      }
      toast.success("Photo supprimée");
      await loadPractices();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur inattendue";
      toast.error(msg);
    } finally {
      setDeletingPhoto(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/profil"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Profil
          </Link>
          <span className="text-foreground/30">/</span>
          <h1 className="text-xl font-heading font-black text-foreground">
            Mes cabinets
          </h1>
        </div>
        <Button
          onClick={() => {
            setShowAddForm((v) => !v);
            setAddError(null);
          }}
          className="bg-primary hover:bg-doktori-teal-dark gap-1.5"
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
        <div className="rounded-3xl border border-border bg-white dark:bg-gray-900 shadow-sm p-5 space-y-4">
          <h2 className="font-heading font-black text-foreground">Nouveau cabinet</h2>
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
                className="rounded border-border text-primary"
              />
              <span className="text-sm text-foreground">Cabinet principal</span>
            </label>
            {addError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {addError}
              </p>
            )}
            <div className="flex gap-2 pt-1">
              <Button type="submit" disabled={addSubmitting} size="sm" className="bg-primary hover:bg-doktori-teal-dark gap-1.5">
                {addSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  "Enregistrer"
                )}
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
        <div className="text-sm text-foreground/40 py-8 text-center">Chargement...</div>
      ) : error ? (
        <div className="text-sm text-red-500 py-4">{error}</div>
      ) : practices.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-white dark:bg-gray-900 shadow-sm p-10 text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mx-auto">
            <Building2 className="h-7 w-7 text-primary/60" strokeWidth={1.5} />
          </div>
          <div>
            <p className="font-heading font-black text-foreground">Aucun cabinet enregistré</p>
            <p className="text-sm text-foreground/50 mt-1">
              Ajoutez votre premier cabinet pour que les patients puissent vous trouver.
            </p>
          </div>
          <Button
            onClick={() => { setShowAddForm(true); setAddError(null); }}
            className="bg-primary hover:bg-doktori-teal-dark gap-1.5 mt-2"
            size="sm"
          >
            <Plus className="h-4 w-4" />
            Ajouter mon premier cabinet
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {practices.map((p) => (
            <div
              key={p.id}
              className={`rounded-3xl border bg-white dark:bg-gray-900 shadow-sm p-5 space-y-3 transition ${
                p.isActive ? "border-border" : "border-border opacity-60"
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
                        className="rounded border-border text-primary"
                      />
                      <span className="text-sm text-foreground">Définir comme cabinet principal</span>
                    </label>
                  )}
                  {editError && (
                    <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                      {editError}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <Button type="submit" disabled={editSubmitting} size="sm" className="bg-primary hover:bg-doktori-teal-dark gap-1">
                      {editSubmitting ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )}
                      {editSubmitting ? "Sauvegarde..." : "Sauvegarder"}
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
                        <span className="font-heading font-black text-foreground">{p.name}</span>
                        {p.isPrimary && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                            <Star className="h-3 w-3 fill-primary" />
                            Principal
                          </span>
                        )}
                        {!p.isActive && (
                          <span className="rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs text-gray-500 dark:text-gray-400">
                            Inactif
                          </span>
                        )}
                      </div>
                      <div className="mt-1 space-y-0.5">
                        <div className="flex items-center gap-1.5 text-sm text-foreground/70">
                          <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-primary/60" />
                          <span className="truncate">{p.address}, {p.city}</span>
                        </div>
                        {p.phone && (
                          <div className="flex items-center gap-1.5 text-sm text-foreground/70">
                            <Phone className="h-3.5 w-3.5 flex-shrink-0 text-primary/60" />
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
                          className="rounded-lg border border-border p-1.5 text-foreground/40 hover:border-primary hover:text-primary transition"
                        >
                          <Star className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        title="Modifier"
                        onClick={() => startEdit(p)}
                        className="rounded-lg border border-border p-1.5 text-foreground/40 hover:border-primary hover:text-primary transition"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      {!p.isPrimary && (
                        <button
                          title="Supprimer"
                          disabled={deletingId === p.id}
                          onClick={() => void handleDelete(p.id)}
                          className="rounded-lg border border-border p-1.5 text-foreground/40 hover:border-red-400 hover:text-red-500 transition disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Photos section */}
                  <div className="pt-3 border-t border-border/50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        <Camera className="h-3.5 w-3.5" strokeWidth={2.5} />
                        Photos du cabinet
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-doktori-teal-dark">
                          {(p.photos ?? []).length} / 5
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {/* Existing photos */}
                      {(p.photos ?? []).map((photo, idx) => {
                        const deleteKey = `${p.id}-${idx}`;
                        const isDeleting = deletingPhoto === deleteKey;
                        return (
                          <div key={idx} className="group relative h-20 w-20 shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={photo.url}
                              alt={photo.alt ?? `Photo ${idx + 1}`}
                              className="h-full w-full rounded-xl object-cover ring-1 ring-border"
                            />
                            <button
                              title="Supprimer cette photo"
                              disabled={isDeleting}
                              onClick={() => void handlePhotoDelete(p.id, idx)}
                              className="absolute -right-1.5 -top-1.5 hidden h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow-sm transition-colors hover:bg-red-600 disabled:opacity-50 group-hover:flex"
                            >
                              {isDeleting ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <X className="h-3 w-3" strokeWidth={3} />
                              )}
                            </button>
                          </div>
                        );
                      })}

                      {/* Upload slot — shown only when under the 5 photo limit */}
                      {(p.photos ?? []).length < 5 && (
                        <label
                          className={`relative flex h-20 w-20 shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-border bg-secondary/50 text-muted-foreground transition-all hover:border-primary hover:bg-secondary hover:text-primary ${
                            uploadingPhoto === p.id ? "pointer-events-none opacity-60" : ""
                          }`}
                          title="Ajouter une photo"
                        >
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="sr-only"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) void handlePhotoUpload(p.id, file);
                              // Reset input so same file can be re-selected
                              e.target.value = "";
                            }}
                            disabled={uploadingPhoto === p.id}
                          />
                          {uploadingPhoto === p.id ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            <ImagePlus className="h-5 w-5" strokeWidth={1.5} />
                          )}
                          <span className="text-[10px] font-bold leading-none">
                            {uploadingPhoto === p.id ? "Envoi..." : "Ajouter"}
                          </span>
                        </label>
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
