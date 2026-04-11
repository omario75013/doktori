"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SPECIALTIES } from "@doktori/shared";
import { format, isPast } from "date-fns";
import { fr } from "date-fns/locale";

type Step = "phone" | "code" | "loggedIn";

const RELATION_LABELS: Record<string, string> = {
  child: "enfant",
  parent: "parent",
  spouse: "conjoint(e)",
  other: "proche",
};

interface Appointment {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  type: string;
  reason: string | null;
  doctorName: string;
  doctorSpecialty: string;
  doctorAddress: string;
  doctorSlug: string;
  beneficiaryName: string | null;
  beneficiaryRelation: string | null;
}

export default function MesRdvPage() {
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Check if already logged in
  useEffect(() => {
    const stored = localStorage.getItem("doktori_patient_token");
    if (stored) {
      setToken(stored);
      setStep("loggedIn");
    }
  }, []);

  // Fetch appointments when logged in
  useEffect(() => {
    if (step === "loggedIn" && token) {
      setLoading(true);
      fetch("/api/appointments/patient", { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => {
          if (r.status === 401) {
            localStorage.removeItem("doktori_patient_token");
            setToken(null);
            setStep("phone");
            return [];
          }
          return r.json();
        })
        .then((data) => { setAppointments(Array.isArray(data) ? data : []); setLoading(false); })
        .catch(() => setLoading(false));
    }
  }, [step, token]);

  async function requestOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    const res = await fetch("/api/auth/otp/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    setLoading(false);
    if (!res.ok) {
      const err = await res.json();
      setError(typeof err.error === "string" ? err.error : "Erreur");
      return;
    }
    setStep("code");
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    const res = await fetch("/api/auth/otp/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, code }),
    });
    setLoading(false);
    if (!res.ok) {
      const err = await res.json();
      setError(typeof err.error === "string" ? err.error : "Code invalide");
      return;
    }
    const data = await res.json();
    localStorage.setItem("doktori_patient_token", data.token);
    setToken(data.token);
    setStep("loggedIn");
  }

  async function cancelAppointment(id: string) {
    if (!token) return;
    if (!confirm("Annuler ce rendez-vous ?")) return;
    const res = await fetch(`/api/appointments/${id}/cancel`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setAppointments((prev) => prev.map((a) => a.id === id ? { ...a, status: "cancelled" } : a));
    }
  }

  function logout() {
    localStorage.removeItem("doktori_patient_token");
    setToken(null);
    setStep("phone");
    setPhone("");
    setCode("");
  }

  if (step === "phone") {
    return (
      <div className="max-w-md mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold mb-2">Mes rendez-vous</h1>
        <p className="text-gray-500 mb-6">Entrez votre numéro de téléphone pour accéder à vos RDV</p>
        <form onSubmit={requestOtp} className="space-y-4">
          <div>
            <Label htmlFor="phone">Téléphone</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+216 XX XXX XXX" required />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Envoi..." : "Recevoir le code par SMS"}
          </Button>
        </form>
      </div>
    );
  }

  if (step === "code") {
    return (
      <div className="max-w-md mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold mb-2">Code de vérification</h1>
        <p className="text-gray-500 mb-6">Entrez le code à 6 chiffres reçu par SMS au {phone}</p>
        <form onSubmit={verifyOtp} className="space-y-4">
          <div>
            <Label htmlFor="code">Code</Label>
            <Input id="code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" maxLength={6} required />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Vérification..." : "Valider"}
          </Button>
          <button type="button" onClick={() => setStep("phone")} className="w-full text-sm text-gray-500 hover:underline">
            Changer de numéro
          </button>
        </form>
      </div>
    );
  }

  // step === "loggedIn"
  const upcoming = appointments.filter((a) => a.status !== "cancelled" && !isPast(new Date(a.startsAt)));
  const past = appointments.filter((a) => a.status === "cancelled" || isPast(new Date(a.startsAt)));

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Mes rendez-vous</h1>
        <div className="flex items-center gap-3">
          <a href="/dossier-medical" className="text-sm font-semibold text-blue-600 hover:underline">
            Mon dossier médical
          </a>
          <button onClick={logout} className="text-sm text-gray-500 hover:underline">Se déconnecter</button>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-400 text-center py-8">Chargement...</p>
      ) : (
        <>
          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-3">À venir ({upcoming.length})</h2>
            {upcoming.length === 0 ? (
              <p className="text-gray-400 text-sm bg-white rounded-xl p-6 border text-center">Aucun rendez-vous à venir</p>
            ) : (
              <div className="space-y-3">
                {upcoming.map((a) => {
                  const spec = SPECIALTIES.find((s) => s.id === a.doctorSpecialty);
                  return (
                    <div key={a.id} className="bg-white rounded-xl p-4 border flex items-start justify-between">
                      <div>
                        <div className="font-semibold">{a.doctorName}</div>
                        <div className="text-sm text-blue-600">{spec?.label}</div>
                        <div className="text-sm text-gray-500 mt-1">
                          {format(new Date(a.startsAt), "EEEE d MMMM 'à' HH:mm", { locale: fr })}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">{a.doctorAddress}</div>
                        {a.beneficiaryName && (
                          <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                            Pour {a.beneficiaryName}
                            {a.beneficiaryRelation && a.beneficiaryRelation !== "other" && (
                              <span className="text-blue-500/70">· {RELATION_LABELS[a.beneficiaryRelation] ?? a.beneficiaryRelation}</span>
                            )}
                          </div>
                        )}
                      </div>
                      <Button variant="outline" size="sm" onClick={() => cancelAppointment(a.id)}>Annuler</Button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">Historique</h2>
            {past.length === 0 ? (
              <p className="text-gray-400 text-sm">Aucun rendez-vous passé</p>
            ) : (
              <div className="space-y-2">
                {past.map((a) => {
                  const spec = SPECIALTIES.find((s) => s.id === a.doctorSpecialty);
                  return (
                    <div key={a.id} className="bg-gray-50 rounded-xl p-4 border text-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium">{a.doctorName}</span>
                          <span className="text-gray-500"> — {spec?.label}</span>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded ${a.status === "cancelled" ? "bg-gray-200 text-gray-600" : "bg-blue-100 text-blue-700"}`}>
                          {a.status === "cancelled" ? "Annulé" : "Passé"}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {format(new Date(a.startsAt), "d MMM yyyy 'à' HH:mm", { locale: fr })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
