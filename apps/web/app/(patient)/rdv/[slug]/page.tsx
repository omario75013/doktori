"use client";

import { use, useState, useEffect, useRef } from "react";
import { AvailabilityCalendar } from "@/components/availability-calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Clock, ArrowLeft, MapPin, Video, Building, Building2, CheckCircle2, Download, ArrowRight, Home, Check } from "lucide-react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";

// Maps booking Step to visual step index (0-based)
function getVisualStep(step: Step): number {
  if (step === "mode" || step === "type" || step === "practice" || step === "slots" || step === "questionnaire") return 0;
  if (step === "form") return 1;
  return 2; // payment | success
}

const BOOKING_STEPS = [
  { label: "Choisir le créneau" },
  { label: "Vos informations" },
  { label: "Confirmation" },
];

function BookingStepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-center gap-0 px-4 py-3">
      {BOOKING_STEPS.map((s, i) => {
        const isCompleted = i < currentStep;
        const isActive = i === currentStep;
        return (
          <div key={s.label} className="flex items-center">
            {/* Circle */}
            <div className="flex flex-col items-center gap-1.5">
              <motion.div
                animate={
                  isCompleted
                    ? { backgroundColor: "#16a34a", borderColor: "#16a34a", scale: 1 }
                    : isActive
                    ? { backgroundColor: "#0891B2", borderColor: "#0891B2", scale: 1.1 }
                    : { backgroundColor: "#ffffff", borderColor: "#cbd5e1", scale: 1 }
                }
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="w-8 h-8 rounded-full border-2 flex items-center justify-center"
                style={{ borderColor: "#cbd5e1" }}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4 text-white" strokeWidth={2.5} />
                ) : (
                  <span
                    className={`text-xs font-bold ${isActive ? "text-white" : "text-slate-400"}`}
                  >
                    {i + 1}
                  </span>
                )}
              </motion.div>
              <span
                className={`text-[10px] font-semibold whitespace-nowrap ${
                  isActive
                    ? "text-primary"
                    : isCompleted
                    ? "text-green-600"
                    : "text-slate-400"
                }`}
              >
                {s.label}
              </span>
            </div>
            {/* Connector line */}
            {i < BOOKING_STEPS.length - 1 && (
              <div className="w-12 sm:w-20 h-0.5 mb-5 mx-1">
                <motion.div
                  className="h-full rounded-full"
                  animate={{ backgroundColor: i < currentStep ? "#16a34a" : "#e2e8f0" }}
                  transition={{ duration: 0.4 }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Slide animation variants for step transitions
const slideVariants = {
  enter: { x: 48, opacity: 0 },
  center: { x: 0, opacity: 1 },
  exit: { x: -48, opacity: 0 },
};

const slideTransition = { duration: 0.28, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] };

function generateICS(doctorName: string, date: Date, duration: number): string {
  const end = new Date(date.getTime() + duration * 60000);
  const fmt = (d: Date) =>
    d.toISOString().replace(/[-:]/g, "").replace(".000", "");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Doktori//RDV//FR",
    "BEGIN:VEVENT",
    `DTSTART:${fmt(date)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:RDV Dr. ${doctorName}`,
    "DESCRIPTION:Rendez-vous médical via Doktori",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

function downloadICS(doctorName: string, date: Date, duration: number) {
  const ics = generateICS(doctorName, date, duration);
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `rdv-doktori-${doctorName.replace(/\s+/g, "-").toLowerCase()}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

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
  consultationMode?: string; // 'cabinet' | 'teleconsult' | 'both'
  teleconsultFee?: number | null;
}

type Step = "mode" | "type" | "practice" | "slots" | "questionnaire" | "form" | "payment" | "success";

interface Question {
  id: string;
  label: string;
  kind: "text" | "choice" | "file" | "yesno";
  choices: string[] | null;
  required: boolean;
  displayOrder: number;
}

interface Practice {
  id: string;
  name: string;
  address: string;
  city: string;
  phone: string | null;
  isPrimary: boolean;
  clinicId: string | null;
  clinicName: string | null;
}

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
  mode?: string;
  practiceIds?: string[];
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
  // 'cabinet' | 'teleconsult' — only relevant when doctor.consultationMode === 'both'
  const [selectedMode, setSelectedMode] = useState<"cabinet" | "teleconsult" | null>(null);
  const [types, setTypes] = useState<AppointmentType[]>([]);
  const [selectedType, setSelectedType] = useState<AppointmentType | null>(null);
  const [practices, setPractices] = useState<Practice[]>([]);
  const [selectedPractice, setSelectedPractice] = useState<Practice | null>(null);
  const [booking, setBooking] = useState<BookingState | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionnaireAnswers, setQuestionnaireAnswers] = useState<Record<string, string>>({});
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [reason, setReason] = useState("");
  const [forSelf, setForSelf] = useState(true);
  const [beneficiaryName, setBeneficiaryName] = useState("");
  const [beneficiaryDob, setBeneficiaryDob] = useState("");
  const [beneficiaryRelation, setBeneficiaryRelation] = useState<"child" | "parent" | "spouse" | "other">("child");
  const [fileUploads, setFileUploads] = useState<Map<string, File>>(new Map());
  const [submitting, setSubmitting] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [questionError, setQuestionError] = useState<string | null>(null);
  const [appointmentId, setAppointmentId] = useState<string | null>(null);
  const [payingNow, setPayingNow] = useState(false);

  // Pre-fill patient info from stored JWT if the patient is already logged in
  useEffect(() => {
    const token = localStorage.getItem("doktori_patient_token");
    if (!token) return;
    try {
      const payload = JSON.parse(atob(token.split(".")[1]!));
      if (payload.name) setPatientName(payload.name);
      if (payload.phone) setPatientPhone(payload.phone);
    } catch {
      // malformed token — ignore
    }
  }, []);

  useEffect(() => {
    fetch(`/api/doctors/by-slug/${slug}`)
      .then((r) => {
        if (!r.ok) throw new Error("not found");
        return r.json() as Promise<Doctor>;
      })
      .then(async (d) => {
        setDoctor(d);
        // Auto-set mode for teleconsult-only doctors
        if (d.consultationMode === "teleconsult") {
          setSelectedMode("teleconsult");
        }
        // Fetch appointment types and practices in parallel
        const [typesRes, practicesRes] = await Promise.all([
          fetch(`/api/appointment-types?doctorId=${d.id}`),
          fetch(`/api/doctors/${d.id}/practices`),
        ]);
        let startStep: Step = "slots";
        if (typesRes.ok) {
          const list = (await typesRes.json()) as AppointmentType[];
          setTypes(list);
          if (list.length > 0) startStep = "type";
        }
        if (practicesRes.ok) {
          const pList = (await practicesRes.json()) as Practice[];
          setPractices(pList);
          // Auto-select if only one practice
          if (pList.length === 1) {
            setSelectedPractice(pList[0]);
          }
        }
        // If doctor offers both modes, show mode selection first
        if (d.consultationMode === "both") {
          startStep = "mode";
        }
        setStep(startStep);
        setDoctorLoading(false);
      })
      .catch(() => {
        setDoctorError(true);
        setDoctorLoading(false);
      });
  }, [slug]);

  async function handleSlotSelect(date: string, startTime: string) {
    setBooking({ date, startTime });

    // Fetch questions for the selected type (if any)
    if (selectedType) {
      try {
        const res = await fetch(`/api/appointment-types/questions-public?typeId=${selectedType.id}`);
        if (res.ok) {
          const qs = (await res.json()) as Question[];
          if (qs.length > 0) {
            setQuestions(qs);
            setQuestionnaireAnswers({});
            setStep("questionnaire");
            return;
          }
        }
      } catch {
        // ignore — proceed to form step
      }
    }
    setStep("form");
  }

  // After choosing a type, go to practice picker if the motif is offered at >1 practice
  // (and not teleconsult); else auto-select the only option and skip to slots.
  function handleTypeSelected(type: AppointmentType) {
    setSelectedType(type);
    if (selectedMode === "teleconsult" || type.mode === "teleconsult") {
      // Teleconsult: no physical location needed
      setStep("slots");
      return;
    }
    // Filter to practices where THIS motif is offered
    const motifPractices =
      type.practiceIds && type.practiceIds.length > 0
        ? practices.filter((p) => type.practiceIds!.includes(p.id))
        : practices;
    if (motifPractices.length === 0) {
      // Fallback: no cabinet mapped — let the server resolve to primary
      setStep("slots");
    } else if (motifPractices.length === 1) {
      setSelectedPractice(motifPractices[0]);
      setStep("slots");
    } else {
      setStep("practice");
    }
  }

  // After choosing a practice, go to slots
  function handlePracticeSelected(practice: Practice) {
    setSelectedPractice(practice);
    setStep("slots");
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
          practiceId: selectedMode === "teleconsult" ? undefined : selectedPractice?.id,
          type: selectedMode === "teleconsult" ? "teleconsult" : undefined,
          beneficiaryName: forSelf ? undefined : beneficiaryName.trim() || undefined,
          beneficiaryDateOfBirth: forSelf ? undefined : beneficiaryDob || undefined,
          beneficiaryRelation: forSelf ? "self" : beneficiaryRelation,
          questionnaire: Object.keys(questionnaireAnswers).length > 0
            ? questionnaireAnswers
            : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(
          typeof data.error === "string" ? data.error : "Erreur lors de la réservation"
        );
      }

      const data = await res.json();
      const newAppointmentId = data.id as string;
      setAppointmentId(newAppointmentId);

      // Upload queued files if any
      if (fileUploads.size > 0) {
        setSubmitting(false);
        setUploadingFiles(true);
        try {
          await Promise.all(
            Array.from(fileUploads.entries()).map(async ([questionId, file]) => {
              const formData = new FormData();
              formData.append("file", file);
              await fetch(
                `/api/appointments/${newAppointmentId}/answers/${questionId}/upload`,
                { method: "POST", body: formData }
              );
            })
          );
        } catch {
          // Non-blocking: files failed to upload but appointment was created
        } finally {
          setUploadingFiles(false);
        }
      }

      // Teleconsult with mandatory payment: redirect immediately to Flouci
      if (data.paymentRequired && data.paymentUrl) {
        window.location.href = data.paymentUrl as string;
        return;
      }

      setStep("payment");
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setSubmitting(false);
    }
  }

  if (doctorLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary/40">
        <p className="text-foreground/40 text-sm">Chargement...</p>
      </div>
    );
  }

  if (doctorError || !doctor) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary/40">
        <div className="text-center space-y-3">
          <p className="text-foreground">Médecin introuvable.</p>
          <Button onClick={() => (window.location.href = "/")}>
            Retour à l&apos;accueil
          </Button>
        </div>
      </div>
    );
  }

  const slotDurationMin = selectedType?.durationMinutes ?? 20;

  return (
    <div className="min-h-screen bg-secondary/40 px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Doctor summary card */}
        <div className="rounded-3xl border border-border dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm p-5 flex items-center gap-4">
          {doctor.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={doctor.photoUrl}
              alt={doctor.name}
              className="w-16 h-16 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 text-primary font-black text-xl">
              {doctor.name.charAt(0)}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="font-heading font-black text-foreground">{doctor.name}</h1>
            <p className="text-sm text-doktori-teal-dark">{doctor.specialty}</p>
            <p className="text-xs text-foreground/50">{doctor.city}</p>
          </div>
        </div>

        {/* Step indicator — hidden on success */}
        {step !== "success" && (
          <div className="rounded-2xl bg-white dark:bg-gray-900 border border-border dark:border-gray-700 shadow-sm overflow-hidden">
            <BookingStepIndicator currentStep={getVisualStep(step)} />
          </div>
        )}

        {/* Sticky summary chip when slot is picked */}
        {(step === "questionnaire" || step === "form" || step === "payment") && booking && (
          <div className="rounded-2xl bg-primary text-white shadow-md px-4 py-3 flex items-center justify-between gap-3">
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

        {/* Animated step content */}
        <AnimatePresence mode="wait" initial={false}>

        {/* Step: consultation mode selection (only for doctors offering both) */}
        {step === "mode" && doctor.consultationMode === "both" && (
          <motion.div
            key="step-mode"
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={slideTransition}
            className="rounded-3xl border border-border dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm p-5 space-y-4"
          >
            <div>
              <h2 className="font-heading font-black text-foreground">
                Mode de consultation
              </h2>
              <p className="text-sm text-foreground/60 mt-1">
                Choisissez comment vous souhaitez consulter ce médecin.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Au cabinet */}
              <button
                onClick={() => {
                  setSelectedMode("cabinet");
                  if (types.length > 0) {
                    setStep("type");
                  } else if (practices.length > 1) {
                    setStep("practice");
                  } else {
                    setStep("slots");
                  }
                }}
                className="flex flex-col items-center gap-3 rounded-2xl border-2 border-border dark:border-gray-700 bg-white dark:bg-gray-900 p-5 text-center hover:border-primary hover:bg-secondary/40 transition-colors"
              >
                <div className="h-12 w-12 rounded-2xl bg-secondary flex items-center justify-center">
                  <Building className="h-6 w-6 text-primary" strokeWidth={2} />
                </div>
                <div>
                  <div className="font-bold text-foreground">Au cabinet</div>
                  <div className="text-xs text-foreground/60 mt-1">
                    Rendez-vous en présentiel dans le cabinet du médecin.
                  </div>
                </div>
              </button>

              {/* En vidéo */}
              <button
                onClick={() => {
                  setSelectedMode("teleconsult");
                  if (types.length > 0) {
                    setStep("type");
                  } else {
                    setStep("slots");
                  }
                }}
                className="flex flex-col items-center gap-3 rounded-2xl border-2 border-border dark:border-gray-700 bg-white dark:bg-gray-900 p-5 text-center hover:border-purple-400 hover:bg-purple-50/40 transition-colors"
              >
                <div className="h-12 w-12 rounded-2xl bg-purple-100 flex items-center justify-center">
                  <Video className="h-6 w-6 text-purple-600" strokeWidth={2} />
                </div>
                <div>
                  <div className="font-bold text-foreground">En vidéo</div>
                  <div className="text-xs text-foreground/60 mt-1">
                    Consultation à distance par vidéo.
                  </div>
                  {doctor.teleconsultFee != null && (
                    <div className="text-sm font-bold text-purple-700 mt-1.5">
                      {(doctor.teleconsultFee / 1000).toFixed(0)} DT
                    </div>
                  )}
                </div>
              </button>
            </div>
          </motion.div>
        )}

        {/* Step: appointment type selection */}
        {step === "type" && types.length > 0 && (
          <motion.div
            key="step-type"
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={slideTransition}
            className="rounded-3xl border border-border dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm p-5 space-y-4"
          >
            <div>
              <h2 className="font-heading font-black text-foreground">
                Motif de consultation
              </h2>
              <p className="text-sm text-foreground/60 mt-1">
                Sélectionnez le type de consultation. La durée et le tarif s&apos;adaptent
                automatiquement.
              </p>
            </div>
            <div className="space-y-2">
              {types.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleTypeSelected(t)}
                  className="w-full flex items-center justify-between gap-3 rounded-2xl border border-border dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 text-start hover:border-primary hover:bg-secondary/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="h-3 w-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: t.color }}
                      aria-hidden
                    />
                    <div>
                      <div className="font-bold text-foreground">{t.name}</div>
                      <div className="text-xs text-foreground/50 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {t.durationMinutes} min
                      </div>
                    </div>
                  </div>
                  {t.fee != null && selectedMode === "teleconsult" && (
                    <div className="text-sm font-bold text-primary">
                      {(t.fee / 1000).toFixed(0)} DT
                    </div>
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Step: practice picker — only when the SELECTED motif is offered at multiple cabinets.
            If the motif is bound to a single cabinet, the patient is auto-routed in
            handleTypeSelected and this step never renders. */}
        {step === "practice" &&
          (() => {
            const allowed =
              selectedType?.practiceIds && selectedType.practiceIds.length > 0
                ? practices.filter((p) => selectedType.practiceIds!.includes(p.id))
                : practices;
            if (allowed.length <= 1) return null;
            return (
          <motion.div
            key="step-practice"
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={slideTransition}
            className="rounded-3xl border border-border dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm p-5 space-y-4"
          >
            <div>
              <h2 className="font-heading font-black text-foreground">
                Où souhaitez-vous consulter ?
              </h2>
              <p className="text-sm text-foreground/60 mt-1">
                Ce motif est proposé dans plusieurs cabinets. Choisissez l&apos;endroit qui vous
                convient.
              </p>
            </div>
            <div className="space-y-2">
              {allowed.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handlePracticeSelected(p)}
                  className={`w-full flex items-start gap-3 rounded-2xl border-2 bg-white px-4 py-4 text-start transition-colors hover:bg-secondary/40 ${
                    p.clinicId
                      ? "border-primary/30 hover:border-primary"
                      : "border-border hover:border-primary"
                  }`}
                >
                  <div className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    p.clinicId ? "bg-primary/10" : "bg-secondary"
                  }`}>
                    {p.clinicId ? (
                      <Building2 className="h-4 w-4 text-primary" strokeWidth={2} />
                    ) : (
                      <MapPin className="h-4 w-4 text-muted-foreground" strokeWidth={2} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-foreground flex items-center gap-2 flex-wrap">
                      {p.name}
                      {p.isPrimary && (
                        <span className="text-[10px] font-bold text-doktori-green-dark bg-accent/10 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                          Principal
                        </span>
                      )}
                    </div>
                    {p.clinicName && p.clinicName !== p.name && (
                      <div className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                        <Building2 className="h-3 w-3" strokeWidth={2.5} />
                        {p.clinicName}
                      </div>
                    )}
                    <div className="mt-1 text-sm text-foreground/60 truncate">{p.address}</div>
                    <div className="text-xs text-foreground/40">{p.city}</div>
                    {p.phone && (
                      <div className="text-xs text-primary mt-0.5">{p.phone}</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
            {types.length > 0 && (
              <button
                onClick={() => setStep("type")}
                className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline pt-1"
              >
                <ArrowLeft className="h-4 w-4" />
                Changer le motif
              </button>
            )}
          </motion.div>
            );
          })()}

        {/* Step: slot selection (Doctolib-style calendar) */}
        {step === "slots" && (
          <motion.div
            key="step-slots"
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={slideTransition}
            className="rounded-3xl border border-border dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm p-5 sm:p-6 space-y-5"
          >
            {(selectedType || selectedPractice) && (
              <div className="flex flex-col gap-1.5 pb-3 border-b border-border">
                {selectedType && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-foreground/60 flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: selectedType.color }}
                      />
                      <span className="font-bold text-foreground">{selectedType.name}</span>
                      <span className="text-foreground/40">·</span>
                      <span className="text-foreground/60">
                        {selectedType.durationMinutes} min
                      </span>
                    </span>
                    <button
                      onClick={() => setStep("type")}
                      className="text-primary font-bold hover:underline"
                    >
                      Changer
                    </button>
                  </div>
                )}
                {selectedPractice &&
                  (() => {
                    // Only allow the patient to switch cabinet when the motif is offered
                    // at more than one cabinet. For single-cabinet motifs the location
                    // is fixed and the "Changer" affordance disappears.
                    const motifPracticeCount =
                      selectedType?.practiceIds && selectedType.practiceIds.length > 0
                        ? selectedType.practiceIds.length
                        : practices.length;
                    return (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-foreground/60 flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 text-primary/60" />
                          <span className="font-bold text-foreground">
                            {selectedPractice.name}
                          </span>
                          <span className="text-foreground/40">·</span>
                          <span className="text-foreground/60">{selectedPractice.city}</span>
                        </span>
                        {motifPracticeCount > 1 ? (
                          <button
                            onClick={() => setStep("practice")}
                            className="text-primary font-bold hover:underline"
                          >
                            Changer
                          </button>
                        ) : (
                          <span className="text-[11px] text-foreground/40 italic">
                            Cabinet défini par le motif
                          </span>
                        )}
                      </div>
                    );
                  })()}
              </div>
            )}
            <h2 className="font-heading font-black text-foreground text-lg">
              Choisir un créneau
            </h2>
            <AvailabilityCalendar
              doctorSlug={doctor.slug}
              typeId={selectedType?.id}
              practiceId={
                selectedMode === "teleconsult" || selectedType?.mode === "teleconsult"
                  ? undefined
                  : selectedPractice?.id
              }
              onSelect={handleSlotSelect}
              selected={booking}
            />
          </motion.div>
        )}

        {/* Step: questionnaire (shown ONLY if the selected type has questions) */}
        {step === "questionnaire" && booking && questions.length > 0 && (
          <motion.div
            key="step-questionnaire"
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={slideTransition}
            className="rounded-3xl border border-border dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm p-5 sm:p-6 space-y-5"
          >
            <button
              type="button"
              onClick={() => setStep("slots")}
              className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Changer de créneau
            </button>

            <div>
              <h2 className="font-heading font-black text-foreground">
                Quelques questions
              </h2>
              <p className="text-sm text-foreground/60 mt-1">
                Aidez le médecin à préparer votre consultation en répondant aux questions ci-dessous.
              </p>
            </div>

            <div className="space-y-4">
              {questions.map((q) => {
                const value = questionnaireAnswers[q.id] ?? "";
                const setAnswer = (v: string) =>
                  setQuestionnaireAnswers((prev) => ({ ...prev, [q.id]: v }));

                return (
                  <div key={q.id} className="space-y-1.5">
                    <label className="block text-sm font-semibold text-foreground">
                      {q.label}
                      {q.required && (
                        <span className="text-red-500 ms-1" aria-label="obligatoire">*</span>
                      )}
                    </label>

                    {q.kind === "text" && (
                      <textarea
                        value={value}
                        onChange={(e) => setAnswer(e.target.value)}
                        required={q.required}
                        rows={3}
                        placeholder="Votre réponse..."
                        className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                      />
                    )}

                    {q.kind === "yesno" && (
                      <div className="flex gap-3">
                        {(["Oui", "Non"] as const).map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => setAnswer(opt)}
                            className={`flex-1 rounded-xl border-2 py-2 text-sm font-semibold transition ${
                              value === opt
                                ? "border-primary bg-secondary text-primary"
                                : "border-border dark:border-gray-700 bg-white dark:bg-gray-900 text-foreground/70"
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    )}

                    {q.kind === "choice" && q.choices && (
                      <div className="space-y-2">
                        {q.choices.map((choice) => (
                          <button
                            key={choice}
                            type="button"
                            onClick={() => setAnswer(choice)}
                            className={`w-full text-start rounded-xl border-2 px-3 py-2 text-sm font-medium transition ${
                              value === choice
                                ? "border-primary bg-secondary text-primary"
                                : "border-border dark:border-gray-700 bg-white dark:bg-gray-900 text-foreground/70"
                            }`}
                          >
                            {choice}
                          </button>
                        ))}
                      </div>
                    )}

                    {q.kind === "file" && (
                      <div className="space-y-2">
                        <label
                          htmlFor={`file-${q.id}`}
                          className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-5 cursor-pointer transition-colors ${
                            value
                              ? "border-primary bg-secondary"
                              : "border-border bg-white hover:border-primary hover:bg-secondary/40"
                          }`}
                        >
                          {value ? (
                            <>
                              <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                              <span className="text-sm font-semibold text-primary">{value}</span>
                              <span className="text-xs text-foreground/50">
                                {fileUploads.get(q.id)
                                  ? `${(fileUploads.get(q.id)!.size / 1024 / 1024).toFixed(2)} Mo`
                                  : ""}
                              </span>
                              <span className="text-xs text-primary underline underline-offset-2">Changer le fichier</span>
                            </>
                          ) : (
                            <>
                              <svg className="h-6 w-6 text-foreground/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                              </svg>
                              <span className="text-sm font-semibold text-foreground/60">
                                Cliquez pour choisir un fichier
                              </span>
                              <span className="text-xs text-foreground/40">PDF, JPG, PNG · 5 Mo max</span>
                            </>
                          )}
                        </label>
                        <input
                          id={`file-${q.id}`}
                          type="file"
                          accept="image/jpeg,image/png,application/pdf"
                          className="sr-only"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            if (file.size > 5 * 1024 * 1024) {
                              setQuestionError(`Le fichier "${file.name}" dépasse la limite de 5 Mo.`);
                              return;
                            }
                            setFileUploads((prev) => {
                              const next = new Map(prev);
                              next.set(q.id, file);
                              return next;
                            });
                            setAnswer(file.name);
                          }}
                        />
                        <p className="text-xs text-foreground/40">
                          Le fichier sera partagé avec le médecin après confirmation du rendez-vous.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {questionError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {questionError}
              </p>
            )}

            <button
              type="button"
              onClick={() => {
                // Validate required questions
                const missing = questions.filter(
                  (q) =>
                    q.required &&
                    (!questionnaireAnswers[q.id] || questionnaireAnswers[q.id].trim() === "")
                );
                if (missing.length > 0) {
                  setQuestionError(`Veuillez répondre aux questions obligatoires : ${missing.map((q) => q.label).join(", ")}`);
                  return;
                }
                setQuestionError(null);
                setStep("form");
              }}
              className="w-full rounded-xl bg-primary hover:bg-doktori-teal-dark text-white font-bold py-3 text-sm transition-colors"
            >
              Continuer
            </button>
          </motion.div>
        )}

        {/* Step: patient info form */}
        {step === "form" && booking && (
          <motion.div
            key="step-form"
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={slideTransition}
            className="rounded-3xl border border-border dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm p-5 sm:p-6 space-y-5"
          >
            <button
              type="button"
              onClick={() => setStep("slots")}
              className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Changer de créneau
            </button>

            <div className="flex items-center gap-3">
              <h2 className="font-heading font-black text-foreground">
                Vos informations
              </h2>
              {selectedMode === "teleconsult" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-1 text-xs font-bold text-purple-800">
                  <Video className="h-3 w-3" strokeWidth={2.5} />
                  Consultation vidéo
                </span>
              )}
            </div>

            <form id="booking-form" onSubmit={handleSubmit} className="space-y-4">
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

              <div className="space-y-2 rounded-2xl border border-border bg-secondary/40 p-4">
                <div className="text-sm font-bold text-foreground">Pour qui est ce rendez-vous ?</div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setForSelf(true)}
                    className={`rounded-xl border-2 px-3 py-2 text-sm font-semibold transition ${
                      forSelf
                        ? "border-primary bg-white text-primary"
                        : "border-border dark:border-gray-700 bg-white dark:bg-gray-900 text-foreground/70"
                    }`}
                  >
                    Pour moi
                  </button>
                  <button
                    type="button"
                    onClick={() => setForSelf(false)}
                    className={`rounded-xl border-2 px-3 py-2 text-sm font-semibold transition ${
                      !forSelf
                        ? "border-primary bg-white text-primary"
                        : "border-border dark:border-gray-700 bg-white dark:bg-gray-900 text-foreground/70"
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
                          className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-foreground"
                        >
                          <option value="child">Enfant</option>
                          <option value="parent">Parent</option>
                          <option value="spouse">Conjoint(e)</option>
                          <option value="other">Autre</option>
                        </select>
                      </div>
                    </div>
                    <p className="text-xs text-foreground/60">
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

              {/* Hidden on mobile — shown inline on sm+ */}
              <div className="hidden sm:block">
                <Button type="submit" disabled={submitting || uploadingFiles} className="w-full">
                  {uploadingFiles
                    ? "Téléversement des documents..."
                    : submitting
                    ? "Réservation en cours..."
                    : "Confirmer le rendez-vous"}
                </Button>
              </div>
            </form>
          </motion.div>
        )}

        {/* Mobile sticky footer CTA — form step only */}
        {step === "form" && booking && (
          <div className="sm:hidden fixed bottom-0 start-0 end-0 z-50 px-4 pb-safe-area-inset-bottom">
            <div className="pb-4 pt-3 backdrop-blur-md bg-white/80 border-t border-border -mx-4 px-4">
              <Button
                type="submit"
                form="booking-form"
                disabled={submitting || uploadingFiles}
                className="w-full shadow-lg shadow-cyan-100"
              >
                {uploadingFiles
                  ? "Téléversement des documents..."
                  : submitting
                  ? "Réservation en cours..."
                  : "Confirmer le rendez-vous"}
              </Button>
            </div>
          </div>
        )}

        {/* Step: payment prompt (optional for cabinet, mandatory for teleconsult is handled by redirect) */}
        {step === "payment" && (
          <motion.div
            key="step-payment"
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={slideTransition}
            className="rounded-3xl border border-border dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm p-8 text-center space-y-4"
          >
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
              <h2 className="font-heading font-black text-foreground">
                Rendez-vous réservé !
              </h2>
              <p className="text-sm text-foreground/60 mb-4">
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
                      window.location.href = data.paymentUrl as string;
                    } else {
                      setStep("success");
                    }
                  } catch {
                    setStep("success");
                  } finally {
                    setPayingNow(false);
                  }
                }}
                className="w-full bg-primary hover:bg-doktori-teal-dark"
              >
                {payingNow ? "Redirection..." : "Payer maintenant (sécurisé)"}
              </Button>
              <button
                onClick={() => setStep("success")}
                className="w-full text-sm text-foreground/60 hover:underline py-2"
              >
                Payer sur place
              </button>
            </div>
          </motion.div>
        )}

        {/* Step: success confirmation */}
        {step === "success" && booking && (
          <SuccessView
            booking={booking}
            doctor={doctor}
            selectedType={selectedType}
            selectedMode={selectedMode}
            appointmentId={appointmentId}
          />
        )}

        </AnimatePresence>
        {/* bottom padding on mobile to account for sticky CTA */}
        {step === "form" && <div className="sm:hidden h-24" />}
      </div>
    </div>
  );
}

// Separated into its own component so confetti fires once on mount
function SuccessView({
  booking,
  doctor,
  selectedType,
  selectedMode,
  appointmentId,
}: {
  booking: BookingState;
  doctor: Doctor;
  selectedType: AppointmentType | null;
  selectedMode: "cabinet" | "teleconsult" | null;
  appointmentId: string | null;
}) {
  const confettiFired = useRef(false);

  useEffect(() => {
    if (confettiFired.current) return;
    confettiFired.current = true;
    // Fire confetti burst from center
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.55 },
      colors: ["#0891B2", "#06B6D4", "#16a34a", "#4ade80", "#f0fdf4"],
      startVelocity: 40,
      gravity: 0.9,
      scalar: 0.9,
    });
  }, []);

  return (
    <motion.div
      key="step-success"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
            {/* Animated checkmark */}
            <motion.div
              className="flex justify-center"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 280, damping: 18, delay: 0.1 }}
            >
              <div className="w-20 h-20 bg-white rounded-full shadow-lg flex items-center justify-center border border-green-100">
                <CheckCircle2 className="w-11 h-11 text-green-500" strokeWidth={1.5} />
              </div>
            </motion.div>

            {/* SMS confirmation notice */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.3 }}
              className="flex items-center justify-center gap-2 rounded-2xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800 font-medium"
            >
              <svg className="w-4 h-4 shrink-0 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              Vous recevrez un SMS de confirmation dans quelques instants
            </motion.div>

            {/* Main card */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.25 }}
              className="rounded-3xl border border-border dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm overflow-hidden"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-green-50 to-secondary px-7 pt-7 pb-5 text-center border-b border-border">
                <motion.h2
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.45 }}
                  className="text-xl font-heading font-black text-foreground"
                >
                  Rendez-vous confirmé !
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.55 }}
                  className="text-sm text-foreground/60 mt-1"
                >
                  Vous recevrez un SMS de rappel la veille.
                </motion.p>
              </div>

              {/* Details */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.55 }}
                className="px-7 py-5 space-y-4"
              >
                {/* Type badge */}
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 bg-secondary text-doktori-teal-dark text-xs font-bold px-3 py-1.5 rounded-full border border-border">
                    <Calendar className="w-3.5 h-3.5" />
                    {selectedType ? selectedType.name : "Consultation médicale"}
                  </span>
                  {selectedMode === "teleconsult" && (
                    <span className="inline-flex items-center gap-1.5 bg-purple-50 text-purple-700 text-xs font-bold px-3 py-1.5 rounded-full border border-purple-200">
                      <Video className="w-3.5 h-3.5" />
                      Vidéo
                    </span>
                  )}
                </div>

                {/* Doctor + date */}
                <div className="rounded-2xl bg-slate-50 p-4 space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-foreground">
                    <span className="font-semibold text-foreground/50 w-16 shrink-0">Médecin</span>
                    <span className="font-bold">Dr. {doctor.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-foreground">
                    <span className="font-semibold text-foreground/50 w-16 shrink-0">Date</span>
                    <span className="font-bold capitalize">
                      {format(parseISO(booking.date), "EEEE d MMMM yyyy", { locale: fr })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-foreground">
                    <span className="font-semibold text-foreground/50 w-16 shrink-0">Heure</span>
                    <span className="font-bold">{booking.startTime}</span>
                    {selectedType && (
                      <span className="text-foreground/40 text-xs">
                        · {selectedType.durationMinutes} min
                      </span>
                    )}
                  </div>
                </div>

                {/* Teleconsult note */}
                {selectedMode === "teleconsult" && (
                  <div className="flex items-start gap-2 rounded-xl bg-purple-50 px-4 py-3 text-sm text-purple-900 ring-1 ring-purple-200">
                    <Video className="mt-0.5 h-4 w-4 shrink-0 text-purple-600" strokeWidth={2.5} />
                    <p className="font-medium">Vous recevrez un lien vidéo par SMS avant votre consultation.</p>
                  </div>
                )}

                {/* Appointment ref */}
                {appointmentId && (
                  <p className="text-center text-xs text-foreground/30 font-mono">
                    Réf : {appointmentId}
                  </p>
                )}
              </motion.div>

              {/* CTAs */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.75 }}
                className="px-7 pb-7 space-y-3"
              >
                {/* Add to calendar */}
                <button
                  type="button"
                  onClick={() => {
                    const [h, m] = booking.startTime.split(":").map(Number);
                    const apptDate = parseISO(booking.date);
                    apptDate.setHours(h, m, 0, 0);
                    downloadICS(
                      doctor.name,
                      apptDate,
                      selectedType?.durationMinutes ?? 30
                    );
                  }}
                  className="flex items-center justify-center gap-2 w-full border-2 border-primary text-primary hover:bg-secondary transition-colors font-bold text-sm py-3 rounded-xl"
                >
                  <Download className="w-4 h-4" strokeWidth={2.5} />
                  Ajouter au calendrier
                </button>

                <a
                  href="/mes-rdv"
                  className="flex items-center justify-center gap-2 w-full bg-primary hover:bg-doktori-teal-dark transition-colors text-white font-bold text-sm py-3 rounded-xl shadow-sm shadow-cyan-200"
                >
                  Voir mes rendez-vous
                  <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
                </a>

                <a
                  href="/"
                  className="flex items-center justify-center gap-2 w-full text-foreground/50 hover:text-foreground/70 transition-colors text-sm py-2"
                >
                  <Home className="w-4 h-4" />
                  Retour à l&apos;accueil
                </a>
              </motion.div>
            </motion.div>
          </motion.div>
  );
}
