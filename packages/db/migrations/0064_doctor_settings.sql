-- ───────────────────────────────────────────────────────────────────────────
-- Phase B: Doctor settings (notifications, 2FA, backup codes, cancel alerts)
-- ───────────────────────────────────────────────────────────────────────────

-- 2FA for doctors — mirrors admin_users.totp_secret pattern
ALTER TABLE doctors
  ADD COLUMN IF NOT EXISTS totp_secret text,
  ADD COLUMN IF NOT EXISTS totp_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS totp_enrolled_at timestamptz;

-- Notification preferences (one row per doctor; created on first save)
CREATE TABLE IF NOT EXISTS doctor_notification_prefs (
  doctor_id uuid PRIMARY KEY REFERENCES doctors(id) ON DELETE CASCADE,
  email_new_booking boolean NOT NULL DEFAULT true,
  email_cancellation boolean NOT NULL DEFAULT true,
  email_daily_digest boolean NOT NULL DEFAULT false,
  push_new_booking boolean NOT NULL DEFAULT true,
  push_cancellation boolean NOT NULL DEFAULT true,
  push_reminders_enabled boolean NOT NULL DEFAULT true,
  sms_enabled boolean NOT NULL DEFAULT false,
  cancel_alert_channels jsonb NOT NULL DEFAULT '["email","sms"]'::jsonb,
  cancel_alert_template text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 10 hashed backup codes for 2FA recovery
CREATE TABLE IF NOT EXISTS doctor_backup_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  code_hash text NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS doctor_backup_codes_doctor_idx
  ON doctor_backup_codes(doctor_id)
  WHERE used_at IS NULL;
