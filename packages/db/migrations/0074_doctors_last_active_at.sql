-- 0074_doctors_last_active_at — D30 doctor presence indicator
-- Idempotent. ADD-ONLY.

ALTER TABLE doctors ADD COLUMN IF NOT EXISTS last_active_at timestamptz;
