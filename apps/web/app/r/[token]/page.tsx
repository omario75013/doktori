"use client";

import { use, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar, CheckCircle2, XCircle } from "lucide-react";

type View = "loading" | "choose" | "confirmed" | "cancelled" | "error";

interface AppointmentPreview {
  doctorName: string;
  specialty: string;
  address: string;
  startsAt: string;
  status: string;
}

export default function ReminderActionPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [view, setView] = useState<View>("loading");
  const [appt, setAppt] = useState<AppointmentPreview | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/appointments/reminder-action/preview?token=${encodeURIComponent(token)}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) {
          setErrorMessage(data.error || "Lien invalide");
          setView("error");
          return;
        }
        setAppt(data);
        if (data.status === "cancelled") setView("cancelled");
        else setView("choose");
      })
      .catch(() => {
        setErrorMessage("Erreur de chargement");
        setView("error");
      });
  }, [token]);

  async function act(action: "confirm" | "cancel") {
    setSubmitting(true);
    const res = await fetch("/api/appointments/reminder-action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, action }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setErrorMessage(data.error || "Action impossible");
      setView("error");
      return;
    }
    setView(data.status === "cancelled" ? "cancelled" : "confirmed");
  }

  return (
    <div className="min-h-screen bg-[#F0FDFA]/40 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-[#E6F4F1] bg-white shadow-sm p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-[#0891B2]" strokeWidth={2.5} />
          <span className="font-heading font-black text-[#134E4A] text-lg">Doktori · Rendez-vous</span>
        </div>

        {view === "loading" && <p className="text-sm text-[#134E4A]/60">Chargement…</p>}

        {view === "choose" && appt && (
          <>
            <div className="space-y-1">
              <p className="text-sm text-[#134E4A]/60">Vous avez rendez-vous avec</p>
              <h1 className="font-heading text-xl font-black text-[#134E4A]">{appt.doctorName}</h1>
              <p className="text-sm text-[#0E7490] font-semibold">{appt.specialty}</p>
              <p className="text-sm text-[#134E4A]/70">{appt.address}</p>
              <p className="mt-3 text-base font-bold text-[#0891B2]">{formatDate(appt.startsAt)}</p>
            </div>

            <div className="space-y-2">
              <Button
                disabled={submitting}
                onClick={() => act("confirm")}
                className="w-full h-12 bg-[#0891B2] hover:bg-[#0E7490] text-white font-bold"
              >
                ✓ Je confirme ma présence
              </Button>
              <Button
                disabled={submitting}
                variant="outline"
                onClick={() => act("cancel")}
                className="w-full h-12 border-2 border-[#E6F4F1] text-[#134E4A] hover:border-red-400 hover:text-red-600 hover:bg-red-50 font-semibold"
              >
                Annuler le rendez-vous
              </Button>
            </div>
            <p className="text-xs text-[#134E4A]/50 text-center">
              Merci de prévenir au moins 24h à l&apos;avance en cas d&apos;empêchement.
            </p>
          </>
        )}

        {view === "confirmed" && (
          <div className="text-center space-y-3 py-4">
            <CheckCircle2 className="mx-auto h-14 w-14 text-[#22C55E]" strokeWidth={2} />
            <h2 className="font-heading text-xl font-black text-[#134E4A]">Présence confirmée</h2>
            <p className="text-sm text-[#134E4A]/60">Merci ! Votre médecin est informé.</p>
          </div>
        )}

        {view === "cancelled" && (
          <div className="text-center space-y-3 py-4">
            <XCircle className="mx-auto h-14 w-14 text-[#DC2626]" strokeWidth={2} />
            <h2 className="font-heading text-xl font-black text-[#134E4A]">Rendez-vous annulé</h2>
            <p className="text-sm text-[#134E4A]/60">Un autre patient pourra prendre votre créneau.</p>
            <a href="/recherche" className="inline-block mt-2 text-sm font-bold text-[#0891B2] hover:underline">
              Trouver un autre rendez-vous →
            </a>
          </div>
        )}

        {view === "error" && (
          <div className="text-center space-y-3 py-4">
            <XCircle className="mx-auto h-14 w-14 text-[#DC2626]/70" strokeWidth={2} />
            <p className="text-sm text-[#134E4A]">{errorMessage}</p>
            <a href="/" className="inline-block text-sm font-bold text-[#0891B2] hover:underline">
              Retour à l&apos;accueil
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}
