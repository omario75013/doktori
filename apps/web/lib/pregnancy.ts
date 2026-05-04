import { differenceInDays } from "date-fns";

/**
 * Compute current pregnancy week from due date.
 * Standard obstetric calculation: 280 days (40 weeks) from start to due date.
 * Returns 1..40 (clamped). Returns null if dueDate is invalid or > 280 days future.
 */
export function computePregnancyWeek(dueDate: Date | string, now: Date = new Date()): number | null {
  const due = typeof dueDate === "string" ? new Date(dueDate) : dueDate;
  if (isNaN(due.getTime())) return null;
  const daysUntilDue = differenceInDays(due, now);
  // Negative = past due. Positive = future.
  // Pregnancy length is 280 days. Current day = 280 - daysUntilDue.
  const dayOfPregnancy = 280 - daysUntilDue;
  if (dayOfPregnancy < 0) return null;
  const week = Math.floor(dayOfPregnancy / 7) + 1;
  return Math.max(1, Math.min(week, 42));
}

/** Find the closest available pregnancy_week_content entry. */
export function findClosestWeek(currentWeek: number, availableWeeks: number[]): number | null {
  if (availableWeeks.length === 0) return null;
  return availableWeeks.reduce((closest, w) =>
    Math.abs(w - currentWeek) < Math.abs(closest - currentWeek) ? w : closest
  );
}
