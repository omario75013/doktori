"use client";

import useSWR from "swr";
import { Award, Star, Users2, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

type BenchmarkResponse = {
  available: boolean;
  reason?: string;
  specialty?: string;
  city?: string;
  cohortSize?: number;
  metrics?: {
    noShowRate: number | null;
    noShowRank: number | null;
    avgRating: number | null;
    ratingRank: number | null;
    appointments30d: number | null;
    appointmentsRank: number | null;
  };
  computedAt?: string;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const SPECIALTY_LABELS: Record<string, string> = {
  generaliste: "médecine générale",
  cardiologie: "cardiologie",
  dermatologie: "dermatologie",
  pediatrie: "pédiatrie",
  gynecologie: "gynécologie",
  ophtalmologie: "ophtalmologie",
  orl: "ORL",
  psychiatrie: "psychiatrie",
  neurologie: "neurologie",
  rhumatologie: "rhumatologie",
  endocrinologie: "endocrinologie",
  gastroenterologie: "gastro-entérologie",
  pneumologie: "pneumologie",
  urologie: "urologie",
  radiologie: "radiologie",
  chirurgie: "chirurgie",
  dentiste: "dentaire",
};

function ordinal(n: number): string {
  if (n === 1) return "1er";
  return `${n}e`;
}

function specialtyLabel(slug?: string): string {
  if (!slug) return "votre spécialité";
  return SPECIALTY_LABELS[slug] ?? slug;
}

function quartileBadge(rank: number, total: number): { label: string; tone: string } {
  if (total < 4) return { label: "", tone: "" };
  const pct = rank / total;
  if (pct <= 0.25) return { label: "Top 25%", tone: "bg-green-100 text-green-700" };
  if (pct <= 0.5) return { label: "Top 50%", tone: "bg-teal-100 text-teal-700" };
  if (pct <= 0.75) return { label: "Médiane haute", tone: "bg-amber-100 text-amber-700" };
  return { label: "À améliorer", tone: "bg-orange-100 text-orange-700" };
}

function RankCard({
  label,
  rank,
  total,
  value,
  icon: Icon,
  index,
}: {
  label: string;
  rank: number | null;
  total: number;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  index: number;
}) {
  const hasRank = typeof rank === "number" && rank > 0 && total > 0;
  const badge = hasRank ? quartileBadge(rank!, total) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.07 }}
      className="rounded-2xl border border-border bg-white dark:bg-gray-900 dark:border-gray-700 p-5 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide font-medium text-gray-500 dark:text-gray-400">
            {label}
          </p>
          {hasRank ? (
            <p className="text-2xl font-bold mt-1.5 text-foreground dark:text-white">
              {ordinal(rank!)}{" "}
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                / {total}
              </span>
            </p>
          ) : (
            <p className="text-2xl font-bold mt-1.5 text-gray-400">—</p>
          )}
          <p className="text-xs text-gray-400 mt-1">{value}</p>
          {badge && badge.label && (
            <span
              className={`inline-block mt-2 px-2 py-0.5 rounded-full text-[11px] font-medium ${badge.tone}`}
            >
              {badge.label}
            </span>
          )}
        </div>
        <div className="h-10 w-10 rounded-xl bg-secondary dark:bg-gray-800 flex items-center justify-center shrink-0 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </motion.div>
  );
}

export function PeerBenchmarks() {
  const { data, isLoading } = useSWR<BenchmarkResponse>(
    "/api/medecin/benchmarks",
    fetcher,
    { revalidateOnFocus: false }
  );

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-border bg-white dark:bg-gray-900 dark:border-gray-700 p-5 h-[140px] animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (!data || !data.available) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 p-6 text-center">
        <Users2 className="h-8 w-8 mx-auto text-gray-400 mb-2" />
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Comparaison disponible dès que d&apos;autres médecins de votre
          spécialité dans votre ville auront rejoint Doktori.
        </p>
      </div>
    );
  }

  const { metrics, cohortSize = 0 } = data;
  const total = cohortSize;
  const noShowRate = metrics?.noShowRate ?? 0;
  const avgRating = metrics?.avgRating ?? 0;
  const apptCount = metrics?.appointments30d ?? 0;
  const noShowRank = metrics?.noShowRank ?? null;

  // Headline sentence — only shown when we have a clear top performer
  const headline =
    noShowRank && noShowRank <= 3 && total >= 5
      ? `Vous êtes ${ordinal(noShowRank)} sur ${total} médecins en ${specialtyLabel(
          data.specialty
        )} à ${data.city ?? "votre ville"} pour la ponctualité.`
      : `Vous êtes comparé(e) à ${total - 1} confrères en ${specialtyLabel(
          data.specialty
        )} à ${data.city ?? "votre ville"}.`;

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
        {headline}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <RankCard
          label="Ponctualité"
          rank={noShowRank}
          total={total}
          value={`${noShowRate.toFixed(1)}% de no-show`}
          icon={Award}
          index={0}
        />
        <RankCard
          label="Satisfaction"
          rank={metrics?.ratingRank ?? null}
          total={total}
          value={
            avgRating > 0
              ? `${avgRating.toFixed(2)} / 5 en moyenne`
              : "Pas encore d'avis"
          }
          icon={Star}
          index={1}
        />
        <RankCard
          label="Activité 30 j"
          rank={metrics?.appointmentsRank ?? null}
          total={total}
          value={`${apptCount} rendez-vous`}
          icon={TrendingUp}
          index={2}
        />
      </div>
      <p className="text-xs text-gray-400 dark:text-gray-500">
        Les données des autres médecins ne sont jamais affichées — seul votre
        rang relatif est visible.
      </p>
    </div>
  );
}
