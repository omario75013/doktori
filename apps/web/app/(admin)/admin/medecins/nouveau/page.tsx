"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, UserPlus, Loader2 } from "lucide-react";
import { SPECIALTIES, CITIES } from "@doktori/shared";

export default function NouveauMedecinPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const form = e.currentTarget;
    const data = new FormData(form);

    const payload: Record<string, unknown> = {
      name: (data.get("name") as string).trim(),
      email: (data.get("email") as string).trim().toLowerCase(),
      phone: (data.get("phone") as string).trim(),
      specialty: data.get("specialty") as string,
      city: data.get("city") as string,
      address: (data.get("address") as string).trim(),
      bio: (data.get("bio") as string).trim() || undefined,
      password: data.get("password") as string,
    };

    const feeRaw = (data.get("consultationFee") as string).trim();
    if (feeRaw) {
      const feeDT = parseFloat(feeRaw);
      if (!isNaN(feeDT) && feeDT >= 0) {
        payload.consultationFee = Math.round(feeDT * 1000);
      }
    }

    const res = await fetch("/api/admin/doctors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const json = await res.json();

    if (!res.ok) {
      if (json.fieldErrors) {
        setFieldErrors(json.fieldErrors);
      } else {
        setError(json.error ?? "Une erreur est survenue.");
      }
      return;
    }

    startTransition(() => {
      router.push(`/admin/medecins/${json.doctor.id}`);
    });
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <Link
        href="/admin/medecins"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Retour aux médecins
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Nouveau médecin</h1>
        <p className="text-slate-500 mt-1 text-sm">
          Créer un compte médecin sur la plateforme
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl border border-slate-200 p-6 space-y-5"
      >
        {error && (
          <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Nom complet <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="name"
            required
            autoComplete="off"
            placeholder="Dr. Sami Ben Ali"
            className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
              fieldErrors.name ? "border-red-400" : "border-slate-200"
            }`}
          />
          {fieldErrors.name && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.name}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            name="email"
            required
            autoComplete="off"
            placeholder="sami.benali@doktori.tn"
            className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
              fieldErrors.email ? "border-red-400" : "border-slate-200"
            }`}
          />
          {fieldErrors.email && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>
          )}
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Téléphone <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            name="phone"
            required
            placeholder="+216 XX XXX XXX"
            className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
              fieldErrors.phone ? "border-red-400" : "border-slate-200"
            }`}
          />
          {fieldErrors.phone && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.phone}</p>
          )}
        </div>

        {/* Specialty + City row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Spécialité <span className="text-red-500">*</span>
            </label>
            <select
              name="specialty"
              required
              defaultValue=""
              className={`w-full px-3 py-2 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                fieldErrors.specialty ? "border-red-400" : "border-slate-200"
              }`}
            >
              <option value="" disabled>
                Choisir…
              </option>
              {SPECIALTIES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
            {fieldErrors.specialty && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.specialty}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Ville <span className="text-red-500">*</span>
            </label>
            <select
              name="city"
              required
              defaultValue=""
              className={`w-full px-3 py-2 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                fieldErrors.city ? "border-red-400" : "border-slate-200"
              }`}
            >
              <option value="" disabled>
                Choisir…
              </option>
              {CITIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
            {fieldErrors.city && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.city}</p>
            )}
          </div>
        </div>

        {/* Address */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Adresse <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="address"
            required
            placeholder="12 Rue des Oliviers, Tunis"
            className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
              fieldErrors.address ? "border-red-400" : "border-slate-200"
            }`}
          />
          {fieldErrors.address && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.address}</p>
          )}
        </div>

        {/* Bio */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Bio{" "}
            <span className="text-slate-400 font-normal text-xs">(optionnel)</span>
          </label>
          <textarea
            name="bio"
            rows={3}
            placeholder="Présentation du médecin…"
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
          />
        </div>

        {/* Consultation fee */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Tarif consultation (DT){" "}
            <span className="text-slate-400 font-normal text-xs">(optionnel)</span>
          </label>
          <div className="relative">
            <input
              type="number"
              name="consultationFee"
              min="0"
              step="0.5"
              placeholder="50"
              className="w-full px-3 py-2 pr-12 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">
              DT
            </span>
          </div>
        </div>

        {/* Password */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Mot de passe <span className="text-red-500">*</span>
          </label>
          <input
            type="password"
            name="password"
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="Minimum 8 caractères"
            className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
              fieldErrors.password ? "border-red-400" : "border-slate-200"
            }`}
          />
          {fieldErrors.password && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.password}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href="/admin/medecins"
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Annuler
          </Link>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <UserPlus className="w-4 h-4" />
            )}
            Créer le médecin
          </button>
        </div>
      </form>
    </div>
  );
}
