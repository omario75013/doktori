-- ───────────────────────────────────────────────────────────────────────────
-- Patient dossier expansion
-- ───────────────────────────────────────────────────────────────────────────
-- Adds the fields needed for a complete medical record + attachments table.
-- Existing patient_medical_profile stays for simple text notes; structured
-- history moves into jsonb columns so the UI can render sections cleanly.
-- ───────────────────────────────────────────────────────────────────────────

ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS nationality varchar(40),
  ADD COLUMN IF NOT EXISTS address_street varchar(200),
  ADD COLUMN IF NOT EXISTS address_city varchar(80),
  ADD COLUMN IF NOT EXISTS address_postal_code varchar(10),
  ADD COLUMN IF NOT EXISTS profession_notes text;

-- ─── Extend patient_medical_profile with structured history ──
ALTER TABLE patient_medical_profile
  ADD COLUMN IF NOT EXISTS lifestyle jsonb,
  ADD COLUMN IF NOT EXISTS family_history jsonb,
  ADD COLUMN IF NOT EXISTS past_surgeries jsonb,
  ADD COLUMN IF NOT EXISTS past_hospitalizations jsonb,
  ADD COLUMN IF NOT EXISTS vaccinations jsonb,
  ADD COLUMN IF NOT EXISTS womens_health jsonb;

-- ─── Patient attachments (labs, imaging, scans, certificates) ──
CREATE TABLE IF NOT EXISTS patient_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id uuid REFERENCES doctors(id) ON DELETE SET NULL,
  secretary_id uuid REFERENCES secretaries(id) ON DELETE SET NULL,
  category varchar(30) NOT NULL DEFAULT 'autre',
  title varchar(200) NOT NULL,
  description text,
  file_url text NOT NULL,
  file_key text NOT NULL,
  filename varchar(255) NOT NULL,
  mime_type varchar(120) NOT NULL,
  size_bytes integer NOT NULL,
  issued_at date,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS patient_attachments_patient_idx
  ON patient_attachments(patient_id, uploaded_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS patient_attachments_category_idx
  ON patient_attachments(category);

-- ─── Timeline events (free-form log entries beyond what can be derived) ──
-- Used for: manual notes, communication logs, milestones.
-- Auto-derived events (appointments, consultation notes, uploads) are NOT
-- stored here; they are aggregated at read time from their source tables.
CREATE TABLE IF NOT EXISTS patient_timeline_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id uuid REFERENCES doctors(id) ON DELETE SET NULL,
  secretary_id uuid REFERENCES secretaries(id) ON DELETE SET NULL,
  kind varchar(40) NOT NULL,
  title varchar(200) NOT NULL,
  body text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS patient_timeline_events_patient_idx
  ON patient_timeline_events(patient_id, occurred_at DESC);
