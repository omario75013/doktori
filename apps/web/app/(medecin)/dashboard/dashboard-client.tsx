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
  Users,
  Shield,
  XCircle,
  Star,
  TrendingUp,
  Activity,
  CalendarPlus,
  UserPlus,
  BarChart2,
  UserCheck,
  MessageSquare,
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
  checkedInAt?: Date | null;
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

type ActivityItem = {
  id: string;
  status: string;
  startsAt: string;
  updatedAt: string;
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
  verificationStatus?: string;
  verificationNote?: string | null;
  smsUsed?: number;
  smsLimit?: number;
  smsPlan?: string;
  waitingRoomCount?: number;
  waitingPatients?: { id: string; patientName: string; checkedInAt: Date; startsAt: Date }[];
  // New quick stats
  totalPatients?: number;
  monthTotal?: number;
  completionRate?: number | null;
  averageRating?: number;
  recentActivity?: ActivityItem[];
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

// ─── SMS Counter Card ─────────────────────────────────────────────────────────

function SMSCounterCard({
  used,
  limit,
  plan,
  index = 0,
}: {
  used: number;
  limit: number;
  plan: string;
  index?: number;
}) {
  const isUnlimited = limit >= 999999;
  const pct = isUnlimited ? 0 : Math.min(100, Math.round((used / limit) * 100));
  const isExhausted = !isUnlimited && used >= limit;
  const isNearLimit = !isUnlimited && pct >= 80 && !isExhausted;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08, ease: "easeOut" }}
      className="relative bg-white dark:bg-gray-900 rounded-2xl p-5 border border-slate-100 dark:border-gray-700 shadow-sm overflow-hidden"
    >
      <div
        className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl ${
          isExhausted ? "bg-red-500" : isNearLimit ? "bg-yellow-400" : "bg-teal-500"
        }`}
      />
      <div className="flex items-start justify-between gap-3 pl-3">
        <div className="min-w-0 flex-1">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">
            SMS ce mois
          </div>
          <div className="text-xl font-black mt-1 text-slate-900 dark:text-white tabular-nums">
            {isUnlimited ? "Illimité" : `${used} / ${limit}`}
          </div>
          {!isUnlimited && (
            <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100 dark:bg-gray-700">
              <div
                className={`h-1.5 rounded-full transition-all ${
                  isExhausted ? "bg-red-500" : isNearLimit ? "bg-yellow-400" : "bg-teal-500"
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          )}
          {isExhausted && (
            <div className="mt-2 flex gap-2 flex-wrap">
              <a
                href="/abonnement"
                className="text-xs font-semibold text-red-600 hover:text-red-700 underline"
              >
                Passer au Pro
              </a>
            </div>
          )}
          {!isExhausted && !isUnlimited && (
            <div className="text-xs text-slate-400 mt-1">
              {isNearLimit
                ? `${limit - used} restants — bientôt épuisé`
                : `${limit - used} SMS restants`}
            </div>
          )}
          {isUnlimited && (
            <div className="text-xs text-teal-600 mt-1 font-medium">Plan {plan}</div>
          )}
        </div>
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            isExhausted
              ? "bg-red-50 text-red-500"
              : isNearLimit
              ? "bg-yellow-50 text-yellow-500"
              : "bg-teal-50 text-teal-600"
          }`}
        >
          <MessageSquare className="h-5 w-5" strokeWidth={2.5} />
        </div>
      </div>
    </motion.div>
  );
}

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
      className="relative bg-white dark:bg-gray-900 rounded-2xl p-5 border border-slate-100 dark:border-gray-700 shadow-sm overflow-hidden cursor-pointer"
    >
      {/* Left accent bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl ${accentColor}`} />
      <div className="flex items-start justify-between gap-3 pl-3">
        <div className="min-w-0">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">{label}</div>
          <div className="text-3xl font-black mt-1.5 text-slate-900 dark:text-white tabular-nums">{value}</div>
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

// ─── Mini Stat Card ────────────────────────────────────────────────────────────

function MiniStatCard({
  label,
  value,
  icon: Icon,
  iconColor,
  iconBg,
  index = 0,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  index?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.5 + index * 0.07, ease: "easeOut" }}
      className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-slate-100 dark:border-gray-700 shadow-sm flex items-center gap-3"
    >
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
        <Icon className="h-4 w-4" style={{ color: iconColor }} strokeWidth={2.5} />
      </div>
      <div className="min-w-0">
        <div className="text-xl font-black text-slate-900 dark:text-white tabular-nums leading-tight">{value}</div>
        <div className="text-xs text-slate-500 dark:text-gray-400 truncate">{label}</div>
      </div>
    </motion.div>
  );
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
      <span className="h-5 w-1 rounded-full bg-primary" />
      <h2 className="font-bold text-slate-800 dark:text-white text-base">{children}</h2>
    </div>
  );
}

// ─── Activity event label ──────────────────────────────────────────────────────

function activityLabel(item: ActivityItem): { text: string; dot: string } {
  const date = new Date(item.startsAt);
  const dateStr = format(date, "d MMM à HH:mm", { locale: fr });
  switch (item.status) {
    case "confirmed":
      return { text: `Nouveau RDV confirmé : ${item.patientName} — ${dateStr}`, dot: "bg-green-400" };
    case "pending":
      return { text: `Nouveau RDV en attente : ${item.patientName} — ${dateStr}`, dot: "bg-orange-400" };
    case "cancelled":
      return { text: `${item.patientName} a annulé son RDV du ${dateStr}`, dot: "bg-gray-400" };
    case "completed":
      return { text: `Consultation terminée : ${item.patientName}`, dot: "bg-blue-400" };
    case "no_show":
      return { text: `Absence notée : ${item.patientName} — ${dateStr}`, dot: "bg-red-400" };
    default:
      return { text: `Mise à jour RDV : ${item.patientName}`, dot: "bg-slate-300" };
  }
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
  verificationStatus,
  verificationNote,
  smsUsed = 0,
  smsLimit = 200,
  smsPlan = "essentiel",
  totalPatients = 0,
  monthTotal = 0,
  completionRate = null,
  averageRating = 0,
  recentActivity = [],
  waitingRoomCount = 0,
  waitingPatients = [],
}: DashboardClientProps) {
  const t = useTranslations("medecin.dashboard");
  const tStatus = useTranslations("medecin.appointments.status");

  const kpis = [
    {
      label: t("today"),
      value: todayCount,
      sublabel: t("appointments"),
      accentColor: "bg-primary",
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
      {/* Verification status banners */}
      {verificationStatus === "pending" && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl"
        >
          <Shield className="w-5 h-5 text-amber-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium text-amber-800">
              Complétez votre vérification pour apparaître dans les résultats de recherche.
            </span>
          </div>
          <Link
            href="/verification"
            className="shrink-0 text-xs font-semibold text-amber-700 hover:text-amber-900 border border-amber-300 px-3 py-1.5 rounded-lg hover:bg-amber-100 transition-colors"
          >
            Vérifier mon compte
          </Link>
        </motion.div>
      )}

      {verificationStatus === "documents_submitted" && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl"
        >
          <Clock className="w-5 h-5 text-blue-600 shrink-0" />
          <span className="text-sm font-medium text-blue-800">
            Vos documents sont en cours de vérification par notre équipe. Vous serez notifié par
            email.
          </span>
        </motion.div>
      )}

      {verificationStatus === "rejected" && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl"
        >
          <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium text-red-800">
              Vos documents ont été refusés
              {verificationNote ? ` : ${verificationNote}` : "."}
            </span>
          </div>
          <Link
            href="/verification"
            className="shrink-0 text-xs font-semibold text-red-700 hover:text-red-900 border border-red-300 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors"
          >
            Resoumettre
          </Link>
        </motion.div>
      )}

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
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">
            {t("greeting")}, Dr.{" "}
            <span className="text-primary">{doctorName}</span>
          </h1>
          <p className="text-slate-500 dark:text-gray-400 text-sm mt-1">
            {t("greetingSubtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/calendrier"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-doktori-teal-dark transition-colors"
          >
            <CalendarDays className="h-4 w-4" />
            Calendrier
          </Link>
          <Link
            href="/rendez-vous"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-gray-300 shadow-sm hover:bg-slate-50 dark:hover:bg-gray-800 transition-colors"
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

      {/* SMS Counter */}
      <SMSCounterCard
        used={smsUsed}
        limit={smsLimit}
        plan={smsPlan}
        index={kpis.length + 2}
      />

      {/* ── Quick Stats Row ─────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-4 w-4 text-primary" strokeWidth={2.5} />
          <span className="text-sm font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wide">
            Statistiques rapides
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MiniStatCard
            label="Patients total"
            value={totalPatients}
            icon={Users}
            iconColor="#0891B2"
            iconBg="bg-cyan-50"
            index={0}
          />
          <MiniStatCard
            label="RDV ce mois"
            value={monthTotal}
            icon={CalendarDays}
            iconColor="#7C3AED"
            iconBg="bg-purple-50"
            index={1}
          />
          <MiniStatCard
            label="Taux de réalisation"
            value={completionRate !== null ? `${completionRate}%` : "—"}
            icon={Activity}
            iconColor="#059669"
            iconBg="bg-emerald-50"
            index={2}
          />
          <MiniStatCard
            label="Note moyenne"
            value={averageRating > 0 ? averageRating.toFixed(1) : "—"}
            icon={Star}
            iconColor="#D97706"
            iconBg="bg-amber-50"
            index={3}
          />
        </div>
      </div>

      {/* ── Quick Actions Bar ───────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
      >
        {[
          {
            href: "/rendez-vous",
            icon: CalendarPlus,
            label: "Nouveau RDV",
            style: { background: "#0891B2", color: "#fff" },
            hoverClass: "hover:opacity-90",
          },
          {
            href: "/patients",
            icon: UserPlus,
            label: "Ajouter un patient",
            style: {},
            hoverClass: "hover:bg-slate-50 dark:hover:bg-gray-800",
            bordered: true,
          },
          {
            href: "/calendrier",
            icon: CalendarDays,
            label: "Mon calendrier",
            style: {},
            hoverClass: "hover:bg-slate-50 dark:hover:bg-gray-800",
            bordered: true,
          },
          {
            href: "/stats",
            icon: BarChart2,
            label: "Mes statistiques",
            style: {},
            hoverClass: "hover:bg-slate-50 dark:hover:bg-gray-800",
            bordered: true,
          },
        ].map(({ href, icon: Icon, label, style, hoverClass, bordered }, i) => (
          <motion.div key={href} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Link
              href={href}
              className={`flex flex-col items-center justify-center gap-2 rounded-2xl p-4 text-center text-xs font-semibold transition-all shadow-sm ${hoverClass} ${
                bordered
                  ? "bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 text-slate-700 dark:text-gray-300"
                  : "text-white"
              }`}
              style={style}
            >
              <Icon className="h-5 w-5" strokeWidth={2.5} />
              {label}
            </Link>
          </motion.div>
        ))}
      </motion.div>

      {/* Waiting room card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.28 }}
        className="rounded-2xl border border-green-100 bg-green-50 dark:bg-green-950/20 dark:border-green-900 shadow-sm overflow-hidden"
      >
        <div className="px-5 py-4 flex items-center justify-between border-b border-green-100 dark:border-green-900">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900">
              <UserCheck className="h-4 w-4 text-green-600 dark:text-green-400" strokeWidth={2.5} />
            </div>
            <span className="font-bold text-green-900 dark:text-green-200 text-sm">
              Salle d&apos;attente
            </span>
          </div>
          <span className="text-2xl font-black text-green-700 dark:text-green-300 tabular-nums">
            {waitingRoomCount}
          </span>
        </div>
        {waitingPatients.length === 0 ? (
          <div className="px-5 py-4 text-sm text-green-700/60 dark:text-green-400/60">
            Aucun patient en attente pour le moment.
          </div>
        ) : (
          <div className="divide-y divide-green-100 dark:divide-green-900">
            {waitingPatients.map((p) => {
              const waitMinutes = Math.floor((Date.now() - new Date(p.checkedInAt).getTime()) / 60000);
              return (
                <div key={p.id} className="px-5 py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-green-200 dark:bg-green-800 shrink-0">
                      <UserCheck className="h-3.5 w-3.5 text-green-700 dark:text-green-300" strokeWidth={2.5} />
                    </div>
                    <span className="text-sm font-semibold text-green-900 dark:text-green-100 truncate">
                      {p.patientName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 text-xs text-green-700 dark:text-green-400">
                    <Clock className="h-3.5 w-3.5" strokeWidth={2} />
                    <span>Arrivé à {format(new Date(p.checkedInAt), "HH:mm")}</span>
                    {waitMinutes > 0 && (
                      <span className="text-green-600/70 dark:text-green-500/70">
                        ({waitMinutes} min)
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

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
        className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-100 dark:border-gray-700 shadow-sm overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-slate-100 dark:border-gray-700">
          <SectionHeader>{t("todayAppointments")}</SectionHeader>
        </div>
        <div className="divide-y divide-slate-50 dark:divide-gray-800">
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
                  className={`flex items-center justify-between px-5 py-4 border-l-4 ${cfg.border} hover:bg-secondary transition-colors`}
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2 flex-wrap text-sm">
                      <span className="text-primary font-bold tabular-nums">
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
                    <div className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
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
        className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-100 dark:border-gray-700 shadow-sm overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-slate-100 dark:border-gray-700 flex items-center justify-between">
          <SectionHeader>{t("upcoming")}</SectionHeader>
          <Link href="/rendez-vous" className="text-xs font-semibold text-primary hover:underline">
            {t("viewAll")} →
          </Link>
        </div>
        <div className="divide-y divide-slate-50 dark:divide-gray-800">
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
                  className={`flex items-center justify-between px-5 py-4 border-l-4 ${cfg.border} hover:bg-secondary transition-colors`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    {/* Timeline dot */}
                    <div className="mt-1.5 flex h-2 w-2 shrink-0 rounded-full bg-primary/50" />
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2 flex-wrap text-sm">
                        <span className="text-slate-500 dark:text-gray-400 font-medium tabular-nums">
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
                        <div className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">{a.reason}</div>
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

      {/* ── Recent Activity Feed ────────────────────────────────────────────── */}
      {recentActivity.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-100 dark:border-gray-700 shadow-sm overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-slate-100 dark:border-gray-700">
            <SectionHeader>Activité récente</SectionHeader>
          </div>
          <div className="divide-y divide-slate-50 dark:divide-gray-800">
            {recentActivity.map((item, i) => {
              const { text, dot } = activityLabel(item);
              const updatedDate = new Date(item.updatedAt);
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.55 + i * 0.06 }}
                  className="flex items-start gap-3 px-5 py-3.5"
                >
                  <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dot}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-700 dark:text-gray-300 leading-snug">{text}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {format(updatedDate, "d MMM à HH:mm", { locale: fr })}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}
