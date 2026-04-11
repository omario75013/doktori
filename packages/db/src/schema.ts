import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  time,
  date,
  doublePrecision,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export type DoctorEducation = {
  degree: string;
  institution: string;
  year: number;
};

export type DoctorExperience = {
  role: string;
  place: string;
  startYear: number;
  endYear: number | null;
};

// ─── Doctors ─────────────────────────────────────────────────────────────────

export const doctors = pgTable(
  "doctors",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    phone: varchar("phone", { length: 30 }).notNull(),
    specialty: varchar("specialty", { length: 100 }).notNull(),
    city: varchar("city", { length: 100 }).notNull(),
    address: text("address").notNull(),
    photoUrl: text("photo_url"),
    bio: text("bio"),
    educations: jsonb("educations").$type<DoctorEducation[]>().notNull().default([]),
    experiences: jsonb("experiences").$type<DoctorExperience[]>().notNull().default([]),
    languages: jsonb("languages").$type<string[]>().notNull().default([]),
    expertise: jsonb("expertise").$type<string[]>().notNull().default([]),
    yearsOfExperience: integer("years_of_experience"),
    // Stored in millimes (DT × 1000), e.g. 50000 = 50 DT
    consultationFee: integer("consultation_fee"),
    latitude: varchar("latitude", { length: 30 }),
    longitude: varchar("longitude", { length: 30 }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("doctors_email_idx").on(table.email),
    uniqueIndex("doctors_slug_idx").on(table.slug),
    index("doctors_specialty_city_idx").on(table.specialty, table.city),
  ]
);

// ─── Doctor Practices ─────────────────────────────────────────────────────────
// A doctor can have multiple practice locations (cabinets).
// doctors.address/city/latitude/longitude/phone are kept for backwards compat.

export const doctorPractices = pgTable(
  "doctor_practices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    doctorId: uuid("doctor_id")
      .notNull()
      .references(() => doctors.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(),
    address: text("address").notNull(),
    city: varchar("city", { length: 100 }).notNull(),
    latitude: varchar("latitude", { length: 30 }),
    longitude: varchar("longitude", { length: 30 }),
    phone: varchar("phone", { length: 30 }),
    isPrimary: boolean("is_primary").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("doctor_practices_doctor_idx").on(table.doctorId),
  ]
);

// ─── Doctor Schedules ─────────────────────────────────────────────────────────

export const doctorSchedules = pgTable("doctor_schedules", {
  id: uuid("id").primaryKey().defaultRandom(),
  doctorId: uuid("doctor_id")
    .notNull()
    .references(() => doctors.id, { onDelete: "cascade" }),
  // 0 = Sunday … 6 = Saturday
  dayOfWeek: integer("day_of_week").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  // Slot duration in minutes (10, 15, 20, 30, 45, 60)
  slotDuration: integer("slot_duration").notNull().default(20),
  isActive: boolean("is_active").notNull().default(true),
  // nullable — backfilled to primary practice by migration 0024
  practiceId: uuid("practice_id"),
});

// ─── Patients ─────────────────────────────────────────────────────────────────

export const patients = pgTable(
  "patients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
    phone: varchar("phone", { length: 30 }).notNull(),
    email: varchar("email", { length: 255 }),
    dateOfBirth: date("date_of_birth"),
    gender: varchar("gender", { length: 10 }),
    bloodType: varchar("blood_type", { length: 5 }),
    cnamNumber: varchar("cnam_number", { length: 20 }),
    noShowCount: integer("no_show_count").notNull().default(0),
    lastMinuteCancelCount: integer("last_minute_cancel_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("patients_phone_idx").on(table.phone)]
);

// ─── Patient Medical Profile (1:1 with patients) ─────────────────────────────
export const patientMedicalProfile = pgTable(
  "patient_medical_profile",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    allergies: text("allergies"),
    chronicConditions: text("chronic_conditions"),
    currentMeds: text("current_meds"),
    notes: text("notes"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("patient_medical_profile_patient_uidx").on(table.patientId)]
);

// ─── Patient Dependents ──────────────────────────────────────────────────────
// A patient (phone-verified account holder) can book appointments on behalf of
// dependents (children, elderly parents, spouse). Appointment.dependentId points
// here when the beneficiary differs from the account holder.

export const patientDependents = pgTable(
  "patient_dependents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    dateOfBirth: date("date_of_birth"),
    gender: varchar("gender", { length: 10 }),
    relation: varchar("relation", { length: 30 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("patient_dependents_patient_idx").on(table.patientId)]
);

// ─── OTP Codes ────────────────────────────────────────────────────────────────

export const otpCodes = pgTable("otp_codes", {
  id: uuid("id").primaryKey().defaultRandom(),
  phone: varchar("phone", { length: 30 }).notNull(),
  code: varchar("code", { length: 10 }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  used: boolean("used").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Appointments ─────────────────────────────────────────────────────────────

export const appointments = pgTable(
  "appointments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    doctorId: uuid("doctor_id")
      .notNull()
      .references(() => doctors.id, { onDelete: "restrict" }),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "restrict" }),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    type: varchar("type", { length: 20 }).notNull().default("cabinet"),
    appointmentTypeId: uuid("appointment_type_id"),
    dependentId: uuid("dependent_id"),
    // nullable — backfilled to primary practice by migration 0024
    practiceId: uuid("practice_id"),
    reason: text("reason"),
    notes: text("notes"),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("appointments_doctor_date_idx").on(table.doctorId, table.startsAt),
    index("appointments_patient_idx").on(table.patientId),
    index("appointments_status_idx").on(table.status),
  ]
);

// ─── SMS Logs ─────────────────────────────────────────────────────────────────

export const smsLogs = pgTable("sms_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  recipient: varchar("recipient", { length: 30 }).notNull(),
  message: text("message").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  provider: varchar("provider", { length: 50 }),
  // Cost in millimes
  cost: integer("cost"),
  appointmentId: uuid("appointment_id").references(() => appointments.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── Home Visit Settings ──────────────────────────────────
export const doctorHomeVisitSettings = pgTable("doctor_home_visit_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  doctorId: uuid("doctor_id").notNull().references(() => doctors.id, { onDelete: "cascade" }).unique(),
  isAvailable: boolean("is_available").default(false).notNull(),
  radiusKm: integer("radius_km").default(5).notNull(),
  fee: integer("fee").notNull(), // in millimes (DT × 1000)
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ── Waitlist ─────────────────────────────────────────────
// source: 'patient' — patient asked to be notified if a slot frees up
//         'follow_up' — doctor scheduled a follow-up reminder for this date
export const waitlist = pgTable("waitlist", {
  id: uuid("id").primaryKey().defaultRandom(),
  doctorId: uuid("doctor_id").notNull().references(() => doctors.id, { onDelete: "cascade" }),
  patientId: uuid("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
  preferredDate: varchar("preferred_date", { length: 10 }).notNull(), // YYYY-MM-DD
  source: varchar("source", { length: 20 }).notNull().default("patient"),
  appointmentId: uuid("appointment_id"),
  notifiedAt: timestamp("notified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("waitlist_doctor_date_idx").on(table.doctorId, table.preferredDate),
  index("waitlist_patient_idx").on(table.patientId),
  index("waitlist_source_date_idx").on(table.source, table.preferredDate),
]);

// ── Reviews ──────────────────────────────────────────────
// status lifecycle: pending (just posted) → published (admin-approved) | rejected
export const reviews = pgTable("reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  doctorId: uuid("doctor_id").notNull().references(() => doctors.id, { onDelete: "cascade" }),
  patientId: uuid("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
  appointmentId: uuid("appointment_id").notNull().references(() => appointments.id, { onDelete: "cascade" }).unique(),
  rating: integer("rating").notNull(), // 1-5
  comment: text("comment"),
  verified: boolean("verified").default(true).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("reviews_doctor_idx").on(table.doctorId),
  index("reviews_rating_idx").on(table.rating),
  index("reviews_status_idx").on(table.status),
]);

// ── Secretaries ──────────────────────────────────────────
export const secretaries = pgTable("secretaries", {
  id: uuid("id").primaryKey().defaultRandom(),
  doctorId: uuid("doctor_id").notNull().references(() => doctors.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  passwordHash: text("password_hash").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("secretaries_email_idx").on(table.email),
  index("secretaries_doctor_idx").on(table.doctorId),
]);

// ── Referrals ────────────────────────────────────────────
export const doctorReferralCodes = pgTable("doctor_referral_codes", {
  id: uuid("id").primaryKey().defaultRandom(),
  doctorId: uuid("doctor_id").notNull().references(() => doctors.id, { onDelete: "cascade" }).unique(),
  code: varchar("code", { length: 20 }).notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const referrals = pgTable("referrals", {
  id: uuid("id").primaryKey().defaultRandom(),
  referrerId: uuid("referrer_id").notNull().references(() => doctors.id, { onDelete: "cascade" }),
  referredId: uuid("referred_id").notNull().references(() => doctors.id, { onDelete: "cascade" }).unique(),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending | validated | rewarded
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  validatedAt: timestamp("validated_at", { withTimezone: true }),
}, (table) => [
  index("referrals_referrer_idx").on(table.referrerId),
]);

// ── Clinics ──────────────────────────────────────────────
export const clinics = pgTable("clinics", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  address: text("address").notNull(),
  city: varchar("city", { length: 50 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  logoUrl: text("logo_url"),
  plan: varchar("plan", { length: 20 }).notNull().default("free"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const clinicDoctors = pgTable("clinic_doctors", {
  id: uuid("id").primaryKey().defaultRandom(),
  clinicId: uuid("clinic_id").notNull().references(() => clinics.id, { onDelete: "cascade" }),
  doctorId: uuid("doctor_id").notNull().references(() => doctors.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 20 }).notNull().default("member"), // admin | member
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("clinic_doctors_unique_idx").on(table.clinicId, table.doctorId),
  index("clinic_doctors_clinic_idx").on(table.clinicId),
]);

// ── Premium Visibility ────────────────────────────────────
export const doctorPremium = pgTable("doctor_premium", {
  id: uuid("id").primaryKey().defaultRandom(),
  doctorId: uuid("doctor_id").notNull().references(() => doctors.id, { onDelete: "cascade" }).unique(),
  isActive: boolean("is_active").default(false).notNull(),
  until: timestamp("until", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ── Push Tokens ──────────────────────────────────────────
export const pushTokens = pgTable("push_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientId: uuid("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  platform: varchar("platform", { length: 10 }).notNull(), // ios | android
  deviceId: varchar("device_id", { length: 255 }),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("push_tokens_patient_idx").on(table.patientId),
]);

// ── Appointment Types ────────────────────────────────────
export const appointmentTypes = pgTable("appointment_types", {
  id: uuid("id").primaryKey().defaultRandom(),
  doctorId: uuid("doctor_id").notNull().references(() => doctors.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(), // e.g. "Première consultation"
  durationMinutes: integer("duration_minutes").notNull(),
  fee: integer("fee"), // in millimes (nullable — fallback to doctor's consultationFee)
  color: varchar("color", { length: 20 }).default("#2563eb").notNull(),
  isDefault: boolean("is_default").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("appointment_types_doctor_idx").on(table.doctorId),
]);

// ── Appointment Type Questions (G3) ─────────────────────────────────────────
// Doctors define per-appointment-type intake questions shown to patients
// before they confirm a booking.
export const appointmentTypeQuestions = pgTable(
  "appointment_type_questions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    appointmentTypeId: uuid("appointment_type_id")
      .notNull()
      .references(() => appointmentTypes.id, { onDelete: "cascade" }),
    label: varchar("label", { length: 500 }).notNull(),
    // 'text' | 'choice' | 'file' | 'yesno'
    kind: varchar("kind", { length: 20 }).notNull(),
    // Array of strings for kind='choice'
    choices: jsonb("choices").$type<string[]>(),
    required: boolean("required").notNull().default(false),
    displayOrder: integer("display_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("atq_type_order_idx").on(table.appointmentTypeId, table.displayOrder),
  ]
);

// ── Appointment Answers (G3) ─────────────────────────────────────────────────
// Patient answers to questionnaire questions, stored alongside the booking.
// file_url is null for MVP — R2 upload wiring is a follow-up task.
export const appointmentAnswers = pgTable(
  "appointment_answers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    appointmentId: uuid("appointment_id")
      .notNull()
      .references(() => appointments.id, { onDelete: "cascade" }),
    questionId: uuid("question_id")
      .notNull()
      .references(() => appointmentTypeQuestions.id, { onDelete: "cascade" }),
    value: text("value"),
    // TODO: populated by R2 upload endpoint once storage is wired (follow-up)
    fileUrl: text("file_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("appointment_answers_unique_idx").on(table.appointmentId, table.questionId),
  ]
);

// ── CNAM Claims (Tunisia tiers-payant) ────────────────────
// Each claim represents a bordereau that the doctor fills for a CNAM-covered
// consultation. It is printed (via /cnam/[id]/print) and submitted to CNAM by
// the cabinet, either on paper or batched via CSV export.
export const cnamClaims = pgTable("cnam_claims", {
  id: uuid("id").primaryKey().defaultRandom(),
  appointmentId: uuid("appointment_id")
    .notNull()
    .references(() => appointments.id, { onDelete: "cascade" }),
  doctorId: uuid("doctor_id")
    .notNull()
    .references(() => doctors.id, { onDelete: "cascade" }),
  patientId: uuid("patient_id")
    .notNull()
    .references(() => patients.id, { onDelete: "cascade" }),
  cnamNumber: varchar("cnam_number", { length: 20 }).notNull(),
  patientRole: varchar("patient_role", { length: 20 }).notNull().default("assure"),
  amount: integer("amount").notNull(), // millimes
  consultationDate: date("consultation_date").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("draft"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  reimbursedAt: timestamp("reimbursed_at", { withTimezone: true }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("cnam_claims_appointment_uidx").on(table.appointmentId),
  index("cnam_claims_doctor_month_idx").on(table.doctorId, table.consultationDate),
  index("cnam_claims_status_idx").on(table.status),
]);

// ── Teleconsultations ────────────────────────────────────
export const teleconsultations = pgTable("teleconsultations", {
  id: uuid("id").primaryKey().defaultRandom(),
  appointmentId: uuid("appointment_id").notNull().references(() => appointments.id, { onDelete: "cascade" }).unique(),
  roomName: varchar("room_name", { length: 100 }).notNull().unique(),
  startedAt: timestamp("started_at", { withTimezone: true }),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  durationSeconds: integer("duration_seconds"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ── Insurance Conventions ────────────────────────────────────
export const doctorInsurance = pgTable("doctor_insurance", {
  id: uuid("id").primaryKey().defaultRandom(),
  doctorId: uuid("doctor_id").notNull().references(() => doctors.id, { onDelete: "cascade" }),
  insuranceType: varchar("insurance_type", { length: 50 }).notNull(), // cnam | cnrps | star | gat | carte | maghrebia | etc.
  isConventioned: boolean("is_conventioned").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("doctor_insurance_unique_idx").on(table.doctorId, table.insuranceType),
  index("doctor_insurance_type_idx").on(table.insuranceType),
]);

// ── Prescriptions ────────────────────────────────────────
export const prescriptions = pgTable("prescriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  appointmentId: uuid("appointment_id").notNull().references(() => appointments.id, { onDelete: "cascade" }),
  doctorId: uuid("doctor_id").notNull().references(() => doctors.id, { onDelete: "cascade" }),
  patientId: uuid("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("prescriptions_appointment_idx").on(table.appointmentId),
  index("prescriptions_patient_idx").on(table.patientId),
]);

// ── SOS Sessions ─────────────────────────────────────────
export const sosSessions = pgTable("sos_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientId: uuid("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
  patientLat: doublePrecision("patient_lat").notNull(),
  patientLng: doublePrecision("patient_lng").notNull(),
  // patient_location GEOGRAPHY is handled at the SQL level; Drizzle doesn't have a first-class geography type
  symptomCategory: varchar("symptom_category", { length: 50 }),
  description: text("description"),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  doctorId: uuid("doctor_id").references(() => doctors.id, { onDelete: "set null" }),
  fee: integer("fee"),
  commission: integer("commission"),
  requestedAt: timestamp("requested_at", { withTimezone: true }).defaultNow().notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
}, (table) => [
  index("sos_sessions_status_idx").on(table.status),
  index("sos_sessions_patient_idx").on(table.patientId),
]);

// ── Subscriptions ────────────────────────────────────────
export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  doctorId: uuid("doctor_id").notNull().references(() => doctors.id, { onDelete: "cascade" }),
  plan: varchar("plan", { length: 20 }).notNull(), // free | essentiel | pro | clinique
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending | active | expired | cancelled
  priceMillimes: integer("price_millimes").notNull(),
  billingCycle: varchar("billing_cycle", { length: 20 }).notNull().default("monthly"), // monthly | annual
  paymentProvider: varchar("payment_provider", { length: 20 }), // flouci | paymee | manual
  externalRef: varchar("external_ref", { length: 255 }),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("subscriptions_doctor_idx").on(table.doctorId),
  index("subscriptions_status_idx").on(table.status),
]);

// ── Phone Masking ────────────────────────────────────────
export const phoneProxies = pgTable("phone_proxies", {
  id: uuid("id").primaryKey().defaultRandom(),
  sosSessionId: uuid("sos_session_id").references(() => sosSessions.id, { onDelete: "cascade" }),
  proxyNumber: varchar("proxy_number", { length: 30 }).notNull(),
  patientPhone: varchar("patient_phone", { length: 30 }).notNull(),
  doctorPhone: varchar("doctor_phone", { length: 30 }).notNull(),
  twilioProxyServiceSid: varchar("twilio_proxy_service_sid", { length: 100 }),
  twilioSessionSid: varchar("twilio_session_sid", { length: 100 }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("phone_proxies_session_idx").on(table.sosSessionId),
  index("phone_proxies_active_idx").on(table.isActive),
]);

// ── Consultation Notes (SOAP + Vitals + ICD-10) ──────────────────────────────

export type ConsultationVitals = {
  bp_systolic?: number;
  bp_diastolic?: number;
  heart_rate?: number;
  temperature?: number;
  weight?: number;
  height?: number;
  spo2?: number;
  respiratory_rate?: number;
};

export type Icd10Entry = {
  code: string;
  label: string;
};

export const consultationNotes = pgTable(
  "consultation_notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    appointmentId: uuid("appointment_id")
      .notNull()
      .references(() => appointments.id, { onDelete: "cascade" })
      .unique(),
    doctorId: uuid("doctor_id")
      .notNull()
      .references(() => doctors.id, { onDelete: "cascade" }),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    subjective: text("subjective"),
    objective: text("objective"),
    assessment: text("assessment"),
    plan: text("plan"),
    vitals: jsonb("vitals").$type<ConsultationVitals>(),
    icd10Codes: jsonb("icd10_codes").$type<Icd10Entry[]>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("consultation_notes_patient_idx").on(table.patientId),
    index("consultation_notes_doctor_idx").on(table.doctorId),
  ]
);

// ── Admin users (RBAC) ────────────────────────────────────────────────────────

export type AdminRole =
  | "super_admin"
  | "moderator"
  | "finance"
  | "support"
  | "marketing";

export const adminUsers = pgTable(
  "admin_users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 255 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    role: varchar("role", { length: 30 }).$type<AdminRole>().notNull(),
    isActive: boolean("is_active").notNull().default(true),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    totpSecret: text("totp_secret"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("admin_users_email_idx").on(table.email),
    index("admin_users_role_idx").on(table.role),
  ]
);

// ── Admin audit log (append-only) ─────────────────────────────────────────────

export const adminAuditLogs = pgTable(
  "admin_audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorId: uuid("actor_id").references(() => adminUsers.id, {
      onDelete: "set null",
    }),
    actorEmail: varchar("actor_email", { length: 255 }).notNull(),
    action: varchar("action", { length: 80 }).notNull(),
    resourceType: varchar("resource_type", { length: 40 }).notNull(),
    resourceId: varchar("resource_id", { length: 64 }),
    before: jsonb("before"),
    after: jsonb("after"),
    reason: text("reason"),
    ip: varchar("ip", { length: 50 }),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("admin_audit_actor_idx").on(table.actorId),
    index("admin_audit_resource_idx").on(table.resourceType, table.resourceId),
    index("admin_audit_action_idx").on(table.action),
    index("admin_audit_created_idx").on(table.createdAt),
  ]
);
