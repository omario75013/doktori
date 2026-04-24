-- 0057_secretary_extras — secretary profile + schedule + time-off
-- Idempotent.

ALTER TABLE secretaries
  ADD COLUMN IF NOT EXISTS phone varchar(30),
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS years_of_experience integer,
  -- Monthly salary in millimes (DT × 1000)
  ADD COLUMN IF NOT EXISTS monthly_salary integer,
  ADD COLUMN IF NOT EXISTS hire_date date,
  ADD COLUMN IF NOT EXISTS last_active_at timestamp;

CREATE TABLE IF NOT EXISTS secretary_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  secretary_id uuid NOT NULL REFERENCES secretaries(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp DEFAULT now(),
  CONSTRAINT secretary_schedules_hours CHECK (start_time < end_time)
);
CREATE INDEX IF NOT EXISTS secretary_schedules_sec_day_idx
  ON secretary_schedules(secretary_id, day_of_week);

CREATE TABLE IF NOT EXISTS secretary_time_off (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  secretary_id uuid NOT NULL REFERENCES secretaries(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason text,
  status varchar(10) NOT NULL DEFAULT 'pending',
  created_at timestamp DEFAULT now(),
  decided_at timestamp,
  CONSTRAINT secretary_time_off_range CHECK (end_date >= start_date)
);
CREATE INDEX IF NOT EXISTS secretary_time_off_sec_idx
  ON secretary_time_off(secretary_id, status);
