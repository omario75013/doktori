-- Migration: lab_schedule
-- Idempotent: safe to run multiple times.
CREATE TABLE IF NOT EXISTS lab_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_id uuid NOT NULL REFERENCES labs(id) ON DELETE CASCADE,
  day_of_week smallint NOT NULL,
  opens_at time,
  closes_at time,
  is_closed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lab_id, day_of_week)
);

CREATE TABLE IF NOT EXISTS lab_closed_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_id uuid NOT NULL REFERENCES labs(id) ON DELETE CASCADE,
  date date NOT NULL,
  reason varchar(200),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lab_closed_days_lab_date_idx ON lab_closed_days(lab_id, date);
