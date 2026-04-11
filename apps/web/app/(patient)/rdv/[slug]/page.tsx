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

type Step = "type" | "slots" | "form" | "payment" | "success";

interface BookingState {
  date: string;
  startTime: string;
}

interface AppointmentType {
  id: string;
  name: string;
  durationMinutes: number;
  fee: number | null;
  color: string;
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
      .then(async (d) => {
        setDoctor(d);
        const typesRes = await fetch(`/api/appointment-types?doctorId=${d.id}`);
        if (typesRes.ok) {
          const list = (await typesRes.json()) as AppointmentType[];
          setTypes(list);
          if (list.length > 0) setStep("type");
        }
        setDoctorLoading(false);
      })
      .catch(() => {
        setDoctorError(true);
        setDoctorLoading(false);
      });
  }, [slug]);

  const [step, setStep] = useState<Step>("slots");
  const [types, setTypes] = useState<AppointmentType[]>([]);
  const [selectedType, setSelectedType] = useState<AppointmentType | null>(null);
  const [booking, setBooking] = useState<BookingState | null>(null);
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [appointmentId, setAppointmentId] = useState<string | null>(null);
  const [payingNow, setPayingNow] = useState(false);

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
          appointmentTypeId: selectedType?.id,
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
      setStep("payment");
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

        {/* Step: appointment type selection */}
        {step === "type" && types.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="font-semibold text-gray-800">Motif de consultation</h2>
            <p className="text-sm text-gray-500">Sélectionnez le type de consultation. La durée et le tarif s&apos;adaptent automatiquement.</p>
            <div className="space-y-2">
              {types.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setSelectedType(t);
                    setStep("slots");
                  }}
                  className="w-full flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-left hover:border-blue-400 hover:bg-blue-50/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="h-3 w-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: t.color }}
                      aria-hidden
                    />
                    <div>
                      <div className="font-medium text-gray-900">{t.name}</div>
                      <div className="text-xs text-gray-500">{t.durationMinutes} min</div>
                    </div>
                  </div>
                  {t.fee != null && (
                    <div className="text-sm font-semibold text-blue-600">
                      {(t.fee / 1000).toFixed(0)} DT
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step: slot selection */}
        {step === "slots" && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            {selectedType && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">
                  <span className="font-medium text-gray-800">{selectedType.name}</span> · {selectedType.durationMinutes} min
                </span>
                <button
                  onClick={() => setStep("type")}
                  className="text-blue-600 hover:underline"
                >
                  Changer
                </button>
              </div>
            )}
            <h2 className="font-semibold text-gray-800">Choisir un créneau</h2>
            <SlotPicker doctorId={doctor.id} typeId={selectedType?.id} onSelect={handleSlotSelect} />
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

        {/* Step: optional payment prompt */}
        {step === "payment" && (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="space-y-1">
              <h2 className="font-semibold text-gray-900">Rendez-vous réservé !</h2>
              <p className="text-sm text-gray-500 mb-4">
                Voulez-vous payer votre consultation maintenant pour garantir votre place ?
              </p>
            </div>
            <div className="space-y-2">
              <Button
                disabled={payingNow}
                onClick={async () => {
                  setPayingNow(true);
                  try {
                    const res = await fetch("/api/payments/appointment", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ appointmentId }),
                    });
                    if (res.ok) {
                      const data = await res.json();
                      window.location.href = data.paymentUrl;
                    } else {
                      setStep("success");
                    }
                  } catch {
                    setStep("success");
                  } finally {
                    setPayingNow(false);
                  }
                }}
                className="w-full bg-blue-600"
              >
                {payingNow ? "Redirection..." : "Payer maintenant (sécurisé)"}
              </Button>
              <button
                onClick={() => setStep("success")}
                className="w-full text-sm text-gray-500 hover:underline py-2"
              >
                Payer sur place
              </button>
            </div>
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
