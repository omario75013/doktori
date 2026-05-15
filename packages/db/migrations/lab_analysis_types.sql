-- Migration: lab_analysis_types
-- Idempotent: safe to run multiple times.
CREATE TABLE IF NOT EXISTS lab_analysis_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_id uuid NOT NULL REFERENCES labs(id) ON DELETE CASCADE,
  code varchar(40) NOT NULL,
  name varchar(160) NOT NULL,
  category varchar(40),
  price_millimes integer,
  duration_hours integer,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lab_analysis_types_lab_idx ON lab_analysis_types(lab_id);
CREATE UNIQUE INDEX IF NOT EXISTS lab_analysis_types_lab_code_uniq ON lab_analysis_types(lab_id, code);
