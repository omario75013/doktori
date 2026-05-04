-- 0076_phase1_marketing — Stream A: Newsletter + Pregnancy + Child vaccinations + SEO infra
-- Idempotent ADD-ONLY. Coexists with parallel doctor-side work.

-- Newsletter subscribers
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email           varchar(255) NOT NULL UNIQUE,
  patient_id      uuid REFERENCES patients(id) ON DELETE SET NULL,
  language        char(2) NOT NULL DEFAULT 'fr' CHECK (language IN ('fr','ar')),
  source          varchar(40),  -- 'home_form' | 'seo_empty_city' | 'profile' | 'manual'
  confirmed_at    timestamptz,
  unsubscribed_at timestamptz,
  unsubscribe_token varchar(64) UNIQUE,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS newsletter_subscribers_active_idx
  ON newsletter_subscribers(email) WHERE unsubscribed_at IS NULL AND confirmed_at IS NOT NULL;

-- Newsletter issues (sent campaigns)
CREATE TABLE IF NOT EXISTS newsletter_issues (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title_fr        varchar(200) NOT NULL,
  title_ar        varchar(200),
  content_html_fr text NOT NULL,
  content_html_ar text,
  scheduled_at    timestamptz,
  sent_at         timestamptz,
  recipient_count integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  created_by_admin uuid
);
CREATE INDEX IF NOT EXISTS newsletter_issues_scheduled_idx
  ON newsletter_issues(scheduled_at) WHERE sent_at IS NULL AND scheduled_at IS NOT NULL;

-- Pregnancy week content (referenced by /grossesse/[week] pages)
CREATE TABLE IF NOT EXISTS pregnancy_week_content (
  week_number     integer PRIMARY KEY CHECK (week_number BETWEEN 1 AND 42),
  title_fr        varchar(200) NOT NULL,
  title_ar        varchar(200),
  baby_size_fr    varchar(120),
  baby_size_ar    varchar(120),
  content_md_fr   text NOT NULL,
  content_md_ar   text,
  tips_fr         jsonb DEFAULT '[]'::jsonb,
  tips_ar         jsonb DEFAULT '[]'::jsonb,
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Patient pregnancy tracking
CREATE TABLE IF NOT EXISTS patient_pregnancies (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  due_date        date NOT NULL,
  start_date      date,  -- LMP if known
  ended_at        date,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pregnancy_active_unique UNIQUE NULLS NOT DISTINCT (patient_id, ended_at)
);
CREATE INDEX IF NOT EXISTS patient_pregnancies_active_idx
  ON patient_pregnancies(patient_id) WHERE ended_at IS NULL;

-- Vaccine info content (referential, served by /vaccins/[slug])
CREATE TABLE IF NOT EXISTS vaccine_info_content (
  slug            varchar(60) PRIMARY KEY,
  name_fr         varchar(120) NOT NULL,
  name_ar         varchar(120),
  age_min_months  integer NOT NULL DEFAULT 0,
  age_max_months  integer,  -- null = adult
  description_fr  text NOT NULL,
  description_ar  text,
  doses_count     integer NOT NULL DEFAULT 1,
  is_mandatory_tn boolean NOT NULL DEFAULT false,
  display_order   integer NOT NULL DEFAULT 0,
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Patient child vaccination records (which doses received)
CREATE TABLE IF NOT EXISTS child_vaccination_records (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  dependent_id    uuid REFERENCES patient_dependents(id) ON DELETE CASCADE,
  vaccine_slug    varchar(60) NOT NULL REFERENCES vaccine_info_content(slug) ON DELETE RESTRICT,
  dose_number     integer NOT NULL DEFAULT 1,
  date_received   date NOT NULL,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT child_vaccination_unique UNIQUE (patient_id, dependent_id, vaccine_slug, dose_number)
);
CREATE INDEX IF NOT EXISTS child_vaccination_records_patient_idx
  ON child_vaccination_records(patient_id, dependent_id);
