"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  FlaskConical,
  MapPin,
  Phone,
  Save,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { PhoneInput } from "@/components/ui/phone-input";

interface LabProfile {
  id: string;
  name: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  services: string[];
  accreditations: string[];
}

export default function LaboratoireParametresPage() {
  const t = useTranslations("laboratoire.parametres");

  const [profile, setProfile] = useState<LabProfile | null>(null);
  const [form, setForm] = useState({
    name: "",
    address: "",
    city: "",
    phone: "",
    services: "",
    accreditations: "",
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});

  useEffect(() => {
    fetch("/api/laboratoire/parametres")
      .then((res) => res.ok ? res.json() as Promise<LabProfile> : null)
      .then((data) => {
        if (data) {
          setProfile(data);
          setForm({
            name: data.name,
            address: data.address,
            city: data.city,
            phone: data.phone,
            services: data.services.join(", "),
            accreditations: data.accreditations.join(", "),
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    const errs: { name?: string; phone?: string } = {};
    if (!form.name.trim()) errs.name = "Le nom est requis.";
    if (form.phone && !/^[0-9\s+\-()]{6,20}$/.test(form.phone.trim())) {
      errs.phone = "Numéro invalide.";
    }
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    try {
      const res = await fetch("/api/laboratoire/parametres", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          address: form.address.trim(),
          city: form.city.trim(),
          phone: form.phone.trim(),
          services: form.services
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          accreditations: form.accreditations
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        }),
      });

      if (res.ok) {
        const updated = await res.json() as LabProfile;
        setProfile(updated);
        toast.success(t("saved"));
      } else {
        const data = await res.json() as { error?: string };
        toast.error(data.error ?? "Erreur lors de la mise à jour.");
      }
    } catch {
      toast.error("Erreur réseau. Réessayez.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" strokeWidth={2} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="font-heading text-2xl font-black text-foreground">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Mettez à jour les informations de votre laboratoire.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-white dark:bg-gray-900 p-6">
        <form onSubmit={handleSave} className="space-y-4">
          {/* Name */}
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-green-800">
              Nom du laboratoire
            </label>
            <div
              className={`flex h-11 items-center rounded-xl border-2 px-3 focus-within:border-green-500 ${errors.name ? "border-red-400" : "border-border"}`}
            >
              <FlaskConical className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} />
              <input
                type="text"
                value={form.name}
                onChange={(e) => {
                  setForm({ ...form, name: e.target.value });
                  if (errors.name) setErrors({ ...errors, name: undefined });
                }}
                required
                className="h-full flex-1 border-0 bg-transparent text-sm text-foreground outline-none"
              />
            </div>
            {errors.name && (
              <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} />
                {errors.name}
              </p>
            )}
          </div>

          {/* Address + City */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-green-800">
                Adresse
              </label>
              <div className="flex h-11 items-center rounded-xl border-2 border-border px-3 focus-within:border-green-500">
                <MapPin className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} />
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="h-full flex-1 border-0 bg-transparent text-sm text-foreground outline-none"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-green-800">
                Ville
              </label>
              <div className="flex h-11 items-center rounded-xl border-2 border-border px-3 focus-within:border-green-500">
                <MapPin className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} />
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="h-full flex-1 border-0 bg-transparent text-sm text-foreground outline-none"
                />
              </div>
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-green-800">
              Téléphone
            </label>
            <PhoneInput
              value={form.phone}
              onChange={(v) => {
                setForm({ ...form, phone: v });
                if (errors.phone) setErrors({ ...errors, phone: undefined });
              }}
              className={errors.phone ? "border-red-400" : ""}
            />
            {errors.phone && (
              <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} />
                {errors.phone}
              </p>
            )}
          </div>

          {/* Email — read-only */}
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-green-800">
              Email de connexion
            </label>
            <div className="flex h-11 items-center rounded-xl border-2 border-border bg-gray-50 px-3">
              <span className="text-sm text-muted-foreground">{profile?.email}</span>
            </div>
          </div>

          {/* Services */}
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-green-800">
              Services (séparés par virgule)
            </label>
            <input
              type="text"
              value={form.services}
              onChange={(e) => setForm({ ...form, services: e.target.value })}
              placeholder="analyses_medicales, radiologie, …"
              className="h-11 w-full rounded-xl border-2 border-border bg-white px-3 text-sm text-foreground outline-none focus:border-green-500 placeholder:text-muted-foreground/60"
            />
          </div>

          {/* Accreditations */}
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-green-800">
              Accréditations (séparées par virgule)
            </label>
            <input
              type="text"
              value={form.accreditations}
              onChange={(e) => setForm({ ...form, accreditations: e.target.value })}
              placeholder="ISO 15189, …"
              className="h-11 w-full rounded-xl border-2 border-border bg-white px-3 text-sm text-foreground outline-none focus:border-green-500 placeholder:text-muted-foreground/60"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-green-600 px-5 text-sm font-bold text-white transition-all hover:bg-green-700 disabled:opacity-60"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} />
            ) : (
              <Save className="h-4 w-4" strokeWidth={2.5} />
            )}
            {t("save")}
          </button>
        </form>
      </div>
    </div>
  );
}
