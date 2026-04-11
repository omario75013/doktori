import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  time,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

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
});

// ─── Patients ─────────────────────────────────────────────────────────────────

export const patients = pgTable(
  "patients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
    phone: varchar("phone", { length: 30 }).notNull(),
    email: varchar("email", { length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("patients_phone_idx").on(table.phone)]
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
    reason: text("reason"),
    notes: text("notes"),
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
export const waitlist = pgTable("waitlist", {
  id: uuid("id").primaryKey().defaultRandom(),
  doctorId: uuid("doctor_id").notNull().references(() => doctors.id, { onDelete: "cascade" }),
  patientId: uuid("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
  preferredDate: varchar("preferred_date", { length: 10 }).notNull(), // YYYY-MM-DD
  notifiedAt: timestamp("notified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("waitlist_doctor_date_idx").on(table.doctorId, table.preferredDate),
  index("waitlist_patient_idx").on(table.patientId),
]);

// ── Reviews ──────────────────────────────────────────────
export const reviews = pgTable("reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  doctorId: uuid("doctor_id").notNull().references(() => doctors.id, { onDelete: "cascade" }),
  patientId: uuid("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
  appointmentId: uuid("appointment_id").notNull().references(() => appointments.id, { onDelete: "cascade" }).unique(),
  rating: integer("rating").notNull(), // 1-5
  comment: text("comment"),
  verified: boolean("verified").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("reviews_doctor_idx").on(table.doctorId),
  index("reviews_rating_idx").on(table.rating),
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
