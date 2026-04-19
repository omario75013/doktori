-- SMS Usage Quota Tracking
CREATE TABLE IF NOT EXISTS sms_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  month varchar(7) NOT NULL, -- '2026-04'
  count integer NOT NULL DEFAULT 0,
  UNIQUE(doctor_id, month)
);
CREATE INDEX IF NOT EXISTS sms_usage_doctor_month_idx ON sms_usage(doctor_id, month);
