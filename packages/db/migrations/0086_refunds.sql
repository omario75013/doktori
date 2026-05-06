-- 0086_refunds.sql — Wave 6 (Gap 4) — centralized refund tracking.
-- Replaces appointments.payment_status='refund_pending' as the authoritative log.
-- The flag stays for backward-compatibility, but the row in `refunds` is the source of truth.
-- Idempotent: safe to re-apply.

CREATE TABLE IF NOT EXISTS refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type VARCHAR(20) NOT NULL,
  source_id UUID NOT NULL,
  original_payment_ref VARCHAR(255),
  provider VARCHAR(30) NOT NULL,
  amount INTEGER NOT NULL,
  currency VARCHAR(5) NOT NULL DEFAULT 'TND',
  provider_refund_id VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  reason TEXT,
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
  initiated_by_admin_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  failure_reason TEXT,
  succeeded_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS refunds_source_idx ON refunds (source_type, source_id);
CREATE INDEX IF NOT EXISTS refunds_status_idx ON refunds (status);
CREATE INDEX IF NOT EXISTS refunds_provider_idx ON refunds (provider);
CREATE INDEX IF NOT EXISTS refunds_created_idx ON refunds (created_at);
