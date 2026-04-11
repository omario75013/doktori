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

// ── Premium Visibility ────────────────────────────────────
export const doctorPremium = pgTable("doctor_premium", {
  id: uuid("id").primaryKey().defaultRandom(),
  doctorId: uuid("doctor_id").notNull().references(() => doctors.id, { onDelete: "cascade" }).unique(),
  isActive: boolean("is_active").default(false).notNull(),
  until: timestamp("until", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
