-- Migration 0039: Patient email accounts
-- Adds optional password-based auth alongside existing OTP flow

ALTER TABLE patients ADD COLUMN IF NOT EXISTS password_hash text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT false;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS auth_method varchar(10) NOT NULL DEFAULT 'otp';
-- auth_method: 'otp' | 'email' | 'both'
