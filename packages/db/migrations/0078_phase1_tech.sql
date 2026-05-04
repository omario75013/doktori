-- 0078_phase1_tech — Stream C: API keys + CNAM nomenclature
-- Idempotent ADD-ONLY.

-- API keys for public read-only API
CREATE TABLE IF NOT EXISTS api_keys (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key_hash        varchar(128) NOT NULL UNIQUE,  -- sha256 of the key
  prefix          varchar(20) NOT NULL,  -- first 8 chars visible for identification (dok_xxxxxx)
  name            varchar(120) NOT NULL,  -- human-readable
  owner_email     varchar(255),
  scopes          jsonb NOT NULL DEFAULT '["read:doctors","read:specialties","read:cities"]'::jsonb,
  rate_limit_per_minute integer NOT NULL DEFAULT 60,
  active          boolean NOT NULL DEFAULT true,
  last_used_at    timestamptz,
  expires_at      timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  created_by_admin uuid,
  revoked_at      timestamptz
);
CREATE INDEX IF NOT EXISTS api_keys_hash_idx ON api_keys(key_hash) WHERE active = true AND revoked_at IS NULL;

-- API request logs (for analytics + rate limiting)
CREATE TABLE IF NOT EXISTS api_request_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id      uuid REFERENCES api_keys(id) ON DELETE SET NULL,
  method          varchar(10) NOT NULL,
  path            varchar(255) NOT NULL,
  status_code     integer,
  duration_ms     integer,
  ip              varchar(50),
  user_agent      text,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS api_request_logs_key_time_idx
  ON api_request_logs(api_key_id, created_at DESC);

-- CNAM Tunisia nomenclature (top 30 acts with reimbursement %)
CREATE TABLE IF NOT EXISTS cnam_acts (
  code            varchar(20) PRIMARY KEY,  -- e.g. 'CONS_GEN', 'CONS_SPE', 'ECG'
  name_fr         varchar(200) NOT NULL,
  name_ar         varchar(200),
  base_fee_tnd    numeric(8,2) NOT NULL,  -- official fee
  reimbursement_pct numeric(5,2) NOT NULL DEFAULT 70.00,  -- CNAM rate
  category        varchar(40),  -- 'consultation' | 'imaging' | 'lab' | 'procedure' | 'specialist'
  notes_fr        text,
  notes_ar        text,
  display_order   integer NOT NULL DEFAULT 0
);
