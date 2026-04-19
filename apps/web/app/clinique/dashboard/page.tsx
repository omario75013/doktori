"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Users, CalendarCheck, UserX, Activity, TrendingUp, Stethoscope } from "lucide-react";
import { motion } from "framer-motion";

interface DoctorStat {
  doctorId: string;
  name: string;
  specialty: string;
  role: string;
  appointmentsThisMonth: number;
  todayCount?: number;
}

interface ClinicStats {
  clinic: {
    id: string;
    name: string;
    slug: string;
    city: string;
    plan: string;
  };
  totalDoctors: number;
  totalAppointmentsThisMonth: number;
  perDoctor: DoctorStat[];
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-border animate-pulse">
      <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded mb-3" />
      <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
      <div className="h-3 w-24 bg-gray-100 dark:bg-gray-700 rounded" />
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="p-4 flex items-center justify-between animate-pulse">
      <div className="space-y-2">
        <div className="h-4 w-36 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-3 w-24 bg-gray-100 dark:bg-gray-700 rounded" />
      </div>
      <div className="h-8 w-10 bg-gray-200 dark:bg-gray-700 rounded" />
    </div>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sublabel,
  icon: Icon,
  iconColor,
  accentColor,
  index = 0,
}: {
  label: string;
  value: string | number;
  sublabel: string;
  icon: React.ElementType;
  iconColor: string;
  accentColor: string;
  index?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.1 + index * 0.08, ease: "easeOut" }}
      className="relative bg-white dark:bg-gray-900 rounded-2xl p-5 border border-border shadow-sm overflow-hidden"
    >
      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl ${accentColor}`} />
      <div className="flex items-start justify-between gap-3 pl-3">
        <div className="min-w-0">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="text-3xl font-black mt-1.5 text-foreground tabular-nums">{value}</div>
          <div className="text-xs text-muted-foreground/70 mt-1">{sublabel}</div>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-opacity-10" style={{ background: `${iconColor}15` }}>
          <Icon className="h-5 w-5" style={{ color: iconColor }} strokeWidth={2.5} />
        </div>
      </div>
    </motion.div>
  );
}

// ── Doctor Card ───────────────────────────────────────────────────────────────

function DoctorCard({ doc, maxMonth, index }: { doc: DoctorStat; maxMonth: number; index: number }) {
  const pct = maxMonth > 0 ? Math.round((doc.appointmentsThisMonth / maxMonth) * 100) : 0;
  const initials = doc.name
    .split(" ")
    .slice(0, 2)
    .map((s) => s[0])
    .join("")
    .toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.35 + index * 0.07, ease: "easeOut" }}
      className="p-4 flex items-center gap-4"
    >
      {/* Avatar */}
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-black text-white"
        style={{ background: "#0891B2" }}
      >
        {initials}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-foreground text-sm">{doc.name}</span>
          {doc.role === "admin" && (
            <span className="text-xs px-1.5 py-0.5 rounded font-bold" style={{ background: "#E0F2FE", color: "#0891B2" }}>
              Admin
            </span>
          )}
        </div>
        <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
          <Stethoscope className="h-3 w-3 shrink-0" />
          {doc.specialty}
        </div>
        {/* Progress bar for this month's appointments */}
        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-slate-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.6, delay: 0.4 + index * 0.07, ease: "easeOut" }}
              className="h-full rounded-full"
              style={{ background: "#0891B2" }}
            />
          </div>
          <span className="text-xs text-muted-foreground tabular-nums shrink-0">{pct}%</span>
        </div>
      </div>

      {/* Count */}
      <div className="text-right shrink-0">
        <div className="text-2xl font-black text-foreground tabular-nums">
          {doc.appointmentsThisMonth}
        </div>
        <div className="text-xs text-muted-foreground">RDV mois</div>
      </div>
    </motion.div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

export default function CliniqueDashboardPage() {
  const { data: session, status } = useSession();
  const [stats, setStats] = useState<ClinicStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clinicId = session?.user?.id ?? null;

  useEffect(() => {
    if (!clinicId) return;

    setLoading(true);
    setError(null);

    fetch(`/api/clinics/stats?id=${encodeURIComponent(clinicId)}`)
      .then((res) => {
        if (!res.ok) return res.json().then((d: { error: string }) => Promise.reject(d.error));
        return res.json() as Promise<ClinicStats>;
      })
      .then((data) => setStats(data))
      .catch((err: string) => setError(err ?? "Erreur inconnue"))
      .finally(() => setLoading(false));
  }, [clinicId]);

  // Session still loading
  if (status === "loading" || (status === "authenticated" && loading && !stats)) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-7 w-56 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
          <div className="h-4 w-40 bg-gray-100 dark:bg-gray-700 rounded" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl border dark:border-gray-700">
          <div className="p-4 border-b animate-pulse">
            <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
          {[1, 2, 3].map((i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20 text-red-500 text-sm">
        Erreur : {error}
      </div>
    );
  }

  if (!stats) return null;

  const { clinic, totalDoctors, totalAppointmentsThisMonth, perDoctor } = stats;

  const maxMonth = Math.max(...perDoctor.map((d) => d.appointmentsThisMonth), 1);

  const now = new Date();
  const monthLabel = format(now, "MMMM yyyy", { locale: fr });

  // Top performer this month
  const topDoctor = perDoctor.length > 0
    ? perDoctor.reduce((a, b) => (a.appointmentsThisMonth >= b.appointmentsThisMonth ? a : b))
    : null;

  // Average per doctor
  const avgPerDoctor = totalDoctors > 0 ? Math.round(totalAppointmentsThisMonth / totalDoctors) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <h1 className="text-2xl font-black text-foreground">{clinic.name}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {clinic.city} · Plan{" "}
          <span className="capitalize font-medium">{clinic.plan}</span>
          {" · "}
          <span className="capitalize">{monthLabel}</span>
        </p>
      </motion.div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard
          label="Médecins"
          value={totalDoctors}
          sublabel="dans la clinique"
          icon={Users}
          iconColor="#0891B2"
          accentColor="bg-cyan-500"
          index={0}
        />
        <KpiCard
          label="RDV ce mois"
          value={totalAppointmentsThisMonth}
          sublabel="total agrégé"
          icon={CalendarCheck}
          iconColor="#7C3AED"
          accentColor="bg-purple-500"
          index={1}
        />
        <KpiCard
          label="Moy. par médecin"
          value={avgPerDoctor}
          sublabel="RDV / médecin"
          icon={Activity}
          iconColor="#059669"
          accentColor="bg-emerald-500"
          index={2}
        />
        <KpiCard
          label="Top médecin"
          value={topDoctor ? topDoctor.appointmentsThisMonth : "—"}
          sublabel={topDoctor ? topDoctor.name.split(" ")[0] : ""}
          icon={TrendingUp}
          iconColor="#D97706"
          accentColor="bg-amber-500"
          index={3}
        />
      </div>

      {/* Per-doctor breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
        className="bg-white dark:bg-gray-900 rounded-2xl border dark:border-gray-700 border-border shadow-sm overflow-hidden"
      >
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" style={{ color: "#0891B2" }} strokeWidth={2.5} />
            <h2 className="font-bold text-foreground">
              Médecins — mois en cours
            </h2>
          </div>
          <span className="text-xs text-muted-foreground capitalize">{monthLabel}</span>
        </div>
        <div className="divide-y divide-border">
          {perDoctor.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <UserX className="h-10 w-10 mb-3 text-gray-200" strokeWidth={1.5} />
              <p className="font-medium text-sm">Aucun médecin associé</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Ajoutez des médecins dans les Paramètres.
              </p>
            </div>
          ) : (
            perDoctor.map((doc, i) => (
              <DoctorCard key={doc.doctorId} doc={doc} maxMonth={maxMonth} index={i} />
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
}
