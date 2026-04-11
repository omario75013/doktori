"use client";

import { use, useState, useEffect } from "react";
import { AvailabilityCalendar } from "@/components/availability-calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Clock, ArrowLeft } from "lucide-react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

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

  const [step, setStep] = useState<Step>("slots");
  const [types, setTypes] = useState<AppointmentType[]>([]);
  const [selectedType, setSelectedType] = useState<AppointmentType | null>(null);
  const [booking, setBooking] = useState<BookingState | null>(null);
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [reason, setReason] = useState("");
  const [forSelf, setForSelf] = useState(true);
  const [beneficiaryName, setBeneficiaryName] = useState("");
  const [beneficiaryDob, setBeneficiaryDob] = useState("");
  const [beneficiaryRelation, setBeneficiaryRelation] = useState<"child" | "parent" | "spouse" | "other">("child");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [appointmentId, setAppointmentId] = useState<string | null>(null);
  const [payingNow, setPayingNow] = useState(false);

  useEffect(() => {
    fetch(`/api/doctors/by-slug/${slug}`)
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
          beneficiaryName: forSelf ? undefined : beneficiaryName.trim() || undefined,
          beneficiaryDateOfBirth: forSelf ? undefined : beneficiaryDob || undefined,
          beneficiaryRelation: forSelf ? "self" : beneficiaryRelation,
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
      setFormError(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setSubmitting(false);
    }
  }

  if (doctorLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F0FDFA]/40">
        <p className="text-[#134E4A]/40 text-sm">Chargement...</p>
      </div>
    );
  }

  if (doctorError || !doctor) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F0FDFA]/40">
        <div className="text-center space-y-3">
          <p className="text-[#134E4A]">Médecin introuvable.</p>
          <Button onClick={() => (window.location.href = "/")}>
            Retour à l&apos;accueil
          </Button>
        </div>
      </div>
    );
  }

  const slotDurationMin = selectedType?.durationMinutes ?? 20;

  return (
    <div className="min-h-screen bg-[#F0FDFA]/40 px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Doctor summary card */}
        <div className="rounded-3xl border border-[#E6F4F1] bg-white shadow-sm p-5 flex items-center gap-4">
          {doctor.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={doctor.photoUrl}
              alt={doctor.name}
              className="w-16 h-16 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-[#F0FDFA] flex items-center justify-center flex-shrink-0 text-[#0891B2] font-black text-xl">
              {doctor.name.charAt(0)}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="font-heading font-black text-[#134E4A]">{doctor.name}</h1>
            <p className="text-sm text-[#0E7490]">{doctor.specialty}</p>
            <p className="text-xs text-[#134E4A]/50">{doctor.city}</p>
            {doctor.consultationFee != null && (
              <p className="text-sm text-[#0891B2] font-bold mt-0.5">
                {(doctor.consultationFee / 1000).toFixed(0)} DT
              </p>
            )}
          </div>
        </div>

        {/* Sticky summary chip when slot is picked */}
        {(step === "form" || step === "payment") && booking && (
          <div className="rounded-2xl bg-[#0891B2] text-white shadow-md px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-9 w-9 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0">
                <Calendar className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-white/80 font-semibold uppercase tracking-wider">
                  Votre rendez-vous
                </p>
                <p className="text-sm font-bold truncate">
                  {format(parseISO(booking.date), "EEEE d MMMM", { locale: fr })} à{" "}
                  {booking.startTime}
                  <span className="text-white/70 font-normal"> · {slotDurationMin} min</span>
                </p>
              </div>
            </div>
            {step === "form" && (
              <button
                type="button"
                onClick={() => setStep("slots")}
                className="text-xs font-bold text-white/90 hover:text-white underline underline-offset-2 flex-shrink-0"
              >
                Changer
              </button>
            )}
          </div>
        )}

        {/* Step: appointment type selection */}
        {step === "type" && types.length > 0 && (
          <div className="rounded-3xl border border-[#E6F4F1] bg-white shadow-sm p-5 space-y-4">
            <div>
              <h2 className="font-heading font-black text-[#134E4A]">
                Motif de consultation
              </h2>
              <p className="text-sm text-[#134E4A]/60 mt-1">
                Sélectionnez le type de consultation. La durée et le tarif s&apos;adaptent
                automatiquement.
              </p>
            </div>
            <div className="space-y-2">
              {types.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setSelectedType(t);
                    setStep("slots");
                  }}
                  className="w-full flex items-center justify-between gap-3 rounded-2xl border border-[#E6F4F1] bg-white px-4 py-3 text-left hover:border-[#0891B2] hover:bg-[#F0FDFA]/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="h-3 w-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: t.color }}
                      aria-hidden
                    />
                    <div>
                      <div className="font-bold text-[#134E4A]">{t.name}</div>
                      <div className="text-xs text-[#134E4A]/50 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {t.durationMinutes} min
                      </div>
                    </div>
                  </div>
                  {t.fee != null && (
                    <div className="text-sm font-bold text-[#0891B2]">
                      {(t.fee / 1000).toFixed(0)} DT
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step: slot selection (Doctolib-style calendar) */}
        {step === "slots" && (
          <div className="rounded-3xl border border-[#E6F4F1] bg-white shadow-sm p-5 sm:p-6 space-y-5">
            {selectedType && (
              <div className="flex items-center justify-between text-sm pb-3 border-b border-[#E6F4F1]">
                <span className="text-[#134E4A]/60 flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: selectedType.color }}
                  />
                  <span className="font-bold text-[#134E4A]">{selectedType.name}</span>
                  <span className="text-[#134E4A]/40">·</span>
                  <span className="text-[#134E4A]/60">
                    {selectedType.durationMinutes} min
                  </span>
                </span>
                <button
                  onClick={() => setStep("type")}
                  className="text-[#0891B2] font-bold hover:underline"
                >
                  Changer
                </button>
              </div>
            )}
            <h2 className="font-heading font-black text-[#134E4A] text-lg">
              Choisir un créneau
            </h2>
            <AvailabilityCalendar
              doctorSlug={doctor.slug}
              typeId={selectedType?.id}
              onSelect={handleSlotSelect}
              selected={booking}
            />
          </div>
        )}

        {/* Step: patient info form */}
        {step === "form" && booking && (
          <div className="rounded-3xl border border-[#E6F4F1] bg-white shadow-sm p-5 sm:p-6 space-y-5">
            <button
              type="button"
              onClick={() => setStep("slots")}
              className="inline-flex items-center gap-1.5 text-sm font-bold text-[#0891B2] hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Changer de créneau
            </button>

            <h2 className="font-heading font-black text-[#134E4A]">
              Vos informations
            </h2>

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

              <div className="space-y-2 rounded-2xl border border-[#E6F4F1] bg-[#F0FDFA]/40 p-4">
                <div className="text-sm font-bold text-[#134E4A]">Pour qui est ce rendez-vous ?</div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setForSelf(true)}
                    className={`rounded-xl border-2 px-3 py-2 text-sm font-semibold transition ${
                      forSelf
                        ? "border-[#0891B2] bg-white text-[#0891B2]"
                        : "border-[#E6F4F1] bg-white text-[#134E4A]/70"
                    }`}
                  >
                    Pour moi
                  </button>
                  <button
                    type="button"
                    onClick={() => setForSelf(false)}
                    className={`rounded-xl border-2 px-3 py-2 text-sm font-semibold transition ${
                      !forSelf
                        ? "border-[#0891B2] bg-white text-[#0891B2]"
                        : "border-[#E6F4F1] bg-white text-[#134E4A]/70"
                    }`}
                  >
                    Pour un proche
                  </button>
                </div>

                {!forSelf && (
                  <div className="space-y-3 pt-1">
                    <div className="space-y-1.5">
                      <Label htmlFor="b-name">Nom du bénéficiaire</Label>
                      <Input
                        id="b-name"
                        placeholder="Nom complet"
                        value={beneficiaryName}
                        onChange={(e) => setBeneficiaryName(e.target.value)}
                        required={!forSelf}
                        minLength={2}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="b-dob">Date de naissance</Label>
                        <Input
                          id="b-dob"
                          type="date"
                          value={beneficiaryDob}
                          onChange={(e) => setBeneficiaryDob(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="b-relation">Lien</Label>
                        <select
                          id="b-relation"
                          value={beneficiaryRelation}
                          onChange={(e) =>
                            setBeneficiaryRelation(
                              e.target.value as "child" | "parent" | "spouse" | "other",
                            )
                          }
                          className="w-full rounded-md border border-[#E6F4F1] bg-white px-3 py-2 text-sm text-[#134E4A]"
                        >
                          <option value="child">Enfant</option>
                          <option value="parent">Parent</option>
                          <option value="spouse">Conjoint(e)</option>
                          <option value="other">Autre</option>
                        </select>
                      </div>
                    </div>
                    <p className="text-xs text-[#134E4A]/60">
                      Votre numéro reste le point de contact pour les rappels SMS.
                    </p>
                  </div>
                )}
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

              <Button type="submit" disabled={submitting} className="w-full">
                {submitting
                  ? "Réservation en cours..."
                  : "Confirmer le rendez-vous"}
              </Button>
            </form>
          </div>
        )}

        {/* Step: optional payment prompt */}
        {step === "payment" && (
          <div className="rounded-3xl border border-[#E6F4F1] bg-white shadow-sm p-8 text-center space-y-4">
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
              <h2 className="font-heading font-black text-[#134E4A]">
                Rendez-vous réservé !
              </h2>
              <p className="text-sm text-[#134E4A]/60 mb-4">
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
                className="w-full bg-[#0891B2] hover:bg-[#0E7490]"
              >
                {payingNow ? "Redirection..." : "Payer maintenant (sécurisé)"}
              </Button>
              <button
                onClick={() => setStep("success")}
                className="w-full text-sm text-[#134E4A]/60 hover:underline py-2"
              >
                Payer sur place
              </button>
            </div>
          </div>
        )}

        {/* Step: success confirmation */}
        {step === "success" && (
          <div className="rounded-3xl border border-[#E6F4F1] bg-white shadow-sm p-8 text-center space-y-4">
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
              <h2 className="text-lg font-heading font-black text-[#134E4A]">
                Rendez-vous confirmé !
              </h2>
              <p className="text-sm text-[#134E4A]/60">
                Votre rendez-vous avec {doctor.name} a été enregistré avec succès.
              </p>
              {booking && (
                <p className="text-sm font-bold text-[#0891B2]">
                  {format(parseISO(booking.date), "EEEE d MMMM", { locale: fr })} à{" "}
                  {booking.startTime}
                </p>
              )}
              {appointmentId && (
                <p className="text-xs text-[#134E4A]/40 font-mono">
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
