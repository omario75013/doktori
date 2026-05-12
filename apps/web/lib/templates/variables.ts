/**
 * Template variable registry for prescription / document templates.
 *
 * 24 variables across 4 categories:
 *   Patient (13) | Doctor (6) | Appointment (2) | System (3)
 */

// ── Context types ─────────────────────────────────────────────────────────────

export interface PatientCtx {
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  cin?: string | null;
  dateOfBirth?: Date | string | null;
  weightKg?: string | number | null;
  heightCm?: number | null;
  bloodType?: string | null;
  insuranceProvider?: string | null;
  allergies?: string | string[] | null;
}

export interface DoctorCtx {
  name?: string | null;
  specialty?: string | null;
  city?: string | null;
  phone?: string | null;
  address?: string | null;
  registrationNumber?: string | null;
}

export interface PracticeCtx {
  address?: string | null;
  city?: string | null;
  phone?: string | null;
}

export interface AppointmentCtx {
  startsAt?: Date | string | null;
  type?: string | null;
}

export interface TemplateContext {
  patient?: PatientCtx | null;
  doctor?: DoctorCtx | null;
  practice?: PracticeCtx | null;
  appointment?: AppointmentCtx | null;
  locale?: string;
  now?: Date;
}

// ── Variable format tags (used by render.ts for locale-aware formatting) ──────

export type VariableFormat =
  | "date_short"    // e.g. 03/05/2026
  | "date_long"     // e.g. 3 mai 2026
  | "time"          // e.g. 10:30
  | "number"
  | "text";

// ── Registry entry ────────────────────────────────────────────────────────────

export interface VariableEntry {
  format?: VariableFormat;
  resolve: (ctx: TemplateContext) => unknown;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Compute age in full years at a reference date.
 * Returns null when dob is null/undefined.
 */
export function computeAge(dob: Date | string, ref: Date): number {
  const birth = dob instanceof Date ? dob : new Date(dob);
  let age = ref.getFullYear() - birth.getFullYear();
  const m = ref.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age;
}

function nullIfEmpty(v: unknown): unknown {
  if (v === null || v === undefined || v === "") return null;
  if (Array.isArray(v) && v.length === 0) return null;
  return v;
}

// ── Registry ──────────────────────────────────────────────────────────────────

export const TEMPLATE_VARIABLES: Record<string, VariableEntry> = {
  // ── Patient (13) ────────────────────────────────────────────────────────────
  first_name: {
    format: "text",
    resolve: (ctx) => nullIfEmpty(ctx.patient?.firstName),
  },
  last_name: {
    format: "text",
    resolve: (ctx) => nullIfEmpty(ctx.patient?.lastName),
  },
  full_name: {
    format: "text",
    resolve: (ctx) => {
      const p = ctx.patient;
      if (!p) return null;
      const parts = [p.firstName, p.lastName].filter(Boolean);
      return parts.length > 0 ? parts.join(" ") : null;
    },
  },
  age: {
    format: "number",
    resolve: (ctx) => {
      const dob = ctx.patient?.dateOfBirth;
      if (!dob) return null;
      return computeAge(dob, ctx.now ?? new Date());
    },
  },
  age_at_appointment: {
    format: "number",
    resolve: (ctx) => {
      const dob = ctx.patient?.dateOfBirth;
      if (!dob) return null;
      const ref = ctx.appointment?.startsAt
        ? ctx.appointment.startsAt instanceof Date
          ? ctx.appointment.startsAt
          : new Date(ctx.appointment.startsAt)
        : ctx.now ?? new Date();
      return computeAge(dob, ref);
    },
  },
  dob: {
    format: "date_short",
    resolve: (ctx) => {
      const dob = ctx.patient?.dateOfBirth;
      if (!dob) return null;
      return dob instanceof Date ? dob : new Date(dob);
    },
  },
  phone: {
    format: "text",
    resolve: (ctx) => nullIfEmpty(ctx.patient?.phone),
  },
  cin: {
    format: "text",
    resolve: (ctx) => nullIfEmpty(ctx.patient?.cin),
  },
  weight: {
    resolve: (ctx) => nullIfEmpty(ctx.patient?.weightKg),
  },
  height: {
    resolve: (ctx) => nullIfEmpty(ctx.patient?.heightCm),
  },
  blood_type: {
    format: "text",
    resolve: (ctx) => nullIfEmpty(ctx.patient?.bloodType),
  },
  allergies: {
    format: "text",
    resolve: (ctx) => {
      const v = ctx.patient?.allergies;
      if (v === null || v === undefined) return null;
      if (Array.isArray(v)) {
        const filtered = v.filter(Boolean);
        return filtered.length > 0 ? filtered.join(", ") : null;
      }
      return nullIfEmpty(v);
    },
  },
  insurance: {
    format: "text",
    resolve: (ctx) => nullIfEmpty(ctx.patient?.insuranceProvider),
  },

  // ── Doctor (6) ──────────────────────────────────────────────────────────────
  doctor_name: {
    format: "text",
    resolve: (ctx) => nullIfEmpty(ctx.doctor?.name),
  },
  doctor_specialty: {
    format: "text",
    resolve: (ctx) => nullIfEmpty(ctx.doctor?.specialty),
  },
  doctor_city: {
    format: "text",
    resolve: (ctx) => nullIfEmpty(ctx.doctor?.city),
  },
  doctor_phone: {
    format: "text",
    resolve: (ctx) => nullIfEmpty(ctx.doctor?.phone),
  },
  doctor_address: {
    format: "text",
    resolve: (ctx) => {
      // prefer practice address when available
      const practice = ctx.practice?.address;
      if (practice) return practice;
      return nullIfEmpty(ctx.doctor?.address);
    },
  },
  doctor_registration: {
    format: "text",
    resolve: (ctx) => nullIfEmpty(ctx.doctor?.registrationNumber),
  },

  // ── Appointment (2) ─────────────────────────────────────────────────────────
  appointment_date: {
    format: "date_short",
    resolve: (ctx) => {
      const s = ctx.appointment?.startsAt;
      if (!s) return null;
      return s instanceof Date ? s : new Date(s);
    },
  },
  appointment_type: {
    format: "text",
    resolve: (ctx) => nullIfEmpty(ctx.appointment?.type),
  },

  // ── System (3) ──────────────────────────────────────────────────────────────
  today: {
    format: "date_short",
    resolve: (ctx) => ctx.now ?? new Date(),
  },
  today_long: {
    format: "date_long",
    resolve: (ctx) => ctx.now ?? new Date(),
  },
  time: {
    format: "time",
    resolve: (ctx) => ctx.now ?? new Date(),
  },
};

// ── Aliases ───────────────────────────────────────────────────────────────────
// Common alternative names some templates use; resolved to the canonical entry.
export const VARIABLE_ALIASES: Record<string, string> = {
  patient_first_name: "first_name",
  patient_last_name: "last_name",
  patient_full_name: "full_name",
  patient_phone: "phone",
  patient_age: "age",
  patient_dob: "dob",
  patient_cin: "cin",
  date_today: "today",
  date_today_long: "today_long",
};

// ── Public resolver ───────────────────────────────────────────────────────────

/**
 * Resolve a single variable by name against a context.
 * Returns null for unknown names or when the value is absent.
 */
export function resolveVariable(name: string, ctx: TemplateContext): unknown {
  const canonical = VARIABLE_ALIASES[name] ?? name;
  const entry = TEMPLATE_VARIABLES[canonical];
  if (!entry) return null;
  const value = entry.resolve(ctx);
  return nullIfEmpty(value);
}
