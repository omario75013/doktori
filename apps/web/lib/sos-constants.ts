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
