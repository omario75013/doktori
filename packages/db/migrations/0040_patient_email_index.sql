-- Add a unique partial index on patients.email to enforce email uniqueness
-- for rows where email IS NOT NULL (OTP-only accounts have NULL email).
CREATE UNIQUE INDEX IF NOT EXISTS patients_email_unique_idx ON patients(email) WHERE email IS NOT NULL;
