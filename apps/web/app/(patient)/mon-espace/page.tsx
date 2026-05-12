"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { format, isPast, differenceInMinutes } from "date-fns";
import { fr } from "date-fns/locale";
import { SPECIALTIES } from "@doktori/shared";
import { GuidedTour } from "@/components/guided-tour";
import { PatientMediaSection } from "@/components/patient-media-section";
import { motion } from "framer-motion";
import {
  Search,
  FileText,
  AlertTriangle,
  Calendar,
  User,
  LogOut,
  ChevronRight,
  CheckCircle,
  XCircle,
  ClipboardList,
  Star,
  Clock,
  Video,
  Siren,
  Bell,
  Microscope,
  X,
} from "lucide-react";

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
  hasReview?: boolean;
}

interface PatientInfo {
  id: string;
  phone: string;
  name?: string;
  email?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  bloodType?: string | null;
  cnamNumber?: string | null;
  insuranceNumber?: string | null;
  addressStreet?: string | null;
  heightCm?: number | null;
  weightKg?: number | null;
  emergencyContactPhone?: string | null;
  photoUrl?: string | null;
}

interface TimelineItem {
  id: string;
  kind: "booking" | "cancelled" | "completed" | "prescription" | "review";
  doctorName: string;
  date: Date;
  label: string;
}

function parsePatientFromToken(token: string): PatientInfo | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return { id: payload.id, phone: payload.phone, name: payload.name };
  } catch {
    return null;
  }
}

const TYPE_LABELS: Record<string, string> = {
  cabinet: "Cabinet",
  domicile: "Domicile",
  teleconsultation: "Téléconsultation",
};

const TYPE_COLORS: Record<string, string> = {
  cabinet: "bg-blue-50 text-blue-700",
  domicile: "bg-amber-50 text-amber-700",
  teleconsultation: "bg-purple-50 text-purple-700",
};

const STATUS_BORDER: Record<string, string> = {
  confirmed: "border-l-primary",
  pending: "border-l-orange-400",
};

const TIMELINE_ICONS: Record<TimelineItem["kind"], React.ReactNode> = {
  booking: <Calendar className="w-3.5 h-3.5 text-primary" />,
  cancelled: <XCircle className="w-3.5 h-3.5 text-red-500" />,
  completed: <CheckCircle className="w-3.5 h-3.5 text-green-500" />,
  prescription: <FileText className="w-3.5 h-3.5 text-purple-500" />,
  review: <Star className="w-3.5 h-3.5 text-amber-500" />,
};

const TIMELINE_BG: Record<TimelineItem["kind"], string> = {
  booking: "bg-primary/10",
  cancelled: "bg-red-50",
  completed: "bg-green-50",
  prescription: "bg-purple-50",
  review: "bg-amber-50",
};

function buildTimeline(appointments: Appointment[]): TimelineItem[] {
  const items: TimelineItem[] = [];

  for (const a of appointments) {
    const startsAt = new Date(a.startsAt);

    if (a.status === "cancelled") {
      items.push({
        id: `cancelled-${a.id}`,
        kind: "cancelled",
        doctorName: a.doctorName,
        date: startsAt,
        label: `Rendez-vous annulé avec ${a.doctorName}`,
      });
    } else if (a.status === "completed" || (a.status !== "cancelled" && isPast(startsAt))) {
      items.push({
        id: `completed-${a.id}`,
        kind: "completed",
        doctorName: a.doctorName,
        date: startsAt,
        label: `Consultation terminée avec ${a.doctorName}`,
      });
    } else {
      items.push({
        id: `booking-${a.id}`,
        kind: "booking",
        doctorName: a.doctorName,
        date: startsAt,
        label: `Rendez-vous confirmé avec ${a.doctorName}`,
      });
    }
  }

  // Sort chronologically descending, take top 10
  return items.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 10);
}

/** True when the appointment starts within the next 30 minutes or has started but not ended. */
function isTeleconsultJoinable(a: Appointment): boolean {
  const now = new Date();
  const starts = new Date(a.startsAt);
  const ends = new Date(a.endsAt);
  const minsUntil = differenceInMinutes(starts, now);
  return minsUntil <= 30 && now < ends;
}

// Framer-motion helpers
const fadeUp = {
  hidden: { opacity: 0, y: 18 } as const,
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } } as const,
};

const QUICK_ACTIONS = [
  {
    href: "/recherche",
    icon: <Search className="w-5 h-5 text-primary" />,
    iconBg: "bg-primary/10",
    title: "Trouver un médecin",
    desc: "Rechercher par spécialité",
    hoverBorder: "hover:border-primary/40",
  },
  {
    href: "/sos",
    icon: <Siren className="w-5 h-5 text-red-500" />,
    iconBg: "bg-red-50",
    title: "SOS Médecin",
    desc: "Urgence médicale rapide",
    hoverBorder: "hover:border-red-300",
  },
  {
    href: "/mes-rdv",
    icon: <Calendar className="w-5 h-5 text-primary" />,
    iconBg: "bg-primary/10",
    title: "Mes rendez-vous",
    desc: "Consulter l'historique",
    hoverBorder: "hover:border-primary/40",
  },
  {
    href: "/dossier-medical",
    icon: <FileText className="w-5 h-5 text-primary" />,
    iconBg: "bg-primary/10",
    title: "Mon dossier",
    desc: "Données & documents médicaux",
    hoverBorder: "hover:border-primary/40",
  },
];

export default function PatientDashboardPage() {
  const t = useTranslations("monEspace");
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [patient, setPatient] = useState<PatientInfo | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelConfirm, setCancelConfirm] = useState<string | null>(null);
  const [reviewBannerDismissed, setReviewBannerDismissed] = useState(true);
  const [pushBannerDismissed, setPushBannerDismissed] = useState(true);
  const [researchBannerVisible, setResearchBannerVisible] = useState(false);

  useEffect(() => {
    // Auth lives in the httpOnly cookie. Try cookie first; if it's not set
    // yet (legacy localStorage JWT case) retry with Bearer to trigger the
    // /api/patients/me auto-migration that promotes the JWT into a cookie.
    let legacy: string | null = null;
    try { legacy = localStorage.getItem("doktori_patient_token"); } catch { /* ignore */ }

    (async () => {
      let res = await fetch("/api/patients/me", { credentials: "include" });
      if (!res.ok && legacy) {
        res = await fetch("/api/patients/me", {
          credentials: "include",
          headers: { Authorization: `Bearer ${legacy}` },
        });
      }
      if (!res.ok) {
        router.replace("/mes-rdv");
        return;
      }
      const data = await res.json();
      try { sessionStorage.setItem("doktori_patient_session", "1"); } catch { /* ignore */ }
      try { localStorage.removeItem("doktori_patient_token"); } catch { /* ignore */ }
      setToken("1");
      setPatient({
        id: data.id,
        phone: data.phone ?? null,
        name: data.name ?? null,
        email: data.email ?? null,
        dateOfBirth: data.dateOfBirth ?? null,
        gender: data.gender ?? null,
        bloodType: data.bloodType ?? null,
        cnamNumber: data.cnamNumber ?? null,
        insuranceNumber: data.insuranceNumber ?? null,
        addressStreet: data.addressStreet ?? null,
        heightCm: data.heightCm ?? null,
        weightKg: data.weightKg ?? null,
        emergencyContactPhone: data.emergencyContactPhone ?? null,
        photoUrl: data.photoUrl ?? null,
      });
    })().catch(() => router.replace("/mes-rdv"));
    // Read banner dismissal flags from localStorage
    setReviewBannerDismissed(
      localStorage.getItem("doktori_review_banner_dismissed") === "true",
    );
    setPushBannerDismissed(
      localStorage.getItem("doktori_push_banner_dismissed") === "true",
    );

    // Show research banner only if patient has never seen the consent screen
    const dismissed =
      localStorage.getItem("doktori_research_banner_dismissed") === "true";
    if (!dismissed) {
      // Check current consent state — if null (never asked), show banner
      fetch("/api/me/anonymization-consent", {
        credentials: "include",
      })
        .then((r) => (r.ok ? r.json() : { consent: undefined }))
        .then((d) => {
          if (d?.consent === null) setResearchBannerVisible(true);
        })
        .catch(() => {});
    }
  }, [router]);

  function dismissResearchBanner() {
    localStorage.setItem("doktori_research_banner_dismissed", "true");
    setResearchBannerVisible(false);
  }

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetch("/api/appointments/patient", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (r.status === 401) {
          sessionStorage.removeItem("doktori_patient_session");
          router.replace("/mes-rdv");
          return [];
        }
        return r.json();
      })
      .then((data) => {
        setAppointments(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [token, router]);

  async function cancelAppointment(id: string) {
    if (!token) return;
    const res = await fetch(`/api/appointments/${id}/cancel`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: "cancelled" } : a)),
      );
    } else {
      // 422 with CANCEL_WINDOW_TOO_CLOSE comes back when the doctor's
      // patient_cancel_window_hours threshold is breached. Surface a clear
      // message instead of failing silently.
      try {
        const data = await res.json();
        if (data?.error === "CANCEL_WINDOW_TOO_CLOSE" && typeof data.windowHours === "number") {
          alert(
            `Annulation impossible : ce médecin n'accepte plus d'annulation moins de ${data.windowHours}h avant le rendez-vous.`,
          );
        } else if (typeof data?.error === "string") {
          alert(data.error);
        }
      } catch {
        /* ignore */
      }
    }
    setCancelConfirm(null);
  }

  function logout() {
    sessionStorage.removeItem("doktori_patient_session");
    router.replace("/mes-rdv");
  }

  function dismissReviewBanner() {
    localStorage.setItem("doktori_review_banner_dismissed", "true");
    setReviewBannerDismissed(true);
  }

  function dismissPushBanner() {
    localStorage.setItem("doktori_push_banner_dismissed", "true");
    setPushBannerDismissed(true);
  }

  // Note: we used to gate the entire page on `if (loading) return <spinner>`
  // but that hid the whole layout whenever the appointments fetch hadn't
  // resolved yet — including after a Next.js back-nav where the router cache
  // sometimes returns the cached pre-effect render and the client useEffect
  // doesn't re-fire reliably. The page now renders immediately with whatever
  // data we have (empty arrays at first); the data fills in when fetches
  // resolve.

  const upcoming = appointments
    .filter((a) => a.status !== "cancelled" && !isPast(new Date(a.startsAt)))
    .slice(0, 3);

  // Last 3 unique doctors from past completed appointments
  const pastCompleted = appointments.filter(
    (a) => a.status !== "cancelled" && isPast(new Date(a.startsAt)),
  );
  const seenDoctorSlugs = new Set<string>();
  const recentDoctors: Appointment[] = [];
  for (const a of pastCompleted) {
    if (!seenDoctorSlugs.has(a.doctorSlug)) {
      seenDoctorSlugs.add(a.doctorSlug);
      recentDoctors.push(a);
    }
    if (recentDoctors.length === 3) break;
  }

  const nextAppointment = upcoming[0] ?? null;
  const patientName = patient?.name ?? patient?.phone ?? "Patient";
  const timeline = buildTimeline(appointments);

  // Profile completion — derived from real patient fields.
  // Each step is 25% of the bar.
  const steps = [
    {
      label: "Informations personnelles",
      done: !!(patient?.name && patient?.dateOfBirth && patient?.gender),
      cta: "Compléter",
    },
    {
      label: "Numéro de téléphone",
      done: !!patient?.phone,
      cta: "Compléter",
    },
    {
      label: "Carte CNAM",
      done: !!patient?.cnamNumber,
      cta: "Ajouter",
    },
    {
      label: "Antécédents médicaux",
      done: !!(patient?.bloodType || patient?.heightCm || patient?.weightKg),
      cta: "Compléter",
    },
  ];
  const completionPct = Math.round(
    (steps.filter((s) => s.done).length / steps.length) * 100,
  );

  // Unreviewed completed appointments in the last 30 days (for banners)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const unreviewedCompleted = appointments.filter(
    (a) =>
      (a.status === "completed" || (a.status !== "cancelled" && isPast(new Date(a.startsAt)))) &&
      !a.hasReview &&
      new Date(a.startsAt) >= thirtyDaysAgo,
  );
  const firstUnreviewed = unreviewedCompleted[0] ?? null;

  // Greeting based on hour
  const hour = new Date().getHours();
  const greeting =
    hour >= 5 && hour < 12
      ? "Bonjour"
      : hour >= 12 && hour < 18
      ? "Bon après-midi"
      : hour >= 18 && hour < 22
      ? "Bonsoir"
      : "Bonne nuit";

  return (
    <div>
      <GuidedTour
        storageKey="doktori_patient_tour"
        steps={[
          {
            target: "[data-tour='quick-actions']",
            title: "Actions rapides",
            content: "Trouvez un médecin, consultez votre dossier médical, vos documents ou lancez un SOS en un clic.",
            position: "bottom",
          },
          {
            target: "[data-tour='upcoming-rdv']",
            title: "Vos prochains rendez-vous",
            content: "Retrouvez vos consultations à venir avec le nom du médecin, la date et le type (cabinet, vidéo). Vous pouvez annuler depuis ici.",
            position: "bottom",
          },
          {
            target: "[data-tour='recent-activity']",
            title: "Activité récente",
            content: "Suivez l'historique de vos actions : réservations, annulations, consultations terminées.",
            position: "top",
          },
        ]}
      />
      <div className="w-full">
        {/* Page header — eyebrow + warm greeting (cyan redesign) */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="flex items-end justify-between gap-4 mb-6"
        >
          <div className="min-w-0">
            <div className="ds-eyebrow">Mon espace</div>
            <h1 className="ds-page-title">
              {greeting} {patientName.split(" ")[0] ?? patientName},{" "}
              <span style={{ color: "var(--primary-500)" }}>
                comment vous sentez-vous&nbsp;?
              </span>
            </h1>
            <p className="ds-page-sub">
              {format(new Date(), "EEEE d MMMM", { locale: fr })} ·{" "}
              {upcoming.length === 0
                ? "Aucun rendez-vous prévu cette semaine"
                : upcoming.length === 1
                ? "1 rendez-vous à venir"
                : `${upcoming.length} rendez-vous à venir`}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a href="/faq" className="ds-btn ds-btn-ghost ds-btn-sm">
              <ClipboardList className="w-4 h-4" />
              Aide
            </a>
            <a href="/recherche" className="ds-btn ds-btn-primary ds-btn-sm">
              <Calendar className="w-4 h-4" />
              Nouveau RDV
            </a>
          </div>
        </motion.div>

        {/* Review reminder banner */}
        {!reviewBannerDismissed && unreviewedCompleted.length > 0 && (
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700 px-4 py-3 flex items-center gap-3"
          >
            <Star className="w-5 h-5 text-amber-500 shrink-0" />
            <p className="flex-1 text-sm text-amber-800 dark:text-amber-200">
              Vous avez{" "}
              <span className="font-bold">{unreviewedCompleted.length}</span>{" "}
              consultation{unreviewedCompleted.length > 1 ? "s" : ""} sans avis.
              Votre retour aide les autres patients&nbsp;!
            </p>
            <div className="flex items-center gap-2 shrink-0">
              {firstUnreviewed && (
                <a
                  href={`/avis/${firstUnreviewed.id}`}
                  className="text-xs font-bold text-white bg-[#0891B2] hover:bg-[#0e7490] rounded-xl px-3 py-1.5 transition-colors"
                >
                  Laisser un avis
                </a>
              )}
              <button
                onClick={dismissReviewBanner}
                aria-label="Fermer"
                className="text-amber-400 hover:text-amber-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Medical research opt-in banner (loi 2004-63) */}
        {researchBannerVisible && (
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="mb-4 rounded-2xl border border-emerald-300/40 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-700 px-4 py-3 flex items-center gap-3"
          >
            <Microscope className="w-5 h-5 text-emerald-700 shrink-0" />
            <p className="flex-1 text-sm text-emerald-800 dark:text-emerald-200">
              Aidez la recherche médicale tunisienne — Découvrez le programme
              d'anonymisation
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href="/parametres/recherche-medicale"
                className="text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl px-3 py-1.5 transition-colors"
              >
                En savoir plus
              </a>
              <button
                onClick={dismissResearchBanner}
                aria-label="Fermer"
                className="text-emerald-500 hover:text-emerald-700 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Push notification opt-in banner */}
        {!pushBannerDismissed && (
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="mb-4 rounded-2xl border border-[#0891B2]/30 bg-cyan-50 dark:bg-cyan-900/20 dark:border-cyan-700 px-4 py-3 flex items-center gap-3"
          >
            <Bell className="w-5 h-5 text-[#0891B2] shrink-0" />
            <p className="flex-1 text-sm text-cyan-800 dark:text-cyan-200">
              Activez les notifications pour recevoir des rappels de rendez-vous
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href="/parametres/notifications"
                className="text-xs font-bold text-white bg-[#0891B2] hover:bg-[#0e7490] rounded-xl px-3 py-1.5 transition-colors"
              >
                Activer
              </a>
              <button
                onClick={dismissPushBanner}
                aria-label="Fermer"
                className="text-cyan-400 hover:text-cyan-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* ═══════ NEW DESIGN — Quick actions strip (4 cards) ═══════ */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          data-tour="quick-actions"
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6"
        >
          <a href="/recherche" className="ds-qa ds-qa-primary">
            <div className="ds-qa-iconwrap" style={{ background: "rgba(255,255,255,.18)" }}>
              <Search className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-[14.5px] mb-0.5">Trouver un médecin</div>
              <div className="text-[12.5px]" style={{ color: "rgba(255,255,255,.85)" }}>
                Spécialité, nom, ville
              </div>
            </div>
          </a>
          <a href="/sos" className="ds-qa ds-qa-coral">
            <div className="ds-qa-iconwrap" style={{ background: "rgba(255,255,255,.18)" }}>
              <Siren className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-[14.5px] mb-0.5">Urgence SOS</div>
              <div className="text-[12.5px]" style={{ color: "rgba(255,255,255,.9)" }}>
                Médecin disponible 24/7
              </div>
            </div>
          </a>
          <a href="/recherche?mode=teleconsult" className="ds-qa ds-qa-light">
            <div className="ds-qa-iconwrap" style={{ background: "var(--tone-sky-bg)", color: "#2C5F82" }}>
              <Video className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-[14.5px] mb-0.5" style={{ color: "var(--ink-900)" }}>
                Téléconsultation
              </div>
              <div className="text-[12.5px]" style={{ color: "var(--ink-500)" }}>
                Consulter en vidéo
              </div>
            </div>
          </a>
          <a href="/mes-rdv" className="ds-qa ds-qa-light">
            <div className="ds-qa-iconwrap" style={{ background: "var(--tone-amber-bg)", color: "#8B6224" }}>
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-[14.5px] mb-0.5" style={{ color: "var(--ink-900)" }}>
                Mes rendez-vous
              </div>
              <div className="text-[12.5px]" style={{ color: "var(--ink-500)" }}>
                Voir l&apos;historique complet
              </div>
            </div>
          </a>
        </motion.section>

        {/* ═══════ NEW DESIGN — 2-column dashboard cards ═══════ */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-5 mb-8"
        >
          {/* LEFT — Prochain rendez-vous (friendly empty/upcoming card) */}
          <div className="ds-card-patient ds-card-pad-lg" data-tour="upcoming-rdv">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="font-bold text-[16px]" style={{ color: "var(--ink-900)" }}>
                  Prochain rendez-vous
                </div>
                <div className="text-[13px] mt-0.5" style={{ color: "var(--ink-500)" }}>
                  Votre agenda apparaîtra ici
                </div>
              </div>
              <a
                href="/mes-rdv"
                className="inline-flex items-center gap-1 text-[13px] font-bold"
                style={{ color: "var(--primary-600)" }}
              >
                Tout voir <ChevronRight className="w-3.5 h-3.5" />
              </a>
            </div>
            <div
              className="flex gap-5 items-center p-5 rounded-2xl"
              style={{
                background: "linear-gradient(135deg, var(--primary-50), var(--tone-mint-bg))",
                border: "1px solid var(--primary-100)",
              }}
            >
              {/* Friendly calendar art */}
              <svg width="92" height="92" viewBox="0 0 92 92" className="shrink-0" aria-hidden>
                <rect x="10" y="14" width="72" height="68" rx="14" fill="#fff" stroke="var(--primary-200)" strokeWidth="1.5" />
                <rect x="10" y="14" width="72" height="18" rx="14" fill="var(--primary-500)" />
                <rect x="10" y="22" width="72" height="10" fill="var(--primary-500)" />
                <rect x="22" y="8" width="6" height="14" rx="3" fill="var(--primary-700)" />
                <rect x="64" y="8" width="6" height="14" rx="3" fill="var(--primary-700)" />
                <circle cx="46" cy="58" r="14" fill="var(--tone-mint-bg)" />
                <path d="M40 58 l5 5 l9-10" stroke="var(--primary-600)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                <circle cx="74" cy="46" r="6" fill="var(--tone-coral)" />
                <circle cx="20" cy="74" r="4" fill="var(--tone-amber)" />
              </svg>
              <div className="flex-1 min-w-0">
                {nextAppointment ? (
                  <>
                    <div className="font-bold text-[17px] mb-1" style={{ color: "var(--ink-900)" }}>
                      {nextAppointment.doctorName}
                    </div>
                    <div className="text-[13.5px] mb-3" style={{ color: "var(--ink-500)" }}>
                      {format(new Date(nextAppointment.startsAt), "EEEE d MMMM 'à' HH:mm", { locale: fr })}
                    </div>
                    <a href="/mes-rdv" className="ds-btn ds-btn-primary ds-btn-sm">
                      Voir les détails
                    </a>
                  </>
                ) : (
                  <>
                    <div className="font-bold text-[17px] mb-1" style={{ color: "var(--ink-900)" }}>
                      Prenez soin de vous
                    </div>
                    <div className="text-[13.5px] mb-3 leading-relaxed" style={{ color: "var(--ink-500)" }}>
                      Aucun rendez-vous à venir. Trouvez un médecin près de chez vous en quelques clics.
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <a href="/recherche" className="ds-btn ds-btn-primary ds-btn-sm">
                        <Search className="w-4 h-4" /> Trouver un médecin
                      </a>
                      <a href="/mes-rdv" className="ds-btn ds-btn-ghost ds-btn-sm">
                        Voir mes médecins
                      </a>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT — Profile completion */}
          <div
            className="ds-card-patient"
            style={{ background: "var(--primary-50)", borderColor: "var(--primary-100)" }}
          >
            <div className="flex items-center gap-3 mb-2.5">
              <div
                className="w-12 h-12 rounded-2xl grid place-items-center bg-white"
                style={{ color: "var(--primary-600)" }}
              >
                <CheckCircle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="font-bold text-[14px]" style={{ color: "var(--ink-900)" }}>
                  Complétez votre profil
                </div>
                <div className="text-[12.5px]" style={{ color: "var(--ink-500)" }}>
                  {completionPct} % terminé
                </div>
              </div>
              <div
                className="font-extrabold text-[22px]"
                style={{ color: "var(--primary-600)", fontFamily: "Manrope, sans-serif" }}
              >
                {completionPct}%
              </div>
            </div>
            <div
              className="h-2 rounded-full overflow-hidden mb-3.5"
              style={{ background: "#fff" }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${completionPct}%`,
                  background: "linear-gradient(90deg, var(--primary-400), var(--primary-600))",
                  transition: "width .3s ease",
                }}
              />
            </div>
            <div className="flex flex-col gap-2">
              {steps.map((s, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <div
                    className="w-5 h-5 rounded-full grid place-items-center"
                    style={
                      s.done
                        ? { background: "var(--primary-500)", color: "#fff" }
                        : { background: "#fff", border: "1.5px dashed var(--line-strong)" }
                    }
                  >
                    {s.done && <CheckCircle className="w-3 h-3" strokeWidth={3} />}
                  </div>
                  <div
                    className={`flex-1 text-[13.5px] ${s.done ? "line-through" : ""}`}
                    style={{
                      color: s.done ? "var(--ink-500)" : "var(--ink-900)",
                      fontWeight: s.done ? 500 : 700,
                    }}
                  >
                    {s.label}
                  </div>
                  {!s.done && s.cta && (
                    <a
                      href="/parametres/compte"
                      className="text-[13px] font-bold"
                      style={{ color: "var(--primary-600)" }}
                    >
                      {s.cta}
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* ═══════ NEW DESIGN — Specialties (left) + Vital snapshot (right) ═══════ */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-5 mb-5"
        >
          {/* LEFT — Spécialités populaires (compact 2x4 grid) */}
          <div className="ds-card-patient">
            <div className="flex items-center justify-between mb-4">
              <div className="font-bold text-[16px]" style={{ color: "var(--ink-900)" }}>
                Spécialités populaires
              </div>
              <a
                href="/recherche"
                className="inline-flex items-center gap-1 text-[13px] font-bold"
                style={{ color: "var(--primary-600)" }}
              >
                Toutes <ChevronRight className="w-3.5 h-3.5" />
              </a>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { l: "Généraliste", c: "primary" },
                { l: "Dentiste", c: "sky" },
                { l: "Dermatologue", c: "coral" },
                { l: "Pédiatre", c: "amber" },
                { l: "Gynécologue", c: "rose" },
                { l: "Ophtalmologue", c: "sky" },
                { l: "ORL", c: "primary" },
                { l: "Cardiologue", c: "coral" },
              ].map((s) => (
                <a
                  key={s.l}
                  href={`/recherche?specialty=${encodeURIComponent(s.l.toLowerCase())}`}
                  className="flex flex-col gap-1.5 p-3 rounded-xl border transition-colors hover:border-primary"
                  style={{
                    background: "var(--surface-2)",
                    borderColor: "var(--line-cool)",
                  }}
                >
                  <span className={`ds-chip ds-chip-${s.c}`} style={{ width: 28, height: 28, padding: 0, justifyContent: "center" }}>
                    <Search className="w-3.5 h-3.5" />
                  </span>
                  <div className="text-[12.5px] font-bold" style={{ color: "var(--ink-900)" }}>
                    {s.l}
                  </div>
                </a>
              ))}
            </div>
          </div>

          {/* RIGHT — Vital snapshot */}
          <div className="ds-card-patient">
            <div className="font-bold text-[16px] mb-4" style={{ color: "var(--ink-900)" }}>
              Vital snapshot
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { label: "Groupe sanguin", value: "—", tone: "rose" },
                { label: "Allergies", value: "—", tone: "amber" },
                { label: "Taille", value: "—", tone: "primary" },
                { label: "Poids", value: "—", tone: "sky" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="p-3 rounded-xl border"
                  style={{ background: "var(--surface-2)", borderColor: "var(--line-cool)" }}
                >
                  <span className={`ds-chip ds-chip-${s.tone} mb-2`} style={{ fontSize: 11 }}>
                    {s.label}
                  </span>
                  <div
                    className="text-[16px] font-extrabold"
                    style={{ color: "var(--ink-900)", fontFamily: "Manrope, sans-serif" }}
                  >
                    {s.value}
                  </div>
                </div>
              ))}
            </div>
            <a href="/dossier-medical" className="ds-btn ds-btn-soft ds-btn-sm w-full mt-3">
              Voir mon dossier complet <ChevronRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </motion.section>

        {/* ═══════ NEW DESIGN — Activité récente (left) + Rappel vaccinal (right) ═══════ */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-5 mb-8"
        >
          {/* LEFT — Activité récente */}
          <div className="ds-card-patient">
            <div className="font-bold text-[16px] mb-4" style={{ color: "var(--ink-900)" }}>
              Activité récente
            </div>
            <div className="flex flex-col gap-0">
              {timeline.length > 0 ? (
                timeline.slice(0, 3).map((it) => {
                  const chip =
                    it.kind === "completed" ? "primary"
                    : it.kind === "cancelled" ? "rose"
                    : it.kind === "prescription" ? "sky"
                    : it.kind === "review" ? "amber"
                    : "primary";
                  const Icon =
                    it.kind === "prescription" ? FileText
                    : it.kind === "review" ? Star
                    : it.kind === "cancelled" ? XCircle
                    : it.kind === "completed" ? CheckCircle
                    : Calendar;
                  return (
                    <div
                      key={it.id}
                      className="flex items-center gap-3.5 py-3"
                      style={{ borderBottom: "1px solid var(--line-cool)" }}
                    >
                      <span
                        className={`ds-chip ds-chip-${chip}`}
                        style={{ width: 38, height: 38, padding: 0, justifyContent: "center", borderRadius: 12 }}
                      >
                        <Icon className="w-4 h-4" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-[13.5px] truncate" style={{ color: "var(--ink-900)" }}>
                          {it.label}
                        </div>
                      </div>
                      <div className="text-[12px] font-semibold shrink-0" style={{ color: "var(--ink-400)" }}>
                        {format(it.date, "d MMM", { locale: fr })}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-3 text-[13px]" style={{ color: "var(--ink-500)" }}>
                  Aucune activité récente. Vos rendez-vous, ordonnances et avis apparaîtront ici.
                </div>
              )}
            </div>
          </div>

          {/* RIGHT — Rappel vaccinal (coral card) */}
          <div
            className="ds-card-patient"
            style={{ background: "var(--tone-coral-bg)", borderColor: "#F1CFBE" }}
          >
            <div className="flex gap-3">
              <div
                className="w-10 h-10 rounded-xl bg-white grid place-items-center shrink-0"
                style={{ color: "#B05F3D" }}
              >
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-[14px] mb-1" style={{ color: "#7A4126" }}>
                  Rappel vaccinal
                </div>
                <div className="text-[13px] leading-relaxed" style={{ color: "#8B5639" }}>
                  Pensez à vérifier vos vaccins recommandés. Notre Coach IA peut vous guider.
                </div>
                <a href="/coach-ia" className="ds-btn ds-btn-ghost ds-btn-sm mt-2.5">
                  Demander au Coach IA
                </a>
              </div>
            </div>
          </div>
        </motion.section>


        {/* Cancel confirmation modal */}
        {cancelConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="mx-4 w-full max-w-sm rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-xl border border-border dark:border-gray-700">
              <h3 dir="ltr" className="text-lg font-bold text-foreground">
                Annuler ce rendez-vous ?
              </h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Cette action est irréversible. Vous devrez reprendre un nouveau rendez-vous.
              </p>
              <div className="mt-6 flex gap-3 justify-end">
                <button
                  onClick={() => setCancelConfirm(null)}
                  className="rounded-xl border border-border dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Non
                </button>
                <button
                  onClick={() => cancelAppointment(cancelConfirm)}
                  className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                >
                  Oui, annuler
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
