export const SOS_STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  accepted: "Acceptée",
  completed: "Terminée",
  expired: "Expirée",
  cancelled: "Annulée",
};

export const SOS_STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  accepted: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  expired: "bg-slate-100 text-slate-600",
  cancelled: "bg-red-100 text-red-800",
};

export const SYMPTOM_OPTIONS = [
  { value: "fievre", label: "Fièvre" },
  { value: "douleur", label: "Douleur aiguë" },
  { value: "enfant", label: "Enfant malade" },
  { value: "autre", label: "Autre" },
] as const;

/**
 * Format millimes to Tunisian Dinar string.
 * @param millimes - amount in millimes (DT × 1000)
 * @param decimals - decimal places (default 0)
 */
export function formatDT(millimes: number | null | undefined, decimals = 0): string {
  if (millimes == null) return "—";
  return `${(millimes / 1000).toFixed(decimals)} DT`;
}

/** SWR fetcher — shared across all admin SOS client components. */
export const sosFetcher = (url: string) => fetch(url).then((r) => r.json());

/** Format elapsed time from an ISO timestamp to a human-readable string. */
export function formatElapsed(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)} min`;
  const hrs = Math.floor(diff / 3600);
  const mins = Math.floor((diff % 3600) / 60);
  return `${hrs}h${mins > 0 ? ` ${mins}min` : ""}`;
}

/** Format duration in milliseconds. */
export function formatDuration(ms: number | null | undefined): string {
  if (ms == null) return "—";
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)}h ${mins % 60}min`;
}
