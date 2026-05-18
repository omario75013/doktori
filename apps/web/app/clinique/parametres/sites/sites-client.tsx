"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Building,
  MapPin,
  Phone,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  X,
  Star,
  AlertCircle,
} from "lucide-react";
import { PhoneInput } from "@/components/ui/phone-input";

interface Site {
  id: string;
  clinicId: string;
  name: string;
  address: string;
  city: string;
  phone: string | null;
  isPrimary: boolean;
  createdAt: Date | string;
}

interface SiteFormData {
  name: string;
  address: string;
  city: string;
  phone: string;
  isPrimary: boolean;
}

const EMPTY_FORM: SiteFormData = { name: "", address: "", city: "", phone: "", isPrimary: false };

function SiteModal({
  initial,
  onClose,
  onSaved,
}: {
  initial?: Site;
  onClose: () => void;
  onSaved: (site: Site) => void;
}) {
  const [form, setForm] = useState<SiteFormData>(
    initial
      ? {
          name: initial.name,
          address: initial.address,
          city: initial.city,
          phone: initial.phone ?? "",
          isPrimary: initial.isPrimary,
        }
      : EMPTY_FORM,
  );
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof SiteFormData, string>>>({});

  function validate(): boolean {
    const e: typeof errors = {};
    if (!form.name.trim()) e.name = "Le nom est requis.";
    if (!form.address.trim()) e.address = "L'adresse est requise.";
    if (!form.city.trim()) e.city = "La ville est requise.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const res = await fetch(
        initial ? `/api/clinique/sites/${initial.id}` : "/api/clinique/sites",
        {
          method: initial ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name.trim(),
            address: form.address.trim(),
            city: form.city.trim(),
            phone: form.phone.trim() || null,
            isPrimary: form.isPrimary,
          }),
        },
      );
      const data: Site & { error?: string } = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      toast.success(initial ? "Site mis à jour." : "Site créé.");
      onSaved(data);
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur réseau.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white shadow-xl p-6 space-y-4 border border-border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">
            {initial ? "Modifier le site" : "Nouveau site"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-secondary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Name */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
              Nom <span className="text-red-500">*</span>
            </label>
            <div
              className={`flex h-10 items-center rounded-xl border px-3 focus-within:border-primary ${errors.name ? "border-red-400" : "border-border"}`}
            >
              <Building className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} />
              <input
                type="text"
                value={form.name}
                onChange={(e) => { setForm({ ...form, name: e.target.value }); setErrors({ ...errors, name: undefined }); }}
                className="h-full flex-1 border-0 bg-transparent text-sm outline-none"
              />
            </div>
            {errors.name && (
              <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {errors.name}
              </p>
            )}
          </div>

          {/* Address */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
              Adresse <span className="text-red-500">*</span>
            </label>
            <div
              className={`flex h-10 items-center rounded-xl border px-3 focus-within:border-primary ${errors.address ? "border-red-400" : "border-border"}`}
            >
              <MapPin className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} />
              <input
                type="text"
                value={form.address}
                onChange={(e) => { setForm({ ...form, address: e.target.value }); setErrors({ ...errors, address: undefined }); }}
                className="h-full flex-1 border-0 bg-transparent text-sm outline-none"
              />
            </div>
            {errors.address && (
              <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {errors.address}
              </p>
            )}
          </div>

          {/* City */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
              Ville <span className="text-red-500">*</span>
            </label>
            <div
              className={`flex h-10 items-center rounded-xl border px-3 focus-within:border-primary ${errors.city ? "border-red-400" : "border-border"}`}
            >
              <MapPin className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} />
              <input
                type="text"
                value={form.city}
                onChange={(e) => { setForm({ ...form, city: e.target.value }); setErrors({ ...errors, city: undefined }); }}
                className="h-full flex-1 border-0 bg-transparent text-sm outline-none"
              />
            </div>
            {errors.city && (
              <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {errors.city}
              </p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
              Téléphone
            </label>
            <PhoneInput value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
          </div>

          {/* isPrimary */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isPrimary}
              onChange={(e) => setForm({ ...form, isPrimary: e.target.checked })}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
            />
            <span className="text-sm text-foreground">Site principal</span>
          </label>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-xl border border-border hover:bg-secondary text-gray-600 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm rounded-xl bg-primary hover:bg-doktori-teal-dark text-white font-bold disabled:opacity-40 transition-colors"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function SitesClient({ initialSites }: { initialSites: Site[] }) {
  const [sites, setSites] = useState<Site[]>(initialSites);
  const [showModal, setShowModal] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | undefined>();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function handleSaved(site: Site) {
    setSites((prev) => {
      const idx = prev.findIndex((s) => s.id === site.id);
      // If set as primary, clear others
      const cleared = site.isPrimary ? prev.map((s) => ({ ...s, isPrimary: false })) : prev;
      if (idx === -1) return [...cleared, site];
      return cleared.map((s, i) => (i === idx ? site : s));
    });
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Supprimer le site "${name}" ? Les salles associées seront également supprimées.`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/clinique/sites/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data: { error?: string } = await res.json();
        throw new Error(data.error ?? "Erreur");
      }
      setSites((prev) => prev.filter((s) => s.id !== id));
      toast.success("Site supprimé.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur réseau.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <div className="space-y-3">
        {sites.map((site) => (
          <div
            key={site.id}
            className="flex items-start justify-between gap-3 rounded-xl border border-border bg-white p-4"
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-50">
                <Building className="h-4 w-4 text-cyan-700" strokeWidth={2.5} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-foreground text-sm">{site.name}</p>
                  {site.isPrimary && (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      Principal
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {site.address}, {site.city}
                </p>
                {site.phone && (
                  <p className="text-xs text-muted-foreground mt-0.5">{site.phone}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => { setEditingSite(site); setShowModal(true); }}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-secondary transition-colors"
                title="Modifier"
              >
                <Pencil className="h-4 w-4" strokeWidth={2.5} />
              </button>
              <button
                onClick={() => handleDelete(site.id, site.name)}
                disabled={deletingId === site.id}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                title="Supprimer"
              >
                {deletingId === site.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" strokeWidth={2.5} />
                )}
              </button>
            </div>
          </div>
        ))}

        <button
          onClick={() => { setEditingSite(undefined); setShowModal(true); }}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-4 text-sm font-medium text-muted-foreground hover:border-primary hover:text-primary transition-colors"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          Nouveau site
        </button>
      </div>

      {showModal && (
        <SiteModal
          initial={editingSite}
          onClose={() => { setShowModal(false); setEditingSite(undefined); }}
          onSaved={handleSaved}
        />
      )}
    </>
  );
}
