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
  numeric,
  jsonb,
  index,
  uniqueIndex,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

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
    consultationMode: varchar("consultation_mode", { length: 20 }).notNull().default("cabinet"),
    teleconsultFee: integer("teleconsult_fee"),
    isActive: boolean("is_active").notNull().default(true),
    isVisible: boolean("is_visible").notNull().default(true),
    trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
    cguAcceptedAt: timestamp("cgu_accepted_at", { withTimezone: true }),
    sosAvailable: boolean("sos_available").notNull().default(false),
    sosRadiusKm: integer("sos_radius_km").notNull().default(10),
    sosFee: integer("sos_fee"),
    sosAvailableFrom: time("sos_available_from"),
    sosAvailableTo: time("sos_available_to"),
    emailVerified: boolean("email_verified").notNull().default(false),
    emailVerificationToken: varchar("email_verification_token", { length: 64 }),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    averageRating: doublePrecision("average_rating").default(0),
    reviewCount: integer("review_count").default(0),
    /** Per-doctor configurable no-show threshold. Defaults to 3 (platform default). */
    noShowThreshold: integer("no_show_threshold").notNull().default(3),
    /** Verification workflow: pending | documents_submitted | approved | rejected */
    verificationStatus: varchar("verification_status", { length: 20 }).notNull().default("pending"),
    verificationNote: text("verification_note"),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    // 2FA (migration 0064)
    totpSecret: text("totp_secret"),
    totpEnabled: boolean("totp_enabled").notNull().default(false),
    totpEnrolledAt: timestamp("totp_enrolled_at", { withTimezone: true }),
    // D30 presence — last time doctor pinged the presence endpoint
    lastActiveAt: timestamp("last_active_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    // Status / away message (doctor chat)
    statusMessage: text("status_message"),
    awayMessage: text("away_message"),
    statusActiveUntil: timestamp("status_active_until", { withTimezone: true }),
    // Patient cancellation cutoff. A patient cannot cancel their own RDV
    // less than this many hours before its start. Doctor can change this
    // from /parametres. Default 2h.
    patientCancelWindowHours: integer("patient_cancel_window_hours").notNull().default(2),
    // Doctor signature image (PNG/JPG up to 2 MB). Optional. When set,
    // it replaces the "Signature et cachet" placeholder in generated
    // documents — primarily /ordonnance/[id] but reusable elsewhere.
    signatureUrl: text("signature_url"),
    // Phase 1 (migration 0079) — Onboarding tour
    onboardingTourCompletedAt: timestamp("onboarding_tour_completed_at", { withTimezone: true }),
    onboardingTourSkipped: boolean("onboarding_tour_skipped").notNull().default(false),
    // Doctor-level cabinet gallery (migration 0088). Array of public R2 URLs,
    // independent of per-practice photos. Max 6 photos enforced application-side.
    cabinetGalleryUrls: jsonb("cabinet_gallery_urls").$type<string[]>().notNull().default([]),
  },
  (table) => [
    uniqueIndex("doctors_email_idx").on(table.email),
    uniqueIndex("doctors_slug_idx").on(table.slug),
    index("doctors_specialty_city_idx").on(table.specialty, table.city),
  ]
);

// ─── Doctor Notification Preferences (1:1 with doctors) ──────────────────────
export const doctorNotificationPrefs = pgTable("doctor_notification_prefs", {
  doctorId: uuid("doctor_id")
    .primaryKey()
    .references(() => doctors.id, { onDelete: "cascade" }),
  emailNewBooking: boolean("email_new_booking").notNull().default(true),
  emailCancellation: boolean("email_cancellation").notNull().default(true),
  emailDailyDigest: boolean("email_daily_digest").notNull().default(false),
  pushNewBooking: boolean("push_new_booking").notNull().default(true),
  pushCancellation: boolean("push_cancellation").notNull().default(true),
  pushRemindersEnabled: boolean("push_reminders_enabled").notNull().default(true),
  smsEnabled: boolean("sms_enabled").notNull().default(false),
  cancelAlertChannels: jsonb("cancel_alert_channels")
    .$type<string[]>()
    .notNull()
    .default(["email", "sms"]),
  cancelAlertTemplate: text("cancel_alert_template"),
  // Hours before the appointment at which reminders / cancel alerts fire.
  reminderOffsetsHours: jsonb("reminder_offsets_hours")
    .$type<number[]>()
    .notNull()
    .default([72, 24, 2]),
  cancelAlertOffsetsHours: jsonb("cancel_alert_offsets_hours")
    .$type<number[]>()
    .notNull()
    .default([0]),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── 2FA Backup Codes ─────────────────────────────────────────────────────────
export const doctorBackupCodes = pgTable(
  "doctor_backup_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    doctorId: uuid("doctor_id")
      .notNull()
      .references(() => doctors.id, { onDelete: "cascade" }),
    codeHash: text("code_hash").notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("doctor_backup_codes_doctor_idx").on(table.doctorId)]
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
    // Optional: links this practice to a clinic (added in migration 0053)
    clinicId: uuid("clinic_id").references(() => clinics.id, { onDelete: "set null" }),
    // 'cabinet' (private practice) | 'clinic' (hospital/clinic affiliation)
    kind: varchar("kind", { length: 10 }).notNull().default("cabinet"),
    // Array of { url: string, alt?: string } photo objects for cabinet gallery
    photos: jsonb("photos").$type<Array<{ url: string; alt?: string }>>().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("doctor_practices_doctor_idx").on(table.doctorId),
    index("doctor_practices_clinic_idx").on(table.clinicId),
  ]
);

// ─── Doctor Schedules ─────────────────────────────────────────────────────────

export const doctorSchedules = pgTable(
  "doctor_schedules",
  {
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
    // Promoted to NOT NULL in migration 0063 — schedules are scoped per cabinet
    practiceId: uuid("practice_id")
      .notNull()
      .references(() => doctorPractices.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("doctor_schedules_practice_day_idx").on(table.practiceId, table.dayOfWeek),
  ]
);

// ─── Motif ↔ Practices (many-to-many) ────────────────────────────────────────
// A motif ("Consultation", "Téléconsult", etc.) can be offered at N practices.
// Booking engine uses this to filter which cabinet's schedule applies.
export const appointmentTypePractices = pgTable(
  "appointment_type_practices",
  {
    appointmentTypeId: uuid("appointment_type_id")
      .notNull()
      .references(() => appointmentTypes.id, { onDelete: "cascade" }),
    practiceId: uuid("practice_id")
      .notNull()
      .references(() => doctorPractices.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.appointmentTypeId, table.practiceId] }),
    index("atp_practice_idx").on(table.practiceId),
  ]
);

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
    cnamNumber: varchar("cnam_number", { length: 30 }),
    // ─── V1 CNAM/CNSS Tunisia (migration 0089) ──
    cnssNumber: varchar("cnss_number", { length: 30 }),
    cnamRegime: varchar("cnam_regime", { length: 30 }).notNull().default("none"),
    // ─── Phase 3: enrichment ──
    cin: varchar("cin", { length: 20 }),
    insuranceProvider: varchar("insurance_provider", { length: 50 }),
    insuranceNumber: varchar("insurance_number", { length: 30 }),
    emergencyContactName: varchar("emergency_contact_name", { length: 120 }),
    emergencyContactPhone: varchar("emergency_contact_phone", { length: 30 }),
    emergencyContactRelation: varchar("emergency_contact_relation", { length: 30 }),
    heightCm: integer("height_cm"),
    weightKg: numeric("weight_kg", { precision: 5, scale: 2 }),
    occupation: varchar("occupation", { length: 100 }),
    maritalStatus: varchar("marital_status", { length: 20 }),
    preferredLanguage: varchar("preferred_language", { length: 5 }).default("fr"),
    referringDoctorId: uuid("referring_doctor_id"),
    nationality: varchar("nationality", { length: 40 }),
    addressStreet: varchar("address_street", { length: 200 }),
    addressCity: varchar("address_city", { length: 80 }),
    addressPostalCode: varchar("address_postal_code", { length: 10 }),
    professionNotes: text("profession_notes"),
    deletedAt: timestamp("deleted_at"),
    // ──────────────────────────
    noShowCount: integer("no_show_count").notNull().default(0),
    lastMinuteCancelCount: integer("last_minute_cancel_count").notNull().default(0),
    isSuspended: boolean("is_suspended").notNull().default(false),
    suspensionReason: text("suspension_reason"),
    suspendedAt: timestamp("suspended_at", { withTimezone: true }),
    passwordHash: text("password_hash"),
    emailVerified: boolean("email_verified").notNull().default(false),
    authMethod: varchar("auth_method", { length: 10 }).notNull().default("otp"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    // ── Patient frontend v2 (0073) ──
    photoUrl: varchar("photo_url", { length: 500 }),
    cnamCardUrl: varchar("cnam_card_url", { length: 500 }),
    insuranceCardUrl: varchar("insurance_card_url", { length: 500 }),
  },
  (table) => [
    uniqueIndex("patients_phone_idx").on(table.phone),
    // NOTE: patients_email_unique_idx (partial) is defined in migration 0040_patient_email_index.sql
    // Drizzle does not support partial (conditional) unique indexes natively, so it lives in raw SQL.
  ]
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
    lifestyle: jsonb("lifestyle"),
    familyHistory: jsonb("family_history"),
    pastSurgeries: jsonb("past_surgeries"),
    pastHospitalizations: jsonb("past_hospitalizations"),
    vaccinations: jsonb("vaccinations"),
    womensHealth: jsonb("womens_health"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("patient_medical_profile_patient_uidx").on(table.patientId)]
);

// ─── Patient Attachments (labs, imaging, certificates, scans) ─────────────────
export const patientAttachments = pgTable(
  "patient_attachments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    doctorId: uuid("doctor_id").references(() => doctors.id, { onDelete: "set null" }),
    secretaryId: uuid("secretary_id"),
    category: varchar("category", { length: 30 }).notNull().default("autre"),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description"),
    fileUrl: text("file_url").notNull(),
    fileKey: text("file_key").notNull(),
    filename: varchar("filename", { length: 255 }).notNull(),
    mimeType: varchar("mime_type", { length: 120 }).notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    issuedAt: date("issued_at"),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    // Doctors the patient has explicitly shared this attachment with.
    // Empty = private. Lets us avoid duplicating the file row when sharing.
    sharedWithDoctorIds: uuid("shared_with_doctor_ids").array().notNull().default(sql`'{}'::uuid[]`),
  },
  (table) => [
    index("patient_attachments_patient_idx").on(table.patientId, table.uploadedAt),
    index("patient_attachments_category_idx").on(table.category),
  ]
);

// ─── Patient Timeline Events (manual log entries) ─────────────────────────────
export const patientTimelineEvents = pgTable(
  "patient_timeline_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    doctorId: uuid("doctor_id").references(() => doctors.id, { onDelete: "set null" }),
    secretaryId: uuid("secretary_id"),
    kind: varchar("kind", { length: 40 }).notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    body: text("body"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("patient_timeline_events_patient_idx").on(table.patientId, table.occurredAt)]
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
    appointmentTypeId: uuid("appointment_type_id").references(
      () => appointmentTypes.id,
      { onDelete: "set null" }
    ),
    dependentId: uuid("dependent_id").references(
      () => patientDependents.id,
      { onDelete: "set null" }
    ),
    // nullable — backfilled to primary practice by migration 0024
    practiceId: uuid("practice_id").references(
      () => doctorPractices.id,
      { onDelete: "set null" }
    ),
    reason: text("reason"),
    notes: text("notes"),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    checkedInAt: timestamp("checked_in_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    // ── Patient frontend v2 (0073) ──
    rescheduledFromId: uuid("rescheduled_from_id").references((): any => appointments.id, { onDelete: "set null" }),
    cancellationReason: text("cancellation_reason"),
    // ── Payment columns (added by raw SQL migrations earlier in project history,
    //    declared here for Drizzle type safety + db:push parity in CI) ──
    paymentStatus: varchar("payment_status", { length: 20 }).notNull().default("unpaid"),
    paymentAmount: integer("payment_amount"),
    paymentRef: varchar("payment_ref", { length: 255 }),
    paymentProvider: varchar("payment_provider", { length: 20 }),
    paymentMethod: varchar("payment_method", { length: 30 }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    // ── BS1 (Bulletin de Soins) lifecycle — migration 0090 ──
    bsPdfUrl: text("bs_pdf_url"),
    bsStatus: varchar("bs_status", { length: 30 }).notNull().default("not_generated"),
    bsGeneratedAt: timestamp("bs_generated_at", { withTimezone: true }),
    bsSentAt: timestamp("bs_sent_at", { withTimezone: true }),
    bsReimbursedAt: timestamp("bs_reimbursed_at", { withTimezone: true }),
    bsRejectionReason: text("bs_rejection_reason"),
  },
  (table) => [
    index("appointments_doctor_date_idx").on(table.doctorId, table.startsAt),
    index("appointments_patient_idx").on(table.patientId),
    index("appointments_status_idx").on(table.status),
    index("appointments_appointment_type_idx").on(table.appointmentTypeId),
    index("appointments_rescheduled_from_idx").on(table.rescheduledFromId),
  ]
);

// ─── SMS Usage Quota ─────────────────────────────────────────────────────────

export const smsUsage = pgTable(
  "sms_usage",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    doctorId: uuid("doctor_id").notNull().references(() => doctors.id, { onDelete: "cascade" }),
    /** Format: 'YYYY-MM' e.g. '2026-04' */
    month: varchar("month", { length: 7 }).notNull(),
    count: integer("count").notNull().default(0),
  },
  (table) => [
    uniqueIndex("sms_usage_doctor_month_uidx").on(table.doctorId, table.month),
    index("sms_usage_doctor_month_idx").on(table.doctorId, table.month),
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
  appointmentId: uuid("appointment_id").references(() => appointments.id, { onDelete: "cascade" }).unique(),
  sosSessionId: uuid("sos_session_id").references(() => sosSessions.id, { onDelete: "set null" }),
  rating: integer("rating").notNull(), // 1-5
  comment: text("comment"),
  verified: boolean("verified").default(true).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  rejectionReason: text("rejection_reason"),
  moderatedBy: uuid("moderated_by").references(() => adminUsers.id),
  moderatedAt: timestamp("moderated_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  // ── Patient frontend v2 (0073) — multi-criteria ratings ──
  punctualityRating: integer("punctuality_rating"),
  communicationRating: integer("communication_rating"),
  cleanlinessRating: integer("cleanliness_rating"),
  staffRating: integer("staff_rating"),
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
  // When set, this secretary manages ALL doctors in the clinic
  clinicId: uuid("clinic_id").references(() => clinics.id, { onDelete: "set null" }),
  permissions: jsonb("permissions").notNull().default({
    agenda: true,
    patients: true,
    rendezVous: true,
    messagerie: false,
    wallet: false,
    factures: false,
    motifs: true,
    cabinets: false,
    teleconsult: false,
  }),
  // Phase 4.5: profile + presence
  phone: varchar("phone", { length: 30 }),
  dateOfBirth: date("date_of_birth"),
  yearsOfExperience: integer("years_of_experience"),
  monthlySalary: integer("monthly_salary"),
  hireDate: date("hire_date"),
  lastActiveAt: timestamp("last_active_at"),
  photoUrl: text("photo_url"),
  bio: text("bio"),
  monthlyDayOffAllowance: numeric("monthly_day_off_allowance", { precision: 4, scale: 1 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("secretaries_email_idx").on(table.email),
  index("secretaries_doctor_idx").on(table.doctorId),
  index("secretaries_clinic_idx").on(table.clinicId),
]);

export const secretarySchedules = pgTable(
  "secretary_schedules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    secretaryId: uuid("secretary_id")
      .notNull()
      .references(() => secretaries.id, { onDelete: "cascade" }),
    /** 0 = Sunday … 6 = Saturday */
    dayOfWeek: integer("day_of_week").notNull(),
    startTime: time("start_time").notNull(),
    endTime: time("end_time").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [index("secretary_schedules_sec_day_idx").on(table.secretaryId, table.dayOfWeek)]
);

export const secretaryTimeOff = pgTable(
  "secretary_time_off",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    secretaryId: uuid("secretary_id")
      .notNull()
      .references(() => secretaries.id, { onDelete: "cascade" }),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    reason: text("reason"),
    /** pending | approved | denied */
    status: varchar("status", { length: 10 }).notNull().default("pending"),
    createdAt: timestamp("created_at").defaultNow(),
    decidedAt: timestamp("decided_at"),
  },
  (table) => [index("secretary_time_off_sec_idx").on(table.secretaryId, table.status)]
);

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
  // Legacy: nullable since migration 0066 (poly-tenant). Keep referencing patients
  // for historical data only; actorType/actorId is the new source of truth.
  patientId: uuid("patient_id").references(() => patients.id, { onDelete: "cascade" }),
  actorType: varchar("actor_type", { length: 10 }).notNull().default("patient"),
  actorId: uuid("actor_id").notNull(),
  token: text("token").notNull().unique(),
  platform: varchar("platform", { length: 10 }).notNull(), // ios | android
  deviceId: varchar("device_id", { length: 255 }),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("push_tokens_patient_idx").on(table.patientId),
  index("push_tokens_actor_idx").on(table.actorType, table.actorId),
]);

// ── Appointment Types ────────────────────────────────────
export const appointmentTypes = pgTable("appointment_types", {
  id: uuid("id").primaryKey().defaultRandom(),
  doctorId: uuid("doctor_id").notNull().references(() => doctors.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(), // e.g. "Première consultation"
  durationMinutes: integer("duration_minutes").notNull(),
  fee: integer("fee"), // in millimes (nullable — fallback to doctor's consultationFee)
  color: varchar("color", { length: 20 }).default("#2563eb").notNull(),
  mode: varchar("mode", { length: 20 }).notNull().default("cabinet"),
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

// ── Doctor Wallets ────────────────────────────────────────────
export const doctorWallets = pgTable("doctor_wallets", {
  id: uuid("id").primaryKey().defaultRandom(),
  doctorId: uuid("doctor_id").notNull().references(() => doctors.id, { onDelete: "cascade" }).unique(),
  balance: integer("balance").notNull().default(0),
  totalEarned: integer("total_earned").notNull().default(0),
  totalCommission: integer("total_commission").notNull().default(0),
  totalWithdrawn: integer("total_withdrawn").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const walletTransactions = pgTable("wallet_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  doctorId: uuid("doctor_id").notNull().references(() => doctors.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 20 }).notNull(),
  amount: integer("amount").notNull(),
  appointmentId: uuid("appointment_id").references(() => appointments.id, { onDelete: "set null" }),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("wallet_tx_doctor_idx").on(table.doctorId, table.createdAt),
]);

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
  appointmentId: uuid("appointment_id").references(() => appointments.id, { onDelete: "cascade" }),
  doctorId: uuid("doctor_id").notNull().references(() => doctors.id, { onDelete: "cascade" }),
  patientId: uuid("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  verificationToken: varchar("verification_token", { length: 64 }),
  templateId: uuid("template_id").references((): any => prescriptionTemplates.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("prescriptions_appointment_idx").on(table.appointmentId),
  index("prescriptions_patient_idx").on(table.patientId),
  index("prescriptions_verification_token_idx").on(table.verificationToken),
]);

// ── Medical Certificates ─────────────────────────────────
// Parallel to `prescriptions` but stores a free-form `title` so the
// patient can see "Certificat d'arrêt de travail" vs "Aptitude au
// sport" in their /mes-documents list without having to open the PDF.
export const medicalCertificates = pgTable("medical_certificates", {
  id: uuid("id").primaryKey().defaultRandom(),
  appointmentId: uuid("appointment_id").references(() => appointments.id, { onDelete: "cascade" }),
  doctorId: uuid("doctor_id").notNull().references(() => doctors.id, { onDelete: "cascade" }),
  patientId: uuid("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  content: text("content").notNull(),
  verificationToken: varchar("verification_token", { length: 64 }),
  templateId: uuid("template_id").references((): any => prescriptionTemplates.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("medical_certificates_appointment_idx").on(table.appointmentId),
  index("medical_certificates_patient_idx").on(table.patientId),
  index("medical_certificates_doctor_idx").on(table.doctorId),
  index("medical_certificates_verification_token_idx").on(table.verificationToken),
]);

export type MedicalCertificate = typeof medicalCertificates.$inferSelect;
export type NewMedicalCertificate = typeof medicalCertificates.$inferInsert;

// ── Waiting Room ─────────────────────────────────────────
// Counter set by the secretary (or doctor) for how many patients are
// currently physically in the cabinet's waiting area. One row per
// doctor; absence of a row == zero.
export const doctorWaitingRoom = pgTable("doctor_waiting_room", {
  doctorId: uuid("doctor_id").primaryKey().references(() => doctors.id, { onDelete: "cascade" }),
  count: integer("count").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  updatedByType: varchar("updated_by_type", { length: 16 }),
  updatedById: uuid("updated_by_id"),
});

export type DoctorWaitingRoom = typeof doctorWaitingRoom.$inferSelect;

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
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  cancelReason: text("cancel_reason"),
  cancelledBy: varchar("cancelled_by", { length: 10 }),
  distanceM: integer("distance_m"),
  adminNotes: text("admin_notes"),
  resolution: varchar("resolution", { length: 20 }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
}, (table) => [
  index("sos_sessions_status_idx").on(table.status),
  index("sos_sessions_patient_idx").on(table.patientId),
  index("sos_sessions_doctor_idx").on(table.doctorId),
]);

// ── SOS Declines ─────────────────────────────────────────
export const sosDeclines = pgTable("sos_declines", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id").notNull().references(() => sosSessions.id, { onDelete: "cascade" }),
  doctorId: uuid("doctor_id").notNull().references(() => doctors.id, { onDelete: "cascade" }),
  reason: varchar("reason", { length: 30 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("sos_declines_unique_idx").on(table.sessionId, table.doctorId),
  index("sos_declines_session_idx").on(table.sessionId),
]);

// ── Subscriptions ────────────────────────────────────────
export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  doctorId: uuid("doctor_id").notNull().references(() => doctors.id, { onDelete: "cascade" }),
  plan: varchar("plan", { length: 20 }).notNull(), // free | essentiel | pro | clinique
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending | active | trial | expired | cancelled
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

// ── Subscription Plans catalog ───────────────────────────
export const subscriptionPlans = pgTable("subscription_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: varchar("code", { length: 20 }).notNull().unique(),
  label: varchar("label", { length: 100 }).notNull(),
  priceMillimes: integer("price_millimes").notNull(),
  billingCycle: varchar("billing_cycle", { length: 20 }).notNull().default("monthly"),
  features: jsonb("features").$type<string[]>().notNull().default([]),
  isActive: boolean("is_active").notNull().default(true),
  displayOrder: integer("display_order").notNull().default(0),
  // Plan limits (null = unlimited)
  maxAppointmentsPerMonth: integer("max_appointments_per_month"),
  maxSmsPerMonth: integer("max_sms_per_month"),
  maxPatientsTotal: integer("max_patients_total"),
  // Feature keys enabled on this plan e.g. ["teleconsult","stats","wallet"]
  enabledFeatures: jsonb("enabled_features").$type<string[]>().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

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

// ── Mobile analytics ──────────────────────────────────────────────────────────

export const mobileAnalytics = pgTable(
  "mobile_analytics",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    event: varchar("event", { length: 50 }).notNull(),
    platform: varchar("platform", { length: 10 }).notNull(),
    appVersion: varchar("app_version", { length: 20 }),
    buildNumber: varchar("build_number", { length: 10 }),
    patientId: uuid("patient_id").references(() => patients.id, {
      onDelete: "set null",
    }),
    eventData: jsonb("event_data").default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("mobile_analytics_event_idx").on(table.event, table.createdAt),
    index("mobile_analytics_platform_idx").on(table.platform, table.createdAt),
    index("mobile_analytics_version_idx").on(table.appVersion, table.createdAt),
  ]
);

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

// ── Feature Flags ─────────────────────────────────────────────────────────────

export const featureFlags = pgTable("feature_flags", {
  key: varchar("key", { length: 100 }).primaryKey(),
  enabled: boolean("enabled").notNull().default(false),
  description: text("description"),
  rules: jsonb("rules").default({}),
  /** Pilot mode: when non-empty, feature is enabled ONLY for these doctor IDs.
   *  When empty + enabled=true → all doctors. When empty + enabled=false → none. */
  enabledDoctorIds: text("enabled_doctor_ids").array().notNull().default([]),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── Catalog: Specialties ──────────────────────────────────────────────────────

export const catalogSpecialties = pgTable("catalog_specialties", {
  id: varchar("id", { length: 50 }).primaryKey(),
  label: varchar("label", { length: 100 }).notNull(),
  labelAr: varchar("label_ar", { length: 100 }),
  icon: varchar("icon", { length: 50 }),
  isActive: boolean("is_active").notNull().default(true),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── Catalog: Cities ───────────────────────────────────────────────────────────

export const catalogCities = pgTable("catalog_cities", {
  id: varchar("id", { length: 50 }).primaryKey(),
  label: varchar("label", { length: 100 }).notNull(),
  labelAr: varchar("label_ar", { length: 100 }),
  latitude: varchar("latitude", { length: 30 }),
  longitude: varchar("longitude", { length: 30 }),
  isActive: boolean("is_active").notNull().default(true),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── Conversations (doctor-patient messaging) ─────────────────────────────────

export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    doctorId: uuid("doctor_id").notNull().references(() => doctors.id, { onDelete: "cascade" }),
    patientId: uuid("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }).notNull().defaultNow(),
    status: varchar("status", { length: 20 }).notNull().default("active"),
    lastNotificationAt: timestamp("last_notification_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("conversations_doctor_patient_uidx").on(table.doctorId, table.patientId),
    index("conversations_doctor_idx").on(table.doctorId),
    index("conversations_patient_idx").on(table.patientId),
  ]
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
    senderType: varchar("sender_type", { length: 10 }).notNull(),
    senderId: uuid("sender_id").notNull(),
    content: text("content").notNull(),
    fileUrl: text("file_url"),
    fileName: varchar("file_name", { length: 255 }),
    readAt: timestamp("read_at", { withTimezone: true }),
    // "system" = automated system message; "auto_reply" = doctor away auto-reply
    type: varchar("type", { length: 20 }).notNull().default("message"),
    isAutoReply: boolean("is_auto_reply").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("messages_conversation_idx").on(table.conversationId, table.createdAt),
  ]
);

// ── Platform Settings ─────────────────────────────────────────────────────────

export const platformSettings = pgTable("platform_settings", {
  key: varchar("key", { length: 100 }).primaryKey(),
  value: text("value").notNull(),
  category: varchar("category", { length: 50 }).notNull(),
  label: varchar("label", { length: 255 }).notNull(),
  description: text("description"),
  type: varchar("type", { length: 20 }).notNull().default("text"),
  options: jsonb("options"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── Promo Codes ───────────────────────────────────────────────────────────────

export const promoCodes = pgTable(
  "promo_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: varchar("code", { length: 30 }).notNull().unique(),
    // 'percentage' | 'fixed_amount' | 'free_months'
    type: varchar("type", { length: 20 }).notNull(),
    // percentage (0-100), amount in millimes, or months count
    value: integer("value").notNull(),
    // 'subscription' | 'teleconsult'
    target: varchar("target", { length: 20 }).notNull().default("subscription"),
    maxUses: integer("max_uses"),
    currentUses: integer("current_uses").notNull().default(0),
    validFrom: timestamp("valid_from", { withTimezone: true }).notNull().defaultNow(),
    validUntil: timestamp("valid_until", { withTimezone: true }),
    isActive: boolean("is_active").notNull().default(true),
    createdBy: uuid("created_by").references(() => adminUsers.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("promo_codes_code_idx").on(table.code),
  ]
);

// ── Promo Code Usages ─────────────────────────────────────────────────────────

export const promoCodeUsages = pgTable(
  "promo_code_usages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    promoCodeId: uuid("promo_code_id")
      .notNull()
      .references(() => promoCodes.id, { onDelete: "cascade" }),
    doctorId: uuid("doctor_id")
      .notNull()
      .references(() => doctors.id, { onDelete: "cascade" }),
    // subscription_id or appointment_id
    appliedTo: varchar("applied_to", { length: 50 }),
    // actual discount in millimes
    discountAmount: integer("discount_amount").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("promo_usages_code_idx").on(table.promoCodeId),
    index("promo_usages_doctor_idx").on(table.doctorId),
    uniqueIndex("promo_usages_unique_idx").on(table.promoCodeId, table.doctorId),
  ]
);

// ── Blog Posts ────────────────────────────────────────────────────────────────

export const blogPosts = pgTable(
  "blog_posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: varchar("slug", { length: 255 }).notNull().unique(),
    title: varchar("title", { length: 500 }).notNull(),
    description: text("description"),
    content: text("content").notNull(),
    coverImageUrl: text("cover_image_url"),
    author: varchar("author", { length: 255 }).notNull().default("Doktori"),
    category: varchar("category", { length: 50 }),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    isPublished: boolean("is_published").notNull().default(false),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("blog_posts_slug_idx").on(table.slug),
    index("blog_posts_published_idx").on(table.isPublished, table.publishedAt),
  ]
);

// ── Admin Notifications ──────────────────────────────────────────────────────
export const adminNotifications = pgTable("admin_notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: varchar("type", { length: 30 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message"),
  link: varchar("link", { length: 500 }),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("admin_notifications_read_idx").on(table.isRead, table.createdAt),
]);

// ── Webhooks ─────────────────────────────────────────────────────────────────
export const webhooks = pgTable("webhooks", {
  id: uuid("id").primaryKey().defaultRandom(),
  url: varchar("url", { length: 500 }).notNull(),
  events: jsonb("events").notNull().default([]),
  secret: varchar("secret", { length: 64 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: uuid("created_by").references(() => adminUsers.id),
  lastTriggeredAt: timestamp("last_triggered_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── Doctor Documents (verification) ─────────────────────────────────────────
export const doctorDocuments = pgTable(
  "doctor_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    doctorId: uuid("doctor_id")
      .notNull()
      .references(() => doctors.id, { onDelete: "cascade" }),
    /** 'diplome' | 'carte_cnom' | 'cin' | 'autre' */
    type: varchar("type", { length: 50 }).notNull(),
    fileUrl: text("file_url").notNull(),
    fileName: varchar("file_name", { length: 255 }).notNull(),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("doctor_documents_doctor_idx").on(table.doctorId),
  ]
);


// ── Patient ↔ Doctor shared documents ───────────────────────────────────────
// One row per uploaded file. `uploadedBy` records who created it.
// - patient upload: uploadedBy='patient', uploadedByDoctorId=null,
//   sharedWithDoctorIds is the list of doctors the patient picked at upload.
// - doctor upload inside fiche patient: uploadedBy='doctor',
//   uploadedByDoctorId=that doctor, sharedWithDoctorIds defaults to [doctor].
//   Patient sees it read-only with a "Créé par Dr X" badge.
export const patientDocuments = pgTable(
  "patient_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    /** 'patient' | 'doctor' */
    uploadedBy: varchar("uploaded_by", { length: 10 }).notNull(),
    uploadedByDoctorId: uuid("uploaded_by_doctor_id").references(
      () => doctors.id,
      { onDelete: "set null" }
    ),
    sharedWithDoctorIds: uuid("shared_with_doctor_ids").array().notNull().default(sql`'{}'::uuid[]`),
    fileUrl: text("file_url").notNull(),
    fileName: varchar("file_name", { length: 255 }).notNull(),
    mimeType: varchar("mime_type", { length: 100 }),
    sizeBytes: integer("size_bytes"),
    /** free-form category label e.g. 'ordonnance' | 'analyse' | 'imagerie' | 'autre' */
    category: varchar("category", { length: 50 }),
    title: varchar("title", { length: 255 }),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("patient_documents_patient_idx").on(table.patientId),
    index("patient_documents_doctor_idx").on(table.uploadedByDoctorId),
  ]
);


// ── Phase 5: Doctor Network ─────────────────────────────────────────────────

export const doctorConnections = pgTable(
  "doctor_connections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requesterId: uuid("requester_id")
      .notNull()
      .references(() => doctors.id, { onDelete: "cascade" }),
    addresseeId: uuid("addressee_id")
      .notNull()
      .references(() => doctors.id, { onDelete: "cascade" }),
    /** pending | accepted | blocked */
    status: varchar("status", { length: 10 }).notNull().default("pending"),
    createdAt: timestamp("created_at").defaultNow(),
    acceptedAt: timestamp("accepted_at"),
  },
  (table) => [
    uniqueIndex("doctor_connections_unique").on(table.requesterId, table.addresseeId),
    index("doctor_connections_requester_idx").on(table.requesterId, table.status),
    index("doctor_connections_addressee_idx").on(table.addresseeId, table.status),
  ]
);

export const patientReferrals = pgTable(
  "patient_referrals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fromDoctorId: uuid("from_doctor_id")
      .notNull()
      .references(() => doctors.id, { onDelete: "cascade" }),
    toDoctorId: uuid("to_doctor_id")
      .notNull()
      .references(() => doctors.id, { onDelete: "cascade" }),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    reason: text("reason").notNull(),
    shareMedicalRecord: boolean("share_medical_record").notNull().default(false),
    /** pending | granted | denied */
    patientConsentStatus: varchar("patient_consent_status", { length: 10 })
      .notNull()
      .default("pending"),
    patientConsentToken: varchar("patient_consent_token", { length: 64 }).unique(),
    suggestedAppointmentAt: timestamp("suggested_appointment_at"),
    /** pending | accepted | declined | completed */
    status: varchar("status", { length: 15 }).notNull().default("pending"),
    notesForReceivingDoctor: text("notes_for_receiving_doctor"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("patient_referrals_to_doctor_idx").on(table.toDoctorId, table.status),
    index("patient_referrals_from_doctor_idx").on(table.fromDoctorId, table.status),
    index("patient_referrals_consent_token_idx").on(table.patientConsentToken),
  ]
);

export const doctorConversations = pgTable(
  "doctor_conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    doctorAId: uuid("doctor_a_id")
      .notNull()
      .references(() => doctors.id, { onDelete: "cascade" }),
    doctorBId: uuid("doctor_b_id")
      .notNull()
      .references(() => doctors.id, { onDelete: "cascade" }),
    lastMessageAt: timestamp("last_message_at"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    uniqueIndex("doctor_conversations_pair_idx").on(table.doctorAId, table.doctorBId),
  ]
);

export const doctorMessages = pgTable(
  "doctor_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => doctorConversations.id, { onDelete: "cascade" }),
    senderId: uuid("sender_id")
      .notNull()
      .references(() => doctors.id, { onDelete: "cascade" }),
    // Body may be empty when the message is image-only — Drizzle keeps it
    // NOT NULL; route stores an empty string in that case.
    body: text("body").notNull(),
    // Optional image attachment (max 5 MB enforced at the API). Stored in R2.
    imageUrl: text("image_url"),
    imageMimeType: varchar("image_mime_type", { length: 60 }),
    readAt: timestamp("read_at"),
    createdAt: timestamp("created_at").defaultNow(),
    // Soft-edit + soft-delete so we keep an audit trail.
    editedAt: timestamp("edited_at"),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [index("doctor_messages_conv_idx").on(table.conversationId, table.createdAt)]
);

export const doctorNotifications = pgTable(
  "doctor_notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    doctorId: uuid("doctor_id")
      .notNull()
      .references(() => doctors.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 30 }).notNull(),
    payload: jsonb("payload").notNull().default({}),
    readAt: timestamp("read_at"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [index("doctor_notifications_doctor_idx").on(table.doctorId, table.createdAt)]
);

// ─── Phase 4.8: Staff Collab ─────────────────────────────────────────────────

export const staffConversations = pgTable(
  "staff_conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    doctorId: uuid("doctor_id")
      .notNull()
      .references(() => doctors.id, { onDelete: "cascade" }),
    memberAType: varchar("member_a_type", { length: 10 }).notNull(),
    memberAId: uuid("member_a_id").notNull(),
    memberBType: varchar("member_b_type", { length: 10 }).notNull(),
    memberBId: uuid("member_b_id").notNull(),
    lastMessageAt: timestamp("last_message_at"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("staff_conv_doctor_idx").on(table.doctorId),
    index("staff_conv_member_a_idx").on(table.memberAType, table.memberAId),
    index("staff_conv_member_b_idx").on(table.memberBType, table.memberBId),
  ]
);

export const staffMessages = pgTable(
  "staff_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => staffConversations.id, { onDelete: "cascade" }),
    senderType: varchar("sender_type", { length: 10 }).notNull(),
    senderId: uuid("sender_id").notNull(),
    body: text("body").notNull(),
    readAt: timestamp("read_at"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [index("staff_messages_conv_idx").on(table.conversationId, table.createdAt)]
);

export const secretaryNotifications = pgTable(
  "secretary_notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    secretaryId: uuid("secretary_id")
      .notNull()
      .references(() => secretaries.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 30 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    body: text("body"),
    payload: jsonb("payload").notNull().default({}),
    readAt: timestamp("read_at"),
    seenAt: timestamp("seen_at"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [index("sec_notif_sec_idx").on(table.secretaryId, table.createdAt)]
);

export const doctorQuickActions = pgTable(
  "doctor_quick_actions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    doctorId: uuid("doctor_id")
      .notNull()
      .references(() => doctors.id, { onDelete: "cascade" }),
    label: varchar("label", { length: 100 }).notNull(),
    message: text("message"),
    icon: varchar("icon", { length: 30 }),
    sound: varchar("sound", { length: 20 }),
    position: integer("position").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [index("doctor_quick_actions_doctor_idx").on(table.doctorId, table.position)]
);

export const doctorBells = pgTable(
  "doctor_bells",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    doctorId: uuid("doctor_id")
      .notNull()
      .references(() => doctors.id, { onDelete: "cascade" }),
    secretaryId: uuid("secretary_id").references(() => secretaries.id, {
      onDelete: "cascade",
    }),
    label: varchar("label", { length: 100 }).notNull(),
    message: text("message"),
    icon: varchar("icon", { length: 30 }),
    sound: varchar("sound", { length: 20 }),
    acknowledgedAt: timestamp("acknowledged_at"),
    acknowledgedBy: uuid("acknowledged_by").references(() => secretaries.id, {
      onDelete: "set null",
    }),
    acknowledgmentMessage: text("acknowledgment_message"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [index("doctor_bells_doctor_idx").on(table.doctorId, table.createdAt)]
);

// ─── Phase 4.9: Voice calls ─────────────────────────────────────────────────

export const callSessions = pgTable(
  "call_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    callerType: varchar("caller_type", { length: 10 }).notNull(),
    callerId: uuid("caller_id").notNull(),
    calleeType: varchar("callee_type", { length: 10 }).notNull(),
    calleeId: uuid("callee_id").notNull(),
    status: varchar("status", { length: 12 }).notNull().default("ringing"),
    createdAt: timestamp("created_at").defaultNow(),
    answeredAt: timestamp("answered_at"),
    endedAt: timestamp("ended_at"),
  },
  (table) => [
    index("call_sessions_callee_ring_idx").on(table.calleeType, table.calleeId, table.createdAt),
    index("call_sessions_caller_idx").on(table.callerType, table.callerId, table.createdAt),
  ]
);

export const callSignals = pgTable(
  "call_signals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => callSessions.id, { onDelete: "cascade" }),
    senderType: varchar("sender_type", { length: 10 }).notNull(),
    senderId: uuid("sender_id").notNull(),
    kind: varchar("kind", { length: 10 }).notNull(),
    payload: jsonb("payload").notNull(),
    consumedAt: timestamp("consumed_at"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [index("call_signals_session_idx").on(table.sessionId, table.createdAt)]
);

// ── Prescription Templates ────────────────────────────────
export const prescriptionTemplates = pgTable("prescription_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  doctorId: uuid("doctor_id").references(() => doctors.id, { onDelete: "set null" }),
  title: varchar("title", { length: 120 }).notNull(),
  description: text("description"),
  language: varchar("language", { length: 2 }).notNull().default("fr"),
  slug: varchar("slug", { length: 60 }),
  bodyMarkdown: text("body_markdown").notNull(),
  targetType: varchar("target_type", { length: 20 }).notNull().default("prescription"),
  isOfficial: boolean("is_official").notNull().default(false),
  clonedFromId: uuid("cloned_from_id").references((): any => prescriptionTemplates.id, { onDelete: "set null" }),
  applyCount: integer("apply_count").notNull().default(0),
  cloneCount: integer("clone_count").notNull().default(0),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export type PrescriptionTemplate = typeof prescriptionTemplates.$inferSelect;
export type NewPrescriptionTemplate = typeof prescriptionTemplates.$inferInsert;

// ── Template Audit Logs ───────────────────────────────────
export const templateAuditLogs = pgTable("template_audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorType: varchar("actor_type", { length: 10 }).notNull(),
  actorId: uuid("actor_id").notNull(),
  templateId: uuid("template_id").notNull(),
  action: varchar("action", { length: 20 }).notNull(),
  before: jsonb("before"),
  after: jsonb("after"),
  context: jsonb("context"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type TemplateAuditLog = typeof templateAuditLogs.$inferSelect;
export type NewTemplateAuditLog = typeof templateAuditLogs.$inferInsert;

// ── Doctor Days-Off ──────────────────────────────────────────────────────────

export const doctorDaysOff = pgTable(
  "doctor_days_off",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    doctorId: uuid("doctor_id")
      .notNull()
      .references(() => doctors.id, { onDelete: "cascade" }),
    // null = applies to all practices
    practiceId: uuid("practice_id").references(() => doctorPractices.id, { onDelete: "cascade" }),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("doctor_days_off_doctor_idx").on(table.doctorId, table.startDate),
  ]
);

// ── Plan Usage (monthly counters) ─────────────────────────────────────────────

export const planUsage = pgTable(
  "plan_usage",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    doctorId: uuid("doctor_id")
      .notNull()
      .references(() => doctors.id, { onDelete: "cascade" }),
    // Format: "YYYY-MM" e.g. "2026-04"
    month: varchar("month", { length: 7 }).notNull(),
    appointmentsCount: integer("appointments_count").notNull().default(0),
    smsCount: integer("sms_count").notNull().default(0),
    patientsCount: integer("patients_count").notNull().default(0),
  },
  (table) => [
    uniqueIndex("plan_usage_doctor_month_idx").on(table.doctorId, table.month),
  ]
);

// ── Drizzle relations ─────────────────────────────────────────────────────────

export const prescriptionTemplatesRelations = relations(prescriptionTemplates, ({ one, many }) => ({
  doctor: one(doctors, {
    fields: [prescriptionTemplates.doctorId],
    references: [doctors.id],
  }),
  clonedFrom: one(prescriptionTemplates, {
    fields: [prescriptionTemplates.clonedFromId],
    references: [prescriptionTemplates.id],
    relationName: "templateClone",
  }),
  prescriptions: many(prescriptions),
}));

export const templateAuditLogsRelations = relations(templateAuditLogs, ({ one }) => ({
  template: one(prescriptionTemplates, {
    fields: [templateAuditLogs.templateId],
    references: [prescriptionTemplates.id],
  }),
}));

// ═══════════════════════════════════════════════════════════════════════════════
// PATIENT FRONTEND v2 — added by 0073_patient_features_foundation
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Stream 2 (RGPD) ─────────────────────────────────────────────────────────

export const accountDeletionRequests = pgTable("account_deletion_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientId: uuid("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
  reason: text("reason"),
  requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  executedAt: timestamp("executed_at", { withTimezone: true }),
});

export type AccountDeletionRequest = typeof accountDeletionRequests.$inferSelect;
export type NewAccountDeletionRequest = typeof accountDeletionRequests.$inferInsert;

export const patientConsents = pgTable("patient_consents", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientId: uuid("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
  consentType: varchar("consent_type", { length: 40 }).notNull(),
  granted: boolean("granted").notNull(),
  grantedAt: timestamp("granted_at", { withTimezone: true }).notNull().defaultNow(),
  ip: varchar("ip", { length: 50 }),
  userAgent: text("user_agent"),
});

export type PatientConsent = typeof patientConsents.$inferSelect;
export type NewPatientConsent = typeof patientConsents.$inferInsert;

export const patientSessions = pgTable("patient_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientId: uuid("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
  sessionToken: varchar("session_token", { length: 255 }).notNull().unique(),
  ip: varchar("ip", { length: 50 }),
  userAgent: text("user_agent"),
  deviceLabel: varchar("device_label", { length: 100 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastActiveAt: timestamp("last_active_at", { withTimezone: true }).notNull().defaultNow(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
});

export type PatientSession = typeof patientSessions.$inferSelect;
export type NewPatientSession = typeof patientSessions.$inferInsert;

export const patient2fa = pgTable("patient_2fa", {
  patientId: uuid("patient_id").primaryKey().references(() => patients.id, { onDelete: "cascade" }),
  totpSecret: text("totp_secret").notNull(),
  enabled: boolean("enabled").notNull().default(false),
  backupCodes: jsonb("backup_codes").notNull().default([]),
  enabledAt: timestamp("enabled_at", { withTimezone: true }),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
});

export type Patient2fa = typeof patient2fa.$inferSelect;
export type NewPatient2fa = typeof patient2fa.$inferInsert;

// ─── Stream 2 — A3 (Password Reset Tokens) ────────────────────────────────────

export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    tokenHash: varchar("token_hash", { length: 128 }).primaryKey(),
    patientId: uuid("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("password_reset_tokens_patient_idx").on(table.patientId),
  ]
);

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type NewPasswordResetToken = typeof passwordResetTokens.$inferInsert;

// ─── Stream 3 (UX) ───────────────────────────────────────────────────────────

export const patientFavorites = pgTable("patient_favorites", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientId: uuid("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
  doctorId: uuid("doctor_id").notNull().references(() => doctors.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type PatientFavorite = typeof patientFavorites.$inferSelect;
export type NewPatientFavorite = typeof patientFavorites.$inferInsert;

// patient_dependents already exists in schema — not re-declared here (see line 342)

export const patientNotificationPrefs = pgTable("patient_notification_prefs", {
  patientId: uuid("patient_id").primaryKey().references(() => patients.id, { onDelete: "cascade" }),
  emailAppointments: boolean("email_appointments").notNull().default(true),
  emailMarketing: boolean("email_marketing").notNull().default(false),
  emailNews: boolean("email_news").notNull().default(false),
  smsAppointments: boolean("sms_appointments").notNull().default(true),
  smsReminders: boolean("sms_reminders").notNull().default(true),
  smsOtp: boolean("sms_otp").notNull().default(true),
  pushAppointments: boolean("push_appointments").notNull().default(true),
  pushMessages: boolean("push_messages").notNull().default(true),
  reminderOffsetHours: integer("reminder_offset_hours").notNull().default(24),
  // Hours before the appointment to send reminders (e.g. [168, 24, 2] = week + day + 2h)
  appointmentReminderOffsets: integer("appointment_reminder_offsets")
    .array()
    .notNull()
    .default([168, 24, 2]),
  vaccineRemindersEnabled: boolean("vaccine_reminders_enabled").notNull().default(true),
  vaccineReminderDaysBefore: integer("vaccine_reminder_days_before").notNull().default(30),
  medicationRemindersEnabled: boolean("medication_reminders_enabled").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type PatientNotificationPrefs = typeof patientNotificationPrefs.$inferSelect;
export type NewPatientNotificationPrefs = typeof patientNotificationPrefs.$inferInsert;

export const patientNotifications = pgTable(
  "patient_notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: uuid("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 40 }).notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    body: text("body"),
    link: varchar("link", { length: 500 }),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("patient_notifications_patient_idx").on(table.patientId, table.createdAt),
    index("patient_notifications_unread_idx").on(table.patientId),
  ]
);

export type PatientNotification = typeof patientNotifications.$inferSelect;
export type NewPatientNotification = typeof patientNotifications.$inferInsert;

// ─── Stream 4 (Différenciateurs) ─────────────────────────────────────────────

export const patientReferralCodes = pgTable("patient_referral_codes", {
  patientId: uuid("patient_id").primaryKey().references(() => patients.id, { onDelete: "cascade" }),
  code: varchar("code", { length: 20 }).notNull().unique(),
  usesCount: integer("uses_count").notNull().default(0),
  rewardsEarned: integer("rewards_earned").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type PatientReferralCode = typeof patientReferralCodes.$inferSelect;
export type NewPatientReferralCode = typeof patientReferralCodes.$inferInsert;

export const patientReferralUsages = pgTable(
  "patient_referral_usages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    referrerId: uuid("referrer_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
    referredId: uuid("referred_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
    appointmentId: uuid("appointment_id").references(() => appointments.id, { onDelete: "set null" }),
    rewardGranted: boolean("reward_granted").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("referral_usages_referrer_idx").on(table.referrerId)]
);

export type PatientReferralUsage = typeof patientReferralUsages.$inferSelect;
export type NewPatientReferralUsage = typeof patientReferralUsages.$inferInsert;

// ─── Stream 5 (Nice-to-have) ──────────────────────────────────────────────────

export const patientVaccinations = pgTable(
  "patient_vaccinations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: uuid("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
    vaccineName: varchar("vaccine_name", { length: 120 }).notNull(),
    dateReceived: date("date_received").notNull(),
    batchNumber: varchar("batch_number", { length: 60 }),
    givenBy: varchar("given_by", { length: 120 }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("patient_vaccinations_patient_idx").on(table.patientId, table.dateReceived)]
);

export type PatientVaccination = typeof patientVaccinations.$inferSelect;
export type NewPatientVaccination = typeof patientVaccinations.$inferInsert;

export const patientMedications = pgTable(
  "patient_medications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: uuid("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
    medicationName: varchar("medication_name", { length: 160 }).notNull(),
    dosage: varchar("dosage", { length: 80 }),
    frequency: varchar("frequency", { length: 80 }),
    startedAt: date("started_at"),
    endedAt: date("ended_at"),
    notes: text("notes"),
    // Reminder settings — when enabled, the scheduler sends app/email pings at
    // each `reminderTimes` HH:MM during the active window (startedAt → endedAt).
    reminderEnabled: boolean("reminder_enabled").notNull().default(false),
    reminderTimes: text("reminder_times").array().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("patient_medications_patient_idx").on(table.patientId)]
);

export type PatientMedication = typeof patientMedications.$inferSelect;
export type NewPatientMedication = typeof patientMedications.$inferInsert;

export const patientAllergies = pgTable(
  "patient_allergies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: uuid("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
    allergen: varchar("allergen", { length: 160 }).notNull(),
    severity: varchar("severity", { length: 20 }),
    reaction: text("reaction"),
    diagnosedAt: date("diagnosed_at"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("patient_allergies_patient_idx").on(table.patientId)]
);

export type PatientAllergy = typeof patientAllergies.$inferSelect;
export type NewPatientAllergy = typeof patientAllergies.$inferInsert;

export const patientAnalyses = pgTable(
  "patient_analyses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: uuid("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 200 }).notNull(),
    labName: varchar("lab_name", { length: 160 }),
    testDate: date("test_date"),
    fileUrl: varchar("file_url", { length: 500 }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("patient_analyses_patient_idx").on(table.patientId, table.testDate)]
);

export type PatientAnalysis = typeof patientAnalyses.$inferSelect;
export type NewPatientAnalysis = typeof patientAnalyses.$inferInsert;

// ─── Phase 1 — Stream A: Marketing (migration 0076) ───────────────────────────

export const newsletterSubscribers = pgTable(
  "newsletter_subscribers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    patientId: uuid("patient_id").references(() => patients.id, { onDelete: "set null" }),
    language: varchar("language", { length: 2 }).notNull().default("fr"),
    source: varchar("source", { length: 40 }),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true }),
    unsubscribeToken: varchar("unsubscribe_token", { length: 64 }).unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  }
);

export type NewsletterSubscriber = typeof newsletterSubscribers.$inferSelect;
export type NewNewsletterSubscriber = typeof newsletterSubscribers.$inferInsert;

export const newsletterIssues = pgTable("newsletter_issues", {
  id: uuid("id").primaryKey().defaultRandom(),
  titleFr: varchar("title_fr", { length: 200 }).notNull(),
  titleAr: varchar("title_ar", { length: 200 }),
  contentHtmlFr: text("content_html_fr").notNull(),
  contentHtmlAr: text("content_html_ar"),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  recipientCount: integer("recipient_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  createdByAdmin: uuid("created_by_admin"),
});

export type NewsletterIssue = typeof newsletterIssues.$inferSelect;
export type NewNewsletterIssue = typeof newsletterIssues.$inferInsert;

export const pregnancyWeekContent = pgTable("pregnancy_week_content", {
  weekNumber: integer("week_number").primaryKey(),
  titleFr: varchar("title_fr", { length: 200 }).notNull(),
  titleAr: varchar("title_ar", { length: 200 }),
  babySizeFr: varchar("baby_size_fr", { length: 120 }),
  babySizeAr: varchar("baby_size_ar", { length: 120 }),
  contentMdFr: text("content_md_fr").notNull(),
  contentMdAr: text("content_md_ar"),
  tipsFr: jsonb("tips_fr").$type<string[]>().default([]),
  tipsAr: jsonb("tips_ar").$type<string[]>().default([]),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type PregnancyWeekContent = typeof pregnancyWeekContent.$inferSelect;
export type NewPregnancyWeekContent = typeof pregnancyWeekContent.$inferInsert;

export const patientPregnancies = pgTable(
  "patient_pregnancies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: uuid("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
    dueDate: date("due_date").notNull(),
    startDate: date("start_date"),
    endedAt: date("ended_at"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("patient_pregnancies_active_idx").on(table.patientId)]
);

export type PatientPregnancy = typeof patientPregnancies.$inferSelect;
export type NewPatientPregnancy = typeof patientPregnancies.$inferInsert;

export const vaccineInfoContent = pgTable("vaccine_info_content", {
  slug: varchar("slug", { length: 60 }).primaryKey(),
  nameFr: varchar("name_fr", { length: 120 }).notNull(),
  nameAr: varchar("name_ar", { length: 120 }),
  ageMinMonths: integer("age_min_months").notNull().default(0),
  ageMaxMonths: integer("age_max_months"),
  descriptionFr: text("description_fr").notNull(),
  descriptionAr: text("description_ar"),
  dosesCount: integer("doses_count").notNull().default(1),
  isMandatoryTn: boolean("is_mandatory_tn").notNull().default(false),
  displayOrder: integer("display_order").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type VaccineInfoContent = typeof vaccineInfoContent.$inferSelect;
export type NewVaccineInfoContent = typeof vaccineInfoContent.$inferInsert;

export const childVaccinationRecords = pgTable(
  "child_vaccination_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: uuid("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
    dependentId: uuid("dependent_id").references(() => patientDependents.id, { onDelete: "cascade" }),
    vaccineSlug: varchar("vaccine_slug", { length: 60 }).notNull().references(() => vaccineInfoContent.slug, { onDelete: "restrict" }),
    doseNumber: integer("dose_number").notNull().default(1),
    dateReceived: date("date_received").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("child_vaccination_records_patient_idx").on(table.patientId, table.dependentId)]
);

export type ChildVaccinationRecord = typeof childVaccinationRecords.$inferSelect;
export type NewChildVaccinationRecord = typeof childVaccinationRecords.$inferInsert;

// ─── Phase 1 — Stream B: Retention (migration 0077) ───────────────────────────

export const chronicDiseaseContent = pgTable("chronic_disease_content", {
  slug: varchar("slug", { length: 60 }).primaryKey(),
  nameFr: varchar("name_fr", { length: 120 }).notNull(),
  nameAr: varchar("name_ar", { length: 120 }),
  descriptionFr: text("description_fr").notNull(),
  descriptionAr: text("description_ar"),
  reminderDefaultFreqHours: integer("reminder_default_freq_hours").notNull().default(24),
  displayOrder: integer("display_order").notNull().default(0),
});

export type ChronicDiseaseContent = typeof chronicDiseaseContent.$inferSelect;
export type NewChronicDiseaseContent = typeof chronicDiseaseContent.$inferInsert;

export const chronicTreatmentReminders = pgTable(
  "chronic_treatment_reminders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: uuid("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
    diseaseSlug: varchar("disease_slug", { length: 60 }).references(() => chronicDiseaseContent.slug, { onDelete: "set null" }),
    medicationName: varchar("medication_name", { length: 160 }).notNull(),
    dosage: varchar("dosage", { length: 80 }),
    frequencyHours: integer("frequency_hours").notNull().default(24),
    nextReminderAt: timestamp("next_reminder_at", { withTimezone: true }).notNull(),
    notificationChannel: varchar("notification_channel", { length: 10 }).notNull().default("sms"),
    active: boolean("active").notNull().default(true),
    pausedUntil: timestamp("paused_until", { withTimezone: true }),
    lastSentAt: timestamp("last_sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("chronic_reminders_due_idx").on(table.nextReminderAt)]
);

export type ChronicTreatmentReminder = typeof chronicTreatmentReminders.$inferSelect;
export type NewChronicTreatmentReminder = typeof chronicTreatmentReminders.$inferInsert;

export const doctorReferrals = pgTable(
  "doctor_referrals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    referrerDoctorId: uuid("referrer_doctor_id").notNull().references(() => doctors.id, { onDelete: "cascade" }),
    referredDoctorId: uuid("referred_doctor_id").notNull().references(() => doctors.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    commissionPct: numeric("commission_pct", { precision: 4, scale: 2 }).notNull().default("5.00"),
    rewardsEarnedTnd: numeric("rewards_earned_tnd", { precision: 10, scale: 2 }).notNull().default("0"),
    validatedAt: timestamp("validated_at", { withTimezone: true }),
    validatedByAdmin: uuid("validated_by_admin"),
    rejectionReason: text("rejection_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("doctor_referrals_referrer_idx").on(table.referrerDoctorId),
    index("doctor_referrals_pending_idx").on(table.status),
  ]
);

export type DoctorReferral = typeof doctorReferrals.$inferSelect;
export type NewDoctorReferral = typeof doctorReferrals.$inferInsert;

export const retentionPolicies = pgTable("retention_policies", {
  resourceType: varchar("resource_type", { length: 40 }).primaryKey(),
  retentionDays: integer("retention_days").notNull(),
  description: text("description"),
  hardDelete: boolean("hard_delete").notNull().default(false),
  lastRunAt: timestamp("last_run_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type RetentionPolicy = typeof retentionPolicies.$inferSelect;
export type NewRetentionPolicy = typeof retentionPolicies.$inferInsert;

export const anonymizationConsents = pgTable("anonymization_consents", {
  patientId: uuid("patient_id")
    .primaryKey()
    .references(() => patients.id, { onDelete: "cascade" }),
  granted: boolean("granted").notNull().default(false),
  grantedAt: timestamp("granted_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  scope: jsonb("scope").$type<string[]>().notNull().default(["aggregate_stats"]),
  ip: varchar("ip", { length: 50 }),
  userAgent: text("user_agent"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AnonymizationConsent = typeof anonymizationConsents.$inferSelect;
export type NewAnonymizationConsent = typeof anonymizationConsents.$inferInsert;

// ─── Phase 1 — Stream C: Tech & API (migration 0078) ──────────────────────────

export const apiKeys = pgTable(
  "api_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    keyHash: varchar("key_hash", { length: 128 }).notNull().unique(),
    prefix: varchar("prefix", { length: 20 }).notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    ownerEmail: varchar("owner_email", { length: 255 }),
    scopes: jsonb("scopes")
      .$type<string[]>()
      .notNull()
      .default(["read:doctors", "read:specialties", "read:cities"]),
    rateLimitPerMinute: integer("rate_limit_per_minute").notNull().default(60),
    active: boolean("active").notNull().default(true),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    createdByAdmin: uuid("created_by_admin"),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => [index("api_keys_hash_idx").on(table.keyHash)]
);

export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;

export const apiRequestLogs = pgTable(
  "api_request_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    apiKeyId: uuid("api_key_id").references(() => apiKeys.id, { onDelete: "set null" }),
    method: varchar("method", { length: 10 }).notNull(),
    path: varchar("path", { length: 255 }).notNull(),
    statusCode: integer("status_code"),
    durationMs: integer("duration_ms"),
    ip: varchar("ip", { length: 50 }),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("api_request_logs_key_time_idx").on(table.apiKeyId, table.createdAt)]
);

export type ApiRequestLog = typeof apiRequestLogs.$inferSelect;
export type NewApiRequestLog = typeof apiRequestLogs.$inferInsert;

export const cnamActs = pgTable("cnam_acts", {
  code: varchar("code", { length: 20 }).primaryKey(),
  nameFr: varchar("name_fr", { length: 200 }).notNull(),
  nameAr: varchar("name_ar", { length: 200 }),
  baseFeeTnd: numeric("base_fee_tnd", { precision: 8, scale: 2 }).notNull(),
  reimbursementPct: numeric("reimbursement_pct", { precision: 5, scale: 2 }).notNull().default("70.00"),
  category: varchar("category", { length: 40 }),
  notesFr: text("notes_fr"),
  notesAr: text("notes_ar"),
  displayOrder: integer("display_order").notNull().default(0),
});

export type CnamAct = typeof cnamActs.$inferSelect;
export type NewCnamAct = typeof cnamActs.$inferInsert;

// ─── Phase 1 — Stream D: Polish (migration 0079) ──────────────────────────────

export const doctorBenchmarkSnapshots = pgTable("doctor_benchmark_snapshots", {
  doctorId: uuid("doctor_id")
    .primaryKey()
    .references(() => doctors.id, { onDelete: "cascade" }),
  specialty: varchar("specialty", { length: 100 }),
  city: varchar("city", { length: 100 }),
  noShowRate: numeric("no_show_rate", { precision: 5, scale: 2 }),
  noShowRankSpecialty: integer("no_show_rank_specialty"),
  noShowTotalSpecialty: integer("no_show_total_specialty"),
  avgRating: numeric("avg_rating", { precision: 3, scale: 2 }),
  ratingRankSpecialty: integer("rating_rank_specialty"),
  totalAppointments30d: integer("total_appointments_30d"),
  appointmentsRankSpecialty: integer("appointments_rank_specialty"),
  computedAt: timestamp("computed_at", { withTimezone: true }).notNull().defaultNow(),
});

export type DoctorBenchmarkSnapshot = typeof doctorBenchmarkSnapshots.$inferSelect;
export type NewDoctorBenchmarkSnapshot = typeof doctorBenchmarkSnapshots.$inferInsert;

// ── Coach IA usage (Phase 2 #9) ─────────────────────────────────────────────
// Privacy-by-design: NEVER log user message content here. Only metadata.
export const coachIaUsage = pgTable(
  "coach_ia_usage",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: uuid("patient_id").references(() => patients.id, { onDelete: "set null" }),
    eventType: varchar("event_type", { length: 40 }).notNull(),  // 'message' | 'disclaimer_accepted'
    tokensIn: integer("tokens_in").default(0),
    tokensOut: integer("tokens_out").default(0),
    costUsd: numeric("cost_usd", { precision: 10, scale: 6 }).default("0"),
    latencyMs: integer("latency_ms").default(0),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("coach_ia_usage_patient_idx").on(table.patientId),
    index("coach_ia_usage_created_idx").on(table.createdAt),
  ]
);

export type CoachIaUsage = typeof coachIaUsage.$inferSelect;
export type NewCoachIaUsage = typeof coachIaUsage.$inferInsert;

// ── Phase 2 #2 — Payments (2026-05-06) ──────────────────────────────────────

// Per-doctor payment method configuration. One row per (doctor_id, method).
export const doctorPaymentMethods = pgTable(
  "doctor_payment_methods",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    doctorId: uuid("doctor_id").notNull().references(() => doctors.id, { onDelete: "cascade" }),
    method: varchar("method", { length: 30 }).notNull(),  // stripe_card | bank_transfer | cash_on_premises | flouci | paymee
    enabled: boolean("enabled").notNull().default(false),
    config: jsonb("config").default({}),  // {iban, bic, bankName, accountHolder} for bank_transfer
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("doctor_payment_methods_doctor_method_uidx").on(t.doctorId, t.method),
  ]
);

// Bank transfer payment intents. Patient creates → admin verifies → confirmed.
export const bankTransferIntents = pgTable(
  "bank_transfer_intents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    appointmentId: uuid("appointment_id").references(() => appointments.id, { onDelete: "cascade" }),
    patientId: uuid("patient_id").references(() => patients.id, { onDelete: "set null" }),
    doctorId: uuid("doctor_id").references(() => doctors.id, { onDelete: "set null" }),
    amount: integer("amount").notNull(),  // in millimes (TND base unit)
    reference: varchar("reference", { length: 40 }).notNull().unique(),
    status: varchar("status", { length: 20 }).notNull().default("pending"),  // pending | confirmed | rejected | expired
    proofFileUrl: text("proof_file_url"),
    confirmedByAdminId: uuid("confirmed_by_admin_id").references(() => adminUsers.id, { onDelete: "set null" }),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    rejectedReason: text("rejected_reason"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("bank_transfer_intents_status_idx").on(t.status),
    index("bank_transfer_intents_appointment_idx").on(t.appointmentId),
  ]
);

// Stripe events log — idempotency (prevents replay) + audit trail.
export const stripeEventsLog = pgTable(
  "stripe_events_log",
  {
    eventId: varchar("event_id", { length: 100 }).primaryKey(),
    eventType: varchar("event_type", { length: 50 }).notNull(),
    payload: jsonb("payload").notNull(),
    processedAt: timestamp("processed_at", { withTimezone: true }).defaultNow().notNull(),
  }
);

export type DoctorPaymentMethod = typeof doctorPaymentMethods.$inferSelect;
export type NewDoctorPaymentMethod = typeof doctorPaymentMethods.$inferInsert;
export type BankTransferIntent = typeof bankTransferIntents.$inferSelect;
export type NewBankTransferIntent = typeof bankTransferIntents.$inferInsert;
export type StripeEvent = typeof stripeEventsLog.$inferSelect;

// ── Phase 2 audit Gap 3 — Communications infra (Wave 8) ─────────────────────

// WhatsApp send log (mirrors smsLogs pattern at line 459)
export const whatsappLogs = pgTable(
  "whatsapp_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    recipientPhone: varchar("recipient_phone", { length: 30 }).notNull(),
    /** patient | doctor | secretary | admin */
    recipientType: varchar("recipient_type", { length: 20 }),
    recipientId: uuid("recipient_id"),
    body: text("body").notNull(),
    /** queued | sent | delivered | read | failed */
    status: varchar("status", { length: 20 }).notNull().default("queued"),
    /** Provider message id from WhatsApp Cloud API or whichever gateway */
    providerMessageId: varchar("provider_message_id", { length: 255 }),
    error: text("error"),
    /** Sender admin id, if triggered from admin UI */
    triggeredByAdminId: uuid("triggered_by_admin_id").references(() => adminUsers.id, { onDelete: "set null" }),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("whatsapp_logs_recipient_idx").on(t.recipientId),
    index("whatsapp_logs_status_idx").on(t.status),
    index("whatsapp_logs_created_idx").on(t.createdAt),
  ]
);

// Push notification log (parallel to smsLogs)
export const pushNotificationsLog = pgTable(
  "push_notifications_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** patient | doctor | secretary */
    recipientType: varchar("recipient_type", { length: 20 }).notNull(),
    recipientId: uuid("recipient_id").notNull(),
    /** Token used at send time (snapshot) */
    deviceToken: text("device_token"),
    title: varchar("title", { length: 255 }).notNull(),
    body: text("body").notNull(),
    /** JSON payload of additional data sent with the notification */
    data: jsonb("data"),
    /** queued | sent | delivered | failed */
    status: varchar("status", { length: 20 }).notNull().default("queued"),
    error: text("error"),
    triggeredByAdminId: uuid("triggered_by_admin_id").references(() => adminUsers.id, { onDelete: "set null" }),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("push_notifications_log_recipient_idx").on(t.recipientType, t.recipientId),
    index("push_notifications_log_status_idx").on(t.status),
    index("push_notifications_log_created_idx").on(t.createdAt),
  ]
);

// Reusable message templates for SMS / WhatsApp / Push / Email broadcasts
export const messageTemplates = pgTable(
  "message_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** human-readable identifier; unique */
    key: varchar("key", { length: 100 }).notNull().unique(),
    name: varchar("name", { length: 255 }).notNull(),
    /** sms | whatsapp | push | email */
    channel: varchar("channel", { length: 20 }).notNull(),
    /** Optional, used for email subject or push title */
    subject: varchar("subject", { length: 255 }),
    /** Body with {{variable}} placeholders */
    body: text("body").notNull(),
    /** List of variables expected to be substituted, e.g. ["patientName", "appointmentDate"] */
    variables: jsonb("variables").default([]),
    /** fr | ar | en — defaults to fr */
    language: varchar("language", { length: 5 }).notNull().default("fr"),
    isActive: boolean("is_active").notNull().default(true),
    createdByAdminId: uuid("created_by_admin_id").references(() => adminUsers.id, { onDelete: "set null" }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("message_templates_channel_idx").on(t.channel),
    index("message_templates_active_idx").on(t.isActive),
  ]
);

export type WhatsappLog = typeof whatsappLogs.$inferSelect;
export type NewWhatsappLog = typeof whatsappLogs.$inferInsert;
export type PushNotificationLog = typeof pushNotificationsLog.$inferSelect;
export type NewPushNotificationLog = typeof pushNotificationsLog.$inferInsert;
export type MessageTemplate = typeof messageTemplates.$inferSelect;
export type NewMessageTemplate = typeof messageTemplates.$inferInsert;

// ── Wave 5 — Doctor reply to patient review ─────────────────────────────────
export const reviewReplies = pgTable(
  "review_replies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reviewId: uuid("review_id").notNull().references(() => reviews.id, { onDelete: "cascade" }),
    doctorId: uuid("doctor_id").notNull().references(() => doctors.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    /** pending | approved | rejected */
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    moderatedBy: uuid("moderated_by").references(() => adminUsers.id, { onDelete: "set null" }),
    moderatedAt: timestamp("moderated_at", { withTimezone: true }),
    rejectionReason: text("rejection_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("review_replies_review_uidx").on(t.reviewId), // one reply per review
    index("review_replies_doctor_idx").on(t.doctorId),
    index("review_replies_status_idx").on(t.status),
  ]
);

export type ReviewReply = typeof reviewReplies.$inferSelect;
export type NewReviewReply = typeof reviewReplies.$inferInsert;

// ── Wave 6 — Refunds table (replaces appointments.payment_status='refund_pending') ─
export const refunds = pgTable(
  "refunds",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Source: 'appointment' | 'subscription' */
    sourceType: varchar("source_type", { length: 20 }).notNull(),
    sourceId: uuid("source_id").notNull(),
    /** Original payment ref (Stripe charge id, Flouci payment_id, etc) */
    originalPaymentRef: varchar("original_payment_ref", { length: 255 }),
    /** Stripe / flouci / bank_transfer / cash etc. */
    provider: varchar("provider", { length: 30 }).notNull(),
    /** Refund amount in millimes (TND) */
    amount: integer("amount").notNull(),
    /** Currency, default TND */
    currency: varchar("currency", { length: 5 }).notNull().default("TND"),
    /** Provider refund id, if returned */
    providerRefundId: varchar("provider_refund_id", { length: 255 }),
    /** pending | processing | succeeded | failed */
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    reason: text("reason"),
    /** Patient who received the refund */
    patientId: uuid("patient_id").references(() => patients.id, { onDelete: "set null" }),
    /** Doctor whose wallet was debited */
    doctorId: uuid("doctor_id").references(() => doctors.id, { onDelete: "set null" }),
    /** Admin who initiated the refund */
    initiatedByAdminId: uuid("initiated_by_admin_id").references(() => adminUsers.id, { onDelete: "set null" }),
    failureReason: text("failure_reason"),
    succeededAt: timestamp("succeeded_at", { withTimezone: true }),
    failedAt: timestamp("failed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("refunds_source_idx").on(t.sourceType, t.sourceId),
    index("refunds_status_idx").on(t.status),
    index("refunds_provider_idx").on(t.provider),
    index("refunds_created_idx").on(t.createdAt),
  ]
);

export type Refund = typeof refunds.$inferSelect;
export type NewRefund = typeof refunds.$inferInsert;

// ── Wave 10 — Insurance providers catalog ─────────────────────────────────
export const insuranceProviders = pgTable("insurance_providers", {
  id: varchar("id", { length: 50 }).primaryKey(),
  label: varchar("label", { length: 100 }).notNull(),
  labelAr: varchar("label_ar", { length: 100 }),
  type: varchar("type", { length: 20 }).notNull(), // public | private
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
export type InsuranceProvider = typeof insuranceProviders.$inferSelect;
export type NewInsuranceProvider = typeof insuranceProviders.$inferInsert;

// ── Wave 10 — Global motif templates ──────────────────────────────────────
export const catalogMotifs = pgTable(
  "catalog_motifs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
    nameAr: varchar("name_ar", { length: 255 }),
    specialtyId: varchar("specialty_id", { length: 50 }).references(() => catalogSpecialties.id),
    durationMinutes: integer("duration_minutes").notNull().default(30),
    suggestedFee: integer("suggested_fee"),
    category: varchar("category", { length: 30 }).notNull().default("consultation"),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("catalog_motifs_specialty_idx").on(t.specialtyId),
    index("catalog_motifs_active_idx").on(t.isActive),
  ]
);
export type CatalogMotif = typeof catalogMotifs.$inferSelect;
export type NewCatalogMotif = typeof catalogMotifs.$inferInsert;

// ── Wave 10 — Meilisearch synonyms editor ─────────────────────────────────
export const meilisearchSynonyms = pgTable("meilisearch_synonyms", {
  id: uuid("id").primaryKey().defaultRandom(),
  term: varchar("term", { length: 100 }).notNull().unique(),
  synonyms: jsonb("synonyms").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
export type MeilisearchSynonym = typeof meilisearchSynonyms.$inferSelect;
export type NewMeilisearchSynonym = typeof meilisearchSynonyms.$inferInsert;
