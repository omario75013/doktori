-- 0077_phase1_retention — Stream B: Chronic reminders + Doctor referral + Retention + Anonymization
-- Idempotent ADD-ONLY.

-- Chronic disease info content
CREATE TABLE IF NOT EXISTS chronic_disease_content (
  slug            varchar(60) PRIMARY KEY,
  name_fr         varchar(120) NOT NULL,
  name_ar         varchar(120),
  description_fr  text NOT NULL,
  description_ar  text,
  reminder_default_freq_hours integer NOT NULL DEFAULT 24,  -- daily
  display_order   integer NOT NULL DEFAULT 0
);

-- Patient chronic treatment reminders
CREATE TABLE IF NOT EXISTS chronic_treatment_reminders (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  disease_slug    varchar(60) REFERENCES chronic_disease_content(slug) ON DELETE SET NULL,
  medication_name varchar(160) NOT NULL,
  dosage          varchar(80),
  frequency_hours integer NOT NULL DEFAULT 24,  -- every X hours
  next_reminder_at timestamptz NOT NULL,
  notification_channel varchar(10) NOT NULL DEFAULT 'sms' CHECK (notification_channel IN ('sms','email','push')),
  active          boolean NOT NULL DEFAULT true,
  paused_until    timestamptz,
  last_sent_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS chronic_reminders_due_idx
  ON chronic_treatment_reminders(next_reminder_at) WHERE active = true AND paused_until IS NULL;

-- Doctor-to-doctor referrals (with commission)
CREATE TABLE IF NOT EXISTS doctor_referrals (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_doctor_id uuid NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  referred_doctor_id uuid NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  status          varchar(20) NOT NULL DEFAULT 'pending'  -- 'pending' | 'validated' | 'rejected'
                  CHECK (status IN ('pending', 'validated', 'rejected')),
  commission_pct  numeric(4,2) NOT NULL DEFAULT 5.00,  -- % of referee's first 3 months
  rewards_earned_tnd numeric(10,2) NOT NULL DEFAULT 0,
  validated_at    timestamptz,
  validated_by_admin uuid,
  rejection_reason text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT no_self_referral CHECK (referrer_doctor_id <> referred_doctor_id),
  CONSTRAINT doctor_referral_unique UNIQUE (referrer_doctor_id, referred_doctor_id)
);
CREATE INDEX IF NOT EXISTS doctor_referrals_referrer_idx ON doctor_referrals(referrer_doctor_id);
CREATE INDEX IF NOT EXISTS doctor_referrals_pending_idx ON doctor_referrals(status) WHERE status = 'pending';

-- Retention policies (configurable by admin)
CREATE TABLE IF NOT EXISTS retention_policies (
  resource_type   varchar(40) PRIMARY KEY,
  retention_days  integer NOT NULL CHECK (retention_days > 0),
  description     text,
  hard_delete     boolean NOT NULL DEFAULT false,  -- false = anonymize, true = hard delete
  last_run_at     timestamptz,
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Seed default retention policies
INSERT INTO retention_policies (resource_type, retention_days, description, hard_delete) VALUES
  ('audit_logs',          365 * 5,  '5 ans (légal Tunisie)',                 false),
  ('sms_logs',            365 * 2,  '2 ans (analyse usage)',                 false),
  ('messages',            365 * 5,  '5 ans (secret médical, anonymisé)',     false),
  ('cancelled_appointments', 365 * 1, '1 an post-cancel',                    true),
  ('inactive_patients',   365 * 7,  '7 ans inactivité = suppression',        true),
  ('webhook_logs',        90,       '3 mois',                                true),
  ('analytics_events',    365 * 1,  '1 an',                                  true)
ON CONFLICT (resource_type) DO NOTHING;

-- Anonymization consents (opt-in for medical research)
CREATE TABLE IF NOT EXISTS anonymization_consents (
  patient_id      uuid PRIMARY KEY REFERENCES patients(id) ON DELETE CASCADE,
  granted         boolean NOT NULL DEFAULT false,
  granted_at      timestamptz,
  revoked_at      timestamptz,
  scope           jsonb NOT NULL DEFAULT '["aggregate_stats"]'::jsonb,
                  -- ['aggregate_stats', 'research_partner_X', 'public_health']
  ip              varchar(50),
  user_agent      text,
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Seed chronic disease content (3 starter diseases)
INSERT INTO chronic_disease_content (slug, name_fr, name_ar, description_fr, description_ar, reminder_default_freq_hours, display_order) VALUES
('diabete-t2',   'Diabète Type 2',          'السكري النوع 2',     'Maladie chronique caractérisée par une glycémie élevée. Le suivi régulier de la glycémie et la prise rigoureuse du traitement sont essentiels.', 'مرض مزمن يتميز بارتفاع نسبة السكر في الدم. المتابعة المنتظمة للسكر وتناول العلاج بانتظام أمر ضروري.',                                       24, 10),
('hypertension', 'Hypertension artérielle', 'ارتفاع ضغط الدم',     'Maladie chronique nécessitant un traitement quotidien et un suivi régulier de la tension artérielle.',                                              'مرض مزمن يتطلب علاجًا يوميًا ومتابعة منتظمة لضغط الدم.',                                                                                       24, 20),
('asthme',       'Asthme',                  'الربو',               'Maladie respiratoire chronique. Les traitements de fond se prennent quotidiennement, même en dehors des crises.',                                  'مرض تنفسي مزمن. يجب أخذ علاجات الوقاية يوميا حتى خارج النوبات.',                                                                               24, 30)
ON CONFLICT (slug) DO NOTHING;
