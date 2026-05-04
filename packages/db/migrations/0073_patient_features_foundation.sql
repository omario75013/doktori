-- 0073_patient_features_foundation — DB foundation for 30 patient frontend features
-- Idempotent. ADD-ONLY. Coexists with parallel doctor-side development.

-- ─── Stream 2 (RGPD) tables ──────────────────────────────────────────────────

-- Account deletion requests (RGPD art. 17)
CREATE TABLE IF NOT EXISTS account_deletion_requests (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  reason          text,
  requested_at    timestamptz NOT NULL DEFAULT now(),
  scheduled_at    timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  cancelled_at    timestamptz,
  executed_at     timestamptz
);
CREATE INDEX IF NOT EXISTS account_deletion_patient_idx
  ON account_deletion_requests(patient_id) WHERE executed_at IS NULL;

-- Patient consents (cookies, marketing, research)
CREATE TABLE IF NOT EXISTS patient_consents (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  consent_type    varchar(40) NOT NULL,  -- 'cookies_analytics' | 'cookies_marketing' | 'marketing_email' | 'research_anonymized'
  granted         boolean NOT NULL,
  granted_at      timestamptz NOT NULL DEFAULT now(),
  ip              varchar(50),
  user_agent      text,
  CONSTRAINT patient_consents_unique UNIQUE (patient_id, consent_type)
);
CREATE INDEX IF NOT EXISTS patient_consents_patient_idx ON patient_consents(patient_id);

-- Patient sessions (login history + remote logout)
CREATE TABLE IF NOT EXISTS patient_sessions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  session_token   varchar(255) NOT NULL UNIQUE,
  ip              varchar(50),
  user_agent      text,
  device_label    varchar(100),  -- "iPhone Safari" auto-detected
  created_at      timestamptz NOT NULL DEFAULT now(),
  last_active_at  timestamptz NOT NULL DEFAULT now(),
  revoked_at      timestamptz
);
CREATE INDEX IF NOT EXISTS patient_sessions_patient_idx
  ON patient_sessions(patient_id, created_at DESC) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS patient_sessions_token_idx ON patient_sessions(session_token);

-- Patient 2FA TOTP
CREATE TABLE IF NOT EXISTS patient_2fa (
  patient_id      uuid PRIMARY KEY REFERENCES patients(id) ON DELETE CASCADE,
  totp_secret     text NOT NULL,
  enabled         boolean NOT NULL DEFAULT false,
  backup_codes    jsonb NOT NULL DEFAULT '[]'::jsonb,
  enabled_at      timestamptz,
  last_used_at    timestamptz
);

-- ─── Stream 3 (UX) tables ────────────────────────────────────────────────────

-- Patient favorite doctors
CREATE TABLE IF NOT EXISTS patient_favorites (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id       uuid NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT patient_favorites_unique UNIQUE (patient_id, doctor_id)
);
CREATE INDEX IF NOT EXISTS patient_favorites_patient_idx ON patient_favorites(patient_id, created_at DESC);

-- Patient dependents — created conditionally (may already exist from migration 0018)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'patient_dependents') THEN
    CREATE TABLE patient_dependents (
      id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      patient_id      uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      first_name      varchar(100) NOT NULL,
      last_name       varchar(100) NOT NULL,
      date_of_birth   date,
      gender          varchar(10),  -- 'male' | 'female'
      relationship    varchar(40),  -- 'child' | 'spouse' | 'parent' | 'sibling' | 'other'
      blood_type      varchar(5),
      cin             varchar(20),
      cnam_number     varchar(40),
      notes           text,
      created_at      timestamptz NOT NULL DEFAULT now(),
      updated_at      timestamptz NOT NULL DEFAULT now(),
      deleted_at      timestamptz
    );
    CREATE INDEX patient_dependents_patient_idx ON patient_dependents(patient_id) WHERE deleted_at IS NULL;
  END IF;
END$$;

-- Notification preferences (granular per-channel-per-event)
CREATE TABLE IF NOT EXISTS patient_notification_prefs (
  patient_id      uuid PRIMARY KEY REFERENCES patients(id) ON DELETE CASCADE,
  email_appointments        boolean NOT NULL DEFAULT true,
  email_marketing           boolean NOT NULL DEFAULT false,
  email_news                boolean NOT NULL DEFAULT false,
  sms_appointments          boolean NOT NULL DEFAULT true,
  sms_reminders             boolean NOT NULL DEFAULT true,
  sms_otp                   boolean NOT NULL DEFAULT true,
  push_appointments         boolean NOT NULL DEFAULT true,
  push_messages             boolean NOT NULL DEFAULT true,
  reminder_offset_hours     integer NOT NULL DEFAULT 24,  -- patient choice : 1, 2, 24, 48
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Patient unified notifications inbox
CREATE TABLE IF NOT EXISTS patient_notifications (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  type            varchar(40) NOT NULL,  -- 'appointment_confirmed' | 'reminder' | 'message' | 'sos' | 'system'
  title           varchar(200) NOT NULL,
  body            text,
  link            varchar(500),
  read_at         timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS patient_notifications_patient_idx
  ON patient_notifications(patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS patient_notifications_unread_idx
  ON patient_notifications(patient_id) WHERE read_at IS NULL;

-- ─── Stream 4 (Différenciateurs) tables ──────────────────────────────────────

-- Multi-criteria reviews — extends existing reviews table with extra criteria
ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS punctuality_rating  smallint,
  ADD COLUMN IF NOT EXISTS communication_rating smallint,
  ADD COLUMN IF NOT EXISTS cleanliness_rating  smallint,
  ADD COLUMN IF NOT EXISTS staff_rating        smallint;

-- Patient referral codes
CREATE TABLE IF NOT EXISTS patient_referral_codes (
  patient_id      uuid PRIMARY KEY REFERENCES patients(id) ON DELETE CASCADE,
  code            varchar(20) NOT NULL UNIQUE,
  uses_count      integer NOT NULL DEFAULT 0,
  rewards_earned  integer NOT NULL DEFAULT 0,  -- in TND or points
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Patient referral usages (track who used whose code)
CREATE TABLE IF NOT EXISTS patient_referral_usages (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id       uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  referred_id       uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  appointment_id    uuid REFERENCES appointments(id) ON DELETE SET NULL,
  reward_granted    boolean NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT no_self_referral CHECK (referrer_id <> referred_id)
);
CREATE INDEX IF NOT EXISTS referral_usages_referrer_idx ON patient_referral_usages(referrer_id);

-- ─── Stream 5 (Nice-to-have) tables ──────────────────────────────────────────

-- Self-declared vaccinations
CREATE TABLE IF NOT EXISTS patient_vaccinations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  vaccine_name    varchar(120) NOT NULL,
  date_received   date NOT NULL,
  batch_number    varchar(60),
  given_by        varchar(120),
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS patient_vaccinations_patient_idx
  ON patient_vaccinations(patient_id, date_received DESC);

-- Self-declared current medications
CREATE TABLE IF NOT EXISTS patient_medications (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  medication_name varchar(160) NOT NULL,
  dosage          varchar(80),
  frequency       varchar(80),  -- "1 cp x 3/j"
  started_at      date,
  ended_at        date,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS patient_medications_patient_idx
  ON patient_medications(patient_id);

-- Self-declared allergies
CREATE TABLE IF NOT EXISTS patient_allergies (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  allergen        varchar(160) NOT NULL,
  severity        varchar(20),  -- 'mild' | 'moderate' | 'severe'
  reaction        text,
  diagnosed_at    date,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS patient_allergies_patient_idx ON patient_allergies(patient_id);

-- Self-uploaded analyses / lab results
CREATE TABLE IF NOT EXISTS patient_analyses (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  title           varchar(200) NOT NULL,
  lab_name        varchar(160),
  test_date       date,
  file_url        varchar(500),  -- R2 URL if uploaded
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS patient_analyses_patient_idx
  ON patient_analyses(patient_id, test_date DESC);

-- ─── ALTER on existing tables ────────────────────────────────────────────────

-- Patient profile picture URL
ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS photo_url varchar(500),
  ADD COLUMN IF NOT EXISTS cnam_card_url varchar(500),
  ADD COLUMN IF NOT EXISTS insurance_card_url varchar(500);

-- Track which appointment was rescheduled from which (for /annuler+reschedule)
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS rescheduled_from_id uuid REFERENCES appointments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cancellation_reason text;

CREATE INDEX IF NOT EXISTS appointments_rescheduled_from_idx
  ON appointments(rescheduled_from_id) WHERE rescheduled_from_id IS NOT NULL;
