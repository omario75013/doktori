"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Check, X, Loader2, Stethoscope } from "lucide-react";

type Referral = {
  id: string;
  reason: string;
  consentStatus: "pending" | "granted" | "denied";
  fromDoctor: { name: string; specialty: string | null } | null;
  toDoctor: { name: string; specialty: string | null } | null;
};

export default function ConsentPage() {
  const params = useParams<{ token: string }>();
  const [data, setData] = useState<Referral | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<"granted" | "denied" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<"granted" | "denied" | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/consent/referral/${params.token}`);
        if (!res.ok) throw new Error("Lien invalide ou expiré");
        const json = await res.json();
        setData(json);
        if (json.consentStatus !== "pending") setDone(json.consentStatus);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.token]);

  async function submit(consent: "granted" | "denied") {
    setSubmitting(consent);
    try {
      const res = await fetch(`/api/consent/referral/${params.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consent }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Erreur");
      }
      setDone(consent);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSubmitting(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-red-800 font-semibold">{error ?? "Lien invalide"}</p>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-2xl border border-border bg-white p-6 text-center space-y-3">
          <div
            className={`mx-auto h-12 w-12 rounded-full flex items-center justify-center ${
              done === "granted" ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-500"
            }`}
          >
            {done === "granted" ? <Check className="h-6 w-6" /> : <X className="h-6 w-6" />}
          </div>
          <h1 className="text-lg font-bold">
            {done === "granted"
              ? "Consentement accordé"
              : "Consentement refusé"}
          </h1>
          <p className="text-sm text-gray-600">
            {done === "granted"
              ? `Votre dossier médical peut être partagé avec Dr. ${data.toDoctor?.name ?? "le médecin receveur"}. Merci.`
              : `Votre dossier médical ne sera pas partagé. Seuls votre nom et le motif seront transmis à Dr. ${data.toDoctor?.name ?? "le médecin receveur"}.`}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <div className="max-w-lg w-full rounded-2xl border border-border bg-white shadow-sm p-6 space-y-5">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            Demande de partage de votre dossier médical
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Votre médecin vous oriente vers un confrère. Pour lui transmettre votre dossier médical complet, nous avons besoin de votre accord.
          </p>
        </div>

        <div className="rounded-xl bg-secondary/40 p-4 space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Stethoscope className="h-4 w-4 text-primary" />
            <span className="font-semibold text-foreground">Médecin référent</span>
          </div>
          <p className="ml-6 text-foreground">
            Dr. {data.fromDoctor?.name ?? "—"}
            {data.fromDoctor?.specialty && (
              <span className="text-gray-500"> · {data.fromDoctor.specialty}</span>
            )}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <Stethoscope className="h-4 w-4 text-primary" />
            <span className="font-semibold text-foreground">Médecin receveur</span>
          </div>
          <p className="ml-6 text-foreground">
            Dr. {data.toDoctor?.name ?? "—"}
            {data.toDoctor?.specialty && (
              <span className="text-gray-500"> · {data.toDoctor.specialty}</span>
            )}
          </p>
        </div>

        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">
            Motif du référencement
          </p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{data.reason}</p>
        </div>

        <div className="rounded-xl border border-border p-3 text-xs text-gray-600 space-y-1">
          <p className="font-semibold">En acceptant :</p>
          <ul className="list-disc ml-5 space-y-0.5">
            <li>Votre dossier médical (allergies, traitements, antécédents) est partagé.</li>
            <li>Vos consultations passées sont partagées.</li>
          </ul>
          <p className="font-semibold mt-2">En refusant :</p>
          <ul className="list-disc ml-5 space-y-0.5">
            <li>Seuls votre nom et le motif de référencement sont transmis.</li>
            <li>Le médecin receveur devra vous recontacter pour obtenir l&apos;historique.</li>
          </ul>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => submit("denied")}
            disabled={submitting !== null}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 py-3 text-sm font-semibold hover:bg-secondary disabled:opacity-60"
          >
            {submitting === "denied" ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
            Refuser
          </button>
          <button
            onClick={() => submit("granted")}
            disabled={submitting !== null}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
          >
            {submitting === "granted" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Accepter
          </button>
        </div>
      </div>
    </div>
  );
}
