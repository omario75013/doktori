-- 0090_appointment_bs_tracking.sql — V1 Bulletin de Soins (BS1) lifecycle.
-- Tracks the generated PDF + the manual workflow steps until CNAM SEED API is
-- available (planned 2027). Idempotent: safe to re-apply.

ALTER TABLE appointments ADD COLUMN IF NOT EXISTS bs_pdf_url TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS bs_status VARCHAR(30) NOT NULL DEFAULT 'not_generated';
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS bs_generated_at TIMESTAMPTZ;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS bs_sent_at TIMESTAMPTZ;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS bs_reimbursed_at TIMESTAMPTZ;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS bs_rejection_reason TEXT;

-- Helpful index for "show me all BS not yet sent" workflows.
CREATE INDEX IF NOT EXISTS appointments_bs_status_idx ON appointments (bs_status);
