-- Migration 0074 — password_reset_tokens
-- Secure token-based password reset for patient accounts.

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  token_hash    varchar(128) PRIMARY KEY,
  patient_id    uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  expires_at    timestamptz NOT NULL,
  used_at       timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS password_reset_tokens_patient_idx
  ON password_reset_tokens(patient_id);
