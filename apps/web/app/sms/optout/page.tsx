"use client";

import { useState } from "react";
import { PhoneInput } from "@/components/ui/phone-input";

// Public opt-out page — no auth required.
// v1 approach: patient enters their phone number manually.
// TODO v2: replace with signed per-recipient token links (doktori.tn/sms/optout?t=TOKEN)
// so patients can opt out with a single click from the SMS without re-entering their number.

export default function SmsOptOutPage() {
  const [phone, setPhone] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/sms/optout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? "Erreur");
      }
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <h1 className="text-xl font-black text-gray-900 mb-2">
          Se désabonner des SMS
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          Entrez votre numéro de téléphone pour ne plus recevoir de messages groupés de la part des cliniques.
        </p>

        {submitted ? (
          <div className="rounded-xl bg-green-50 border border-green-200 p-5 text-center">
            <p className="text-green-800 font-semibold text-sm">
              Votre numéro a bien été enregistré. Vous ne recevrez plus de SMS groupés.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Numéro de téléphone
              </label>
              <PhoneInput value={phone} onChange={setPhone} required autoComplete="tel" />
            </div>
            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading || !phone}
              className="w-full rounded-xl bg-teal-600 text-white font-semibold py-2.5 text-sm hover:bg-teal-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "Traitement…" : "Se désabonner"}
            </button>
          </form>
        )}

        <p className="mt-6 text-xs text-gray-400 text-center">
          Doktori · doktori.tn
        </p>
      </div>
    </div>
  );
}
