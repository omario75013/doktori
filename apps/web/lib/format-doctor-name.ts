/**
 * Strip a leading "Dr. " or "Dr " prefix from a doctor name.
 * Seed data already contains "Dr. Sami Bouaziz"; some UI components
 * also add "Dr." — this prevents "Dr. Dr. Sami Bouaziz" duplication.
 */
export function stripDrPrefix(name: string): string {
  return name.replace(/^Dr\.?\s+/i, "").trim();
}

/**
 * Display a doctor name with exactly one "Dr. " prefix.
 * Safe to call even if the name already starts with "Dr.".
 */
export function formatDoctorName(name: string): string {
  return `Dr. ${stripDrPrefix(name)}`;
}
