-- Migration 0067: Doctor days-off, status/away message, plan limits, plan usage

-- 1. Doctor status / away message fields
ALTER TABLE doctors
  ADD COLUMN IF NOT EXISTS status_message text,
  ADD COLUMN IF NOT EXISTS away_message text,
  ADD COLUMN IF NOT EXISTS status_active_until timestamp with time zone;

-- 2. Messages: type + auto-reply flag
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS type varchar(20) NOT NULL DEFAULT 'message',
  ADD COLUMN IF NOT EXISTS is_auto_reply boolean NOT NULL DEFAULT false;

-- 3. Subscription plans: limit columns
ALTER TABLE subscription_plans
  ADD COLUMN IF NOT EXISTS max_appointments_per_month integer,
  ADD COLUMN IF NOT EXISTS max_sms_per_month integer,
  ADD COLUMN IF NOT EXISTS max_patients_total integer,
  ADD COLUMN IF NOT EXISTS enabled_features jsonb NOT NULL DEFAULT '[]';

-- 4. Doctor days-off table
CREATE TABLE IF NOT EXISTS doctor_days_off (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  practice_id uuid REFERENCES doctor_practices(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS doctor_days_off_doctor_idx ON doctor_days_off (doctor_id, start_date);

-- 5. Plan usage table (monthly counters)
CREATE TABLE IF NOT EXISTS plan_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  month varchar(7) NOT NULL,
  appointments_count integer NOT NULL DEFAULT 0,
  sms_count integer NOT NULL DEFAULT 0,
  patients_count integer NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX IF NOT EXISTS plan_usage_doctor_month_idx ON plan_usage (doctor_id, month);
