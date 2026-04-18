"use client";

import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Calendar,
  Clock,
  AlertCircle,
  Video,
  Wallet,
  CheckCircle,
  CalendarDays,
  ArrowRight,
  Stethoscope,
  Users,
  Phone,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { DoctorOnboarding } from "@/components/doctor-onboarding";
import { GuidedTour } from "@/components/guided-tour";

// ─── Types ────────────────────────────────────────────────────────────────────

type TodayAppt = {
  id: string;
  startsAt: Date;
  status: string;
  type: string;
  reason: string | null;
  patientName: string;
  patientPhone: string | null;
};

type UpcomingAppt = {
  id: string;
  startsAt: Date;
  status: string;
  type: string;
  reason: string | null;
  patientName: string;
};

type DashboardClientProps = {
  doctorName: string;
  todayCount: number;
  toConfirm: number;
  noShowCount: number;
  teleconsultCount: number;
  walletBalance: number;
  hasTeleconsult: boolean;
  consultationMode: string;
  todayAppts: TodayAppt[];
  upcomingAppts: UpcomingAppt[];
};

// ─── Status badge/border config (labels resolved at render time via t()) ───────

const STATUS_BADGE_BORDER: Record<string, { badge: string; border: string }> = {
  pending: {
    badge: "bg-orange-100 text-orange-700",
    border: "border-l-orange-400",
  },
  confirmed: {
    badge: "bg-green-100 text-green-700",
    border: "border-l-green-400",
  },
  cancelled: {
    badge: "bg-gray-100 text-gray-500",
    border: "border-l-gray-300",
  },
  completed: {
    badge: "bg-blue-100 text-blue-700",
    border: "border-l-blue-400",
  },
  no_show: {
    badge: "bg-red-100 text-red-700",
    border: "border-l-red-400",
  },
  doctor_noshow: {
    badge: "bg-red-100 text-red-700",
    border: "border-l-red-400",
  },
};

// ─── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sublabel,
  accentColor,
  icon: Icon,
  iconBg,
  href,
  index = 0,
}: {
  label: string;
  value: string | number;
  sublabel: string;
  accentColor: string;
  icon: React.ElementType;
  iconBg: string;
  href?: string;
  index?: number;
}) {
  const inner = (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08, ease: "easeOut" }}
      whileHover={{ y: -2, boxShadow: "0 8px 25px -5px rgba(0,0,0,0.08)" }}
      className="relative bg-white rounded-2xl p-5 border border-slate-100 shadow-sm overflow-hidden cursor-pointer"
    >
      {/* Left accent bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl ${accentColor}`} />
      <div className="flex items-start justify-between gap-3 pl-3">
        <div className="min-w-0">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</div>
          <div className="text-3xl font-black mt-1.5 text-slate-900 tabular-nums">{value}</div>
          <div className="text-xs text-slate-400 mt-1">{sublabel}</div>
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
          <Icon className="h-5 w-5" strokeWidth={2.5} />
        </div>
      </div>
    </motion.div>
  );

  if (href) {
    return <Link href={href}>{inner}</Link>;
  }
  return inner;
}

// ─── Type badge ────────────────────────────────────────────────────────────────

function TypeBadge({
  type,
  mode,
  appointmentId,
  videoLabel,
  cabinetLabel,
}: {
  type: string;
  mode: string;
  appointmentId: string;
  videoLabel: string;
  cabinetLabel: string;
}) {
  if (type === "teleconsult") {
    return (
      <Link
        href={`/teleconsult-medecin/${appointmentId}`}
        className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors"
      >
        <Video className="h-3 w-3" strokeWidth={2.5} />
        {videoLabel}
      </Link>
    );
  }
  if (mode === "both") {
    return (
      <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-teal-100 text-teal-700">
        {cabinetLabel}
      </span>
    );
  }
  return null;
}

// ─── Section header ────────────────────────────────────────────────────────────

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="h-5 w-1 rounded-full bg-[#0891B2]" />
      <h2 className="font-bold text-slate-800 text-base">{children}</h2>
    </div>
  );
}

// ─── Main client component ─────────────────────────────────────────────────────

export function DashboardClient({
  doctorName,
  todayCount,
  toConfirm,
  noShowCount,
  teleconsultCount,
  walletBalance,
  hasTeleconsult,
  consultationMode,
  todayAppts,
  upcomingAppts,
}: DashboardClientProps) {
  const t = useTranslations("medecin.dashboard");
  const tStatus = useTranslations("medecin.appointments.status");

  const kpis = [
    {
      label: t("today"),
      value: todayCount,
      sublabel: t("appointments"),
      accentColor: "bg-[#0891B2]",
      icon: Calendar,
      iconBg: "bg-cyan-50 text-cyan-600",
    },
    {
      label: t("toConfirm"),
      value: toConfirm,
      sublabel: t("pending"),
      accentColor: "bg-orange-400",
      icon: Clock,
      iconBg: "bg-orange-50 text-orange-500",
    },
    {
      label: t("noShows"),
      value: noShowCount,
      sublabel: t("missed"),
      accentColor: "bg-red-400",
      icon: AlertCircle,
      iconBg: "bg-red-50 text-red-500",
    },
  ];

  const teleconsultKpi = hasTeleconsult
    ? {
        label: t("teleconsultMonth"),
        value: teleconsultCount,
        sublabel: t("teleconsultSubLabel"),
        accentColor: "bg-purple-500",
        icon: Video,
        iconBg: "bg-purple-50 text-purple-600",
      }
    : null;

  function getStatusConfig(status: string) {
    const bb = STATUS_BADGE_BORDER[status] ?? {
      badge: "bg-gray-100 text-gray-500",
      border: "border-l-gray-300",
    };
    const label = STATUS_BADGE_BORDER[status]
      ? tStatus(status as Parameters<typeof tStatus>[0])
      : status;
    return { ...bb, label };
  }

  return (
    <div className="space-y-8">
      {/* First-login onboarding wizard */}
      <DoctorOnboarding />

      {/* Interactive guided tour — shows after onboarding is dismissed */}
      <GuidedTour
        storageKey="doktori_dashboard_tour"
        steps={[
          {
            target: "[data-tour='kpi-grid']",
            title: "Vos indicateurs clés",
            content: "Suivez en un coup d'œil vos rendez-vous du jour, les confirmations en attente et vos absences. Ces chiffres se mettent à jour en temps réel.",
            position: "bottom",
          },
          {
            target: "[data-tour='today-appts']",
            title: "Rendez-vous d'aujourd'hui",
            content: "Retrouvez tous vos patients du jour avec l'heure, le nom et le type de consultation (cabinet ou vidéo). Cliquez sur un RDV pour accéder au dossier.",
            position: "top",
          },
          {
            target: "[data-tour='upcoming-appts']",
            title: "Prochains 7 jours",
            content: "Planifiez votre semaine avec la liste des rendez-vous à venir. Les badges colorés indiquent le statut de chaque consultation.",
            position: "top",
          },
          {
            target: "[data-tour='sidebar-nav']",
            title: "Votre menu de navigation",
            content: "Accédez à toutes vos fonctionnalités : agenda, patients, motifs, cabinets, téléconsultation, portefeuille, messages et plus encore.",
            position: "right",
          },
        ]}
      />

      {/* Greeting */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-black text-slate-900">
            {t("greeting")}, Dr.{" "}
            <span className="text-[#0891B2]">{doctorName}</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {t("greetingSubtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/calendrier"
            className="inline-flex items-center gap-2 rounded-xl bg-[#0891B2] px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#0e7490] transition-colors"
          >
            <CalendarDays className="h-4 w-4" />
            Calendrier
          </Link>
          <Link
            href="/rendez-vous"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
          >
            Rendez-vous
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </motion.div>

      {/* KPI grid */}
      <div data-tour="kpi-grid" className={`grid gap-4 ${hasTeleconsult ? "grid-cols-2 lg:grid-cols-4" : "grid-cols-3"}`}>
        {kpis.map((kpi, i) => (
          <KpiCard key={kpi.label} {...kpi} index={i} />
        ))}
        {teleconsultKpi && <KpiCard {...teleconsultKpi} index={kpis.length} />}
      </div>

      {/* Wallet card */}
      {hasTeleconsult && (
        <KpiCard
          label={t("walletBalance")}
          value={`${(walletBalance / 1000).toFixed(3)} DT`}
          sublabel={t("walletSubLabel")}
          accentColor="bg-green-500"
          icon={Wallet}
          iconBg="bg-green-50 text-green-600"
          href="/wallet"
          index={kpis.length + 1}
        />
      )}

      {/* Teleconsult promo */}
      {consultationMode === "cabinet" && (
        <div
          className="rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-700 p-6 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          style={{ animation: "fadeSlideIn 0.5s ease 0.1s both" }}
        >
          <div className="flex items-start gap-4">
            <div className="bg-white/20 rounded-xl p-2.5 shrink-0">
              <Video className="w-6 h-6" strokeWidth={2} />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">
                {t("teleconsultPromoTitle")}
              </h3>
              <p className="text-white/80 text-sm mt-1 max-w-md">
                {t("teleconsultPromoDesc")}
              </p>
            </div>
          </div>
          <Link
            href="/teleconsultation"
            className="shrink-0 bg-white text-purple-700 font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-white/90 transition-colors whitespace-nowrap"
          >
            {t("teleconsultPromoCta")}
          </Link>
        </div>
      )}

      {/* Today's appointments */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        data-tour="today-appts"
        className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-slate-100">
          <SectionHeader>{t("todayAppointments")}</SectionHeader>
        </div>
        <div className="divide-y divide-slate-50">
          {todayAppts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <CheckCircle className="h-8 w-8 mb-2 text-slate-300" strokeWidth={1.5} />
              <p className="text-sm">{t("noAppointments")}</p>
            </div>
          ) : (
            todayAppts.map((a) => {
              const cfg = getStatusConfig(a.status);
              return (
                <div
                  key={a.id}
                  className={`flex items-center justify-between px-5 py-4 border-l-4 ${cfg.border} hover:bg-[#F0FDFA] transition-colors`}
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900 flex items-center gap-2 flex-wrap text-sm">
                      <span className="text-[#0891B2] font-bold tabular-nums">
                        {format(a.startsAt, "HH:mm")}
                      </span>
                      <span className="text-slate-400">—</span>
                      {a.patientName}
                      <TypeBadge
                        type={a.type}
                        mode={consultationMode}
                        appointmentId={a.id}
                        videoLabel={t("video")}
                        cabinetLabel={t("cabinet")}
                      />
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {a.patientPhone}
                      {a.reason ? ` · ${a.reason}` : ""}
                    </div>
                  </div>
                  <span className={`ml-4 shrink-0 text-xs px-2.5 py-1 rounded-lg font-medium ${cfg.badge}`}>
                    {cfg.label}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </motion.div>

      {/* Upcoming appointments */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
        data-tour="upcoming-appts"
        className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <SectionHeader>{t("upcoming")}</SectionHeader>
          <Link href="/rendez-vous" className="text-xs font-semibold text-[#0891B2] hover:underline">
            {t("viewAll")} →
          </Link>
        </div>
        <div className="divide-y divide-slate-50">
          {upcomingAppts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Calendar className="h-8 w-8 mb-2 text-slate-300" strokeWidth={1.5} />
              <p className="text-sm">{t("noUpcoming")}</p>
            </div>
          ) : (
            upcomingAppts.map((a) => {
              const cfg = getStatusConfig(a.status);
              return (
                <div
                  key={a.id}
                  className={`flex items-center justify-between px-5 py-4 border-l-4 ${cfg.border} hover:bg-[#F0FDFA] transition-colors`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    {/* Timeline dot */}
                    <div className="mt-1.5 flex h-2 w-2 shrink-0 rounded-full bg-[#0891B2]/50" />
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 flex items-center gap-2 flex-wrap text-sm">
                        <span className="text-slate-500 font-medium tabular-nums">
                          {format(a.startsAt, "EEE d MMM HH:mm", { locale: fr })}
                        </span>
                        <span className="text-slate-400">—</span>
                        {a.patientName}
                        <TypeBadge
                          type={a.type}
                          mode={consultationMode}
                          appointmentId={a.id}
                          videoLabel={t("video")}
                          cabinetLabel={t("cabinet")}
                        />
                      </div>
                      {a.reason && (
                        <div className="text-xs text-slate-500 mt-0.5">{a.reason}</div>
                      )}
                    </div>
                  </div>
                  <span className={`ml-4 shrink-0 text-xs px-2.5 py-1 rounded-lg font-medium ${cfg.badge}`}>
                    {cfg.label}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </motion.div>
    </div>
  );
}
