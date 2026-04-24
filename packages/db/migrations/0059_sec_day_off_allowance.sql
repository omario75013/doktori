-- 0059 — doctor-configurable monthly day-off allowance per secretary
ALTER TABLE secretaries
  ADD COLUMN IF NOT EXISTS monthly_day_off_allowance numeric(4,1) DEFAULT 2.0;
