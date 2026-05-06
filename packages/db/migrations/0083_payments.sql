-- 0083_payments.sql — Phase 2 #2 payments backbone
-- Idempotent: safe to re-apply.

-- Doctor payment methods configuration
CREATE TABLE IF NOT EXISTS doctor_payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  method VARCHAR(30) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS doctor_payment_methods_doctor_method_uidx
  ON doctor_payment_methods (doctor_id, method);

-- Bank transfer intents
CREATE TABLE IF NOT EXISTS bank_transfer_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
  amount INTEGER NOT NULL,
  reference VARCHAR(40) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  proof_file_url TEXT,
  confirmed_by_admin_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  confirmed_at TIMESTAMPTZ,
  rejected_reason TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS bank_transfer_intents_status_idx ON bank_transfer_intents (status);
CREATE INDEX IF NOT EXISTS bank_transfer_intents_appointment_idx ON bank_transfer_intents (appointment_id);

-- Stripe events log
CREATE TABLE IF NOT EXISTS stripe_events_log (
  event_id VARCHAR(100) PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL,
  payload JSONB NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add payment_method column to appointments (idempotent ALTER)
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS payment_method VARCHAR(30);
