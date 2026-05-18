"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PhoneInput } from "@/components/ui/phone-input";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  MapPin,
  Phone,
  Sun,
  Sunset,
  Moon,
  Calendar,
  User,
  ClipboardEdit,
  Check,
} from "lucide-react";

interface Props {
  clinic: {
    slug: string;
    name: string;
    cityLabel: string;
    address: string;
    phone: string;
  };
}

type TimeRange = "morning" | "afternoon" | "evening" | "any";

const TIME_OPTIONS: { value: TimeRange; label: string; icon: React.ReactNode; hint: string }[] = [
  { value: "morning", label: "Matin", icon: <Sun className="h-4 w-4" />, hint: "08h – 12h" },
  { value: "afternoon", label: "Après-midi", icon: <Sunset className="h-4 w-4" />, hint: "12h – 17h" },
  { value: "evening", label: "Soir", icon: <Moon className="h-4 w-4" />, hint: "17h – 20h" },
  { value: "any", label: "Peu importe", icon: <Calendar className="h-4 w-4" />, hint: "Toute heure" },
];

function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}

type Step = 1 | 2 | 3 | 4;
const STEP_LABELS = ["Date", "Plage horaire", "Coordonnées", "Récapitulatif"];

export default function DemandeRdvClient({ clinic }: Props) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const horizon = new Date(today.getTime() + 30 * 86400000);

  const [step, setStep] = useState<Step>(1);

  const [availableDates, setAvailableDates] = useState<Set<string>>(new Set());
  const [loadingDays, setLoadingDays] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [cin, setCin] = useState("");
  const [motif, setMotif] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoadingDays(true);
    fetch(
      `/api/clinics/${clinic.slug}/available-days?from=${ymd(today)}&to=${ymd(horizon)}`,
    )
      .then((r) => r.json())
      .then((data) => setAvailableDates(new Set((data.availableDates as string[]) ?? [])))
      .catch(() => setAvailableDates(new Set()))
      .finally(() => setLoadingDays(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinic.slug]);

  async function handleSubmit() {
    setError(null);
    if (!selectedDate || !timeRange) {
      setError("Date et plage horaire requises.");
      return;
    }
    if (!name.trim() || !phone.trim()) {
      setError("Nom et téléphone requis.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/clinics/${clinic.slug}/rdv-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim() || null,
          cin: cin.trim() || null,
          motif: motif.trim() || null,
          specialty: specialty.trim() || null,
          preferredDate: selectedDate,
          preferredTimeRange: timeRange,
          notes: notes.trim() || null,
        }),
      });
      if (res.ok) {
        setSuccess(true);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Erreur lors de l'envoi.");
      }
    } catch {
      setError("Erreur réseau.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Success ────────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen bg-[#F8FFFE] flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl bg-white border border-border p-8 text-center">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-500" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">Demande envoyée</h1>
          <p className="text-sm text-muted-foreground mb-6">
            La clinique <strong>{clinic.name}</strong> a bien reçu votre demande
            pour le{" "}
            <strong>
              {new Date(selectedDate!).toLocaleDateString("fr-FR", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </strong>
            . Elle vous contactera prochainement au <strong>{phone}</strong>{" "}
            pour confirmer le médecin et l&apos;heure.
          </p>
          <Link
            href={`/centre-medical/${clinic.slug}`}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary text-white px-4 py-2.5 text-sm font-semibold hover:bg-doktori-teal-dark"
          >
            Retour à la clinique
          </Link>
        </div>
      </div>
    );
  }

  // ── Day grid (used by step 1) ─────────────────────────────────────────
  const days: { date: Date; iso: string; isAvailable: boolean }[] = [];
  const cursor = new Date(today);
  while (cursor <= horizon) {
    const iso = ymd(cursor);
    days.push({
      date: new Date(cursor),
      iso,
      isAvailable: availableDates.has(iso),
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  // Validation per step → controls "Suivant" enable
  const canNext: Record<Step, boolean> = {
    1: !!selectedDate,
    2: !!timeRange,
    3: name.trim().length > 0 && phone.trim().length > 0,
    4: true,
  };

  function goNext() {
    if (step < 4) setStep((step + 1) as Step);
  }
  function goPrev() {
    if (step > 1) setStep((step - 1) as Step);
  }

  return (
    <div className="min-h-screen bg-[#F8FFFE]">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Link
          href={`/centre-medical/${clinic.slug}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Retour à la clinique
        </Link>

        <div className="flex items-start gap-4 mb-6">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Building2 className="h-6 w-6" strokeWidth={2} />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-black text-foreground">
              Demander un RDV — {clinic.name}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Indiquez votre disponibilité, la clinique choisit le médecin et
              vous rappelle.
            </p>
            <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {clinic.address}, {clinic.cityLabel}
              </span>
              <a
                href={`tel:${clinic.phone}`}
                className="inline-flex items-center gap-1 hover:text-primary"
              >
                <Phone className="h-3.5 w-3.5" />
                {clinic.phone}
              </a>
            </div>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-between mb-6 gap-2">
          {STEP_LABELS.map((label, i) => {
            const idx = i + 1;
            const done = idx < step;
            const current = idx === step;
            return (
              <div key={label} className="flex-1 flex items-center gap-2">
                <div
                  className={[
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold border-2",
                    done
                      ? "bg-primary border-primary text-white"
                      : current
                        ? "bg-white border-primary text-primary"
                        : "bg-white border-border text-muted-foreground",
                  ].join(" ")}
                >
                  {done ? <Check className="h-3.5 w-3.5" /> : idx}
                </div>
                <span
                  className={`hidden sm:inline text-xs font-semibold ${
                    current ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {label}
                </span>
                {idx < STEP_LABELS.length && (
                  <div
                    className={`flex-1 h-0.5 ${
                      done ? "bg-primary" : "bg-border"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* ───── Step 1: Date ───── */}
        {step === 1 && (
          <section className="rounded-2xl bg-white border border-border p-5 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <CalendarDays className="h-4 w-4 text-primary" />
              <h2 className="font-bold text-foreground">Choisissez une date</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Seules les dates où au moins un médecin de la clinique a des
              créneaux libres sont sélectionnables.
            </p>
            {loadingDays ? (
              <p className="text-sm text-muted-foreground">
                Chargement des disponibilités…
              </p>
            ) : (
              <div className="grid grid-cols-7 gap-1.5">
                {days.map(({ date, iso, isAvailable }) => {
                  const isSelected = selectedDate === iso;
                  return (
                    <button
                      key={iso}
                      type="button"
                      disabled={!isAvailable}
                      onClick={() => setSelectedDate(iso)}
                      className={[
                        "rounded-lg border text-center py-2 px-1 transition-colors",
                        isAvailable
                          ? isSelected
                            ? "bg-primary text-white border-primary"
                            : "bg-white text-foreground border-border hover:border-primary hover:bg-primary/5"
                          : "bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed",
                      ].join(" ")}
                    >
                      <div className="text-[10px] uppercase">
                        {date.toLocaleDateString("fr-FR", { weekday: "short" })}
                      </div>
                      <div className="font-bold text-sm">{date.getDate()}</div>
                      <div className="text-[10px]">
                        {date.toLocaleDateString("fr-FR", { month: "short" })}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ───── Step 2: Time range ───── */}
        {step === 2 && (
          <section className="rounded-2xl bg-white border border-border p-5 mb-4">
            <h2 className="font-bold text-foreground mb-3">
              Plage horaire préférée
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {TIME_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTimeRange(opt.value)}
                  className={[
                    "rounded-xl border p-3 text-left transition-colors",
                    timeRange === opt.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40",
                  ].join(" ")}
                >
                  <div className="flex items-center gap-2 mb-1 text-primary">
                    {opt.icon}
                    <span className="font-semibold text-sm text-foreground">
                      {opt.label}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">{opt.hint}</div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ───── Step 3: Coordinates + (optional) motif ───── */}
        {step === 3 && (
          <section className="rounded-2xl bg-white border border-border p-5 mb-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <User className="h-4 w-4 text-primary" />
              <h2 className="font-bold text-foreground">Vos coordonnées</h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-semibold text-foreground block mb-1">
                  Nom complet *
                </span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full h-11 px-3 rounded-xl border border-border bg-white text-sm focus:border-primary focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-foreground block mb-1">
                  Téléphone *
                </span>
                <PhoneInput
                  value={phone}
                  onChange={setPhone}
                  required
                  autoComplete="tel"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-foreground block mb-1">
                  Email (optionnel)
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-border bg-white text-sm focus:border-primary focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-foreground block mb-1">
                  CIN (optionnel)
                </span>
                <input
                  type="text"
                  value={cin}
                  onChange={(e) => setCin(e.target.value.replace(/\D/g, "").slice(0, 8))}
                  placeholder="12345678"
                  inputMode="numeric"
                  pattern="\d{8}"
                  maxLength={8}
                  className="w-full h-11 px-3 rounded-xl border border-border bg-white text-sm focus:border-primary focus:outline-none"
                />
              </label>
            </div>

            <div className="border-t border-border pt-3">
              <div className="flex items-center gap-2 mb-2">
                <ClipboardEdit className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">
                  Motif (optionnel)
                </h3>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs font-semibold text-foreground block mb-1">
                    Motif de consultation
                  </span>
                  <input
                    type="text"
                    value={motif}
                    onChange={(e) => setMotif(e.target.value)}
                    placeholder="Ex. Douleur dorsale"
                    className="w-full h-11 px-3 rounded-xl border border-border bg-white text-sm focus:border-primary focus:outline-none"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-foreground block mb-1">
                    Spécialité souhaitée
                  </span>
                  <input
                    type="text"
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                    placeholder="Ex. Cardiologie"
                    className="w-full h-11 px-3 rounded-xl border border-border bg-white text-sm focus:border-primary focus:outline-none"
                  />
                </label>
              </div>
              <label className="block mt-3">
                <span className="text-xs font-semibold text-foreground block mb-1">
                  Notes complémentaires
                </span>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-white text-sm focus:border-primary focus:outline-none"
                />
              </label>
            </div>
          </section>
        )}

        {/* ───── Step 4: Recap ───── */}
        {step === 4 && (
          <section className="rounded-2xl bg-white border border-border p-5 mb-4 space-y-3">
            <h2 className="font-bold text-foreground mb-3">Récapitulatif</h2>
            <dl className="text-sm divide-y divide-border">
              <div className="flex justify-between py-2">
                <dt className="text-muted-foreground">Clinique</dt>
                <dd className="font-semibold text-foreground">{clinic.name}</dd>
              </div>
              <div className="flex justify-between py-2">
                <dt className="text-muted-foreground">Date</dt>
                <dd className="font-semibold text-foreground">
                  {selectedDate &&
                    new Date(selectedDate).toLocaleDateString("fr-FR", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })}
                </dd>
              </div>
              <div className="flex justify-between py-2">
                <dt className="text-muted-foreground">Plage horaire</dt>
                <dd className="font-semibold text-foreground">
                  {timeRange && TIME_OPTIONS.find((o) => o.value === timeRange)?.label}
                </dd>
              </div>
              <div className="flex justify-between py-2">
                <dt className="text-muted-foreground">Nom</dt>
                <dd className="font-semibold text-foreground">{name}</dd>
              </div>
              <div className="flex justify-between py-2">
                <dt className="text-muted-foreground">Téléphone</dt>
                <dd className="font-semibold text-foreground">{phone}</dd>
              </div>
              {email && (
                <div className="flex justify-between py-2">
                  <dt className="text-muted-foreground">Email</dt>
                  <dd className="font-semibold text-foreground">{email}</dd>
                </div>
              )}
              {cin && (
                <div className="flex justify-between py-2">
                  <dt className="text-muted-foreground">CIN</dt>
                  <dd className="font-semibold text-foreground">{cin}</dd>
                </div>
              )}
              {specialty && (
                <div className="flex justify-between py-2">
                  <dt className="text-muted-foreground">Spécialité</dt>
                  <dd className="font-semibold text-foreground">{specialty}</dd>
                </div>
              )}
              {motif && (
                <div className="flex justify-between py-2">
                  <dt className="text-muted-foreground">Motif</dt>
                  <dd className="font-semibold text-foreground text-right max-w-[60%]">
                    {motif}
                  </dd>
                </div>
              )}
              {notes && (
                <div className="py-2">
                  <dt className="text-muted-foreground mb-1">Notes</dt>
                  <dd className="text-foreground">{notes}</dd>
                </div>
              )}
            </dl>
            <p className="text-xs text-muted-foreground border-t border-border pt-3">
              En envoyant cette demande, vous acceptez d&apos;être contacté(e)
              par la clinique pour confirmer le médecin et l&apos;heure exacte.
            </p>
          </section>
        )}

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 text-sm mb-3">
            {error}
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={goPrev}
            disabled={step === 1}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-border text-sm font-semibold text-foreground hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="h-4 w-4" /> Précédent
          </button>
          {step < 4 ? (
            <button
              type="button"
              onClick={goNext}
              disabled={!canNext[step]}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-doktori-teal-dark disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Suivant <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-doktori-teal-dark disabled:opacity-50"
            >
              {submitting ? "Envoi…" : "Envoyer ma demande"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
