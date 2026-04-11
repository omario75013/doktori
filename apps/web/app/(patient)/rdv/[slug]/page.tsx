"use client";

import { use, useState, useEffect } from "react";
import { SlotPicker } from "@/components/slot-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Doctor {
  id: string;
  name: string;
  slug: string;
  specialty: string;
  city: string;
  address: string;
  photoUrl: string | null;
  bio: string | null;
  consultationFee: number | null;
}

type Step = "slots" | "form" | "success";

interface BookingState {
  date: string;
  startTime: string;
}

export default function RdvPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);

  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [doctorError, setDoctorError] = useState(false);
  const [doctorLoading, setDoctorLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/doctors/${slug}`)
      .then((r) => {
        if (!r.ok) throw new Error("not found");
        return r.json() as Promise<Doctor>;
      })
      .then((d) => {
        setDoctor(d);
        setDoctorLoading(false);
      })
      .catch(() => {
        setDoctorError(true);
        setDoctorLoading(false);
      });
  }, [slug]);

  const [step, setStep] = useState<Step>("slots");
  const [booking, setBooking] = useState<BookingState | null>(null);
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [appointmentId, setAppointmentId] = useState<string | null>(null);

  function handleSlotSelect(date: string, startTime: string) {
    setBooking({ date, startTime });
    setStep("form");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!doctor || !booking) return;

    setSubmitting(true);
    setFormError(null);

    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctorId: doctor.id,
          patientName,
          patientPhone,
          date: booking.date,
          startTime: booking.startTime,
          reason: reason || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(
          typeof data.error === "string" ? data.error : "Erreur lors de la réservation"
        );
      }

      const data = await res.json();
      setAppointmentId(data.id as string);
      setStep("success");
    } catch (err: unknown) {
      setFormError(
        err instanceof Error ? err.message : "Erreur inattendue"
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (doctorLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400 text-sm">Chargement...</p>
      </div>
    );
  }

  if (doctorError || !doctor) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-gray-600">Médecin introuvable.</p>
          <Button onClick={() => (window.location.href = "/")}>
            Retour à l&apos;accueil
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-xl space-y-6">
        {/* Doctor summary card */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
          {doctor.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={doctor.photoUrl}
              alt={doctor.name}
              className="w-16 h-16 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 text-blue-600 font-bold text-xl">
              {doctor.name.charAt(0)}
            </div>
          )}
          <div>
            <h1 className="font-semibold text-gray-900">{doctor.name}</h1>
            <p className="text-sm text-gray-500">{doctor.specialty}</p>
            <p className="text-sm text-gray-400">{doctor.city}</p>
            {doctor.consultationFee != null && (
              <p className="text-sm text-blue-600 font-medium mt-0.5">
                {(doctor.consultationFee / 1000).toFixed(0)} DT
              </p>
            )}
          </div>
        </div>

        {/* Step: slot selection */}
        {step === "slots" && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="font-semibold text-gray-800">Choisir un créneau</h2>
            <SlotPicker doctorId={doctor.id} onSelect={handleSlotSelect} />
          </div>
        )}

        {/* Step: patient info form */}
        {step === "form" && booking && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-5">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setStep("slots")}
                className="text-sm text-blue-600 hover:underline"
              >
                ← Changer de créneau
              </button>
              <span className="text-sm text-gray-500">
                {booking.date} à {booking.startTime}
              </span>
            </div>

            <h2 className="font-semibold text-gray-800">Vos informations</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Nom complet</Label>
                <Input
                  id="name"
                  placeholder="Votre nom"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  required
                  minLength={2}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone">Numéro de téléphone</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+216 XX XXX XXX"
                  value={patientPhone}
                  onChange={(e) => setPatientPhone(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="reason">Motif de consultation (optionnel)</Label>
                <Textarea
                  id="reason"
                  placeholder="Décrivez brièvement votre motif..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  maxLength={200}
                  rows={3}
                />
              </div>

              {formError && (
                <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                  {formError}
                </p>
              )}

              <Button
                type="submit"
                disabled={submitting}
                className="w-full"
              >
                {submitting
                  ? "Réservation en cours..."
                  : "Confirmer le rendez-vous"}
              </Button>
            </form>
          </div>
        )}

        {/* Step: success confirmation */}
        {step === "success" && (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-gray-900">
                Rendez-vous confirmé !
              </h2>
              <p className="text-sm text-gray-500">
                Votre rendez-vous avec {doctor.name} a été enregistré avec succès.
              </p>
              {booking && (
                <p className="text-sm font-medium text-blue-600">
                  {booking.date} à {booking.startTime}
                </p>
              )}
              {appointmentId && (
                <p className="text-xs text-gray-400 font-mono">
                  Réf: {appointmentId}
                </p>
              )}
            </div>
            <Button
              variant="outline"
              onClick={() => (window.location.href = "/")}
            >
              Retour à l&apos;accueil
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
