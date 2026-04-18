-- 0045: Add email verification columns to doctors table
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT false;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS email_verification_token varchar(64);
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS email_verified_at timestamptz;

-- Backfill existing doctors as verified (they were already onboarded)
UPDATE doctors SET email_verified = true WHERE email_verified = false;

CREATE INDEX IF NOT EXISTS doctors_verification_token_idx ON doctors(email_verification_token) WHERE email_verification_token IS NOT NULL;
