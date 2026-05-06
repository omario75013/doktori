-- 0082_coach_ia_usage — Phase 2 #9 Coach IA conversational health assistant
-- Tracks usage events (message sent, disclaimer accepted) for cost/abuse monitoring.
-- Privacy-by-design: NEVER logs message content or model responses. Metadata only.
-- Idempotent ADD-ONLY.

CREATE TABLE IF NOT EXISTS coach_ia_usage (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id  uuid REFERENCES patients(id) ON DELETE SET NULL,
  event_type  varchar(40) NOT NULL,              -- 'message' | 'disclaimer_accepted'
  tokens_in   integer DEFAULT 0,
  tokens_out  integer DEFAULT 0,
  cost_usd    numeric(10, 6) DEFAULT 0,
  latency_ms  integer DEFAULT 0,
  error       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS coach_ia_usage_patient_idx ON coach_ia_usage(patient_id);
CREATE INDEX IF NOT EXISTS coach_ia_usage_created_idx ON coach_ia_usage(created_at);
