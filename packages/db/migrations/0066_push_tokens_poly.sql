-- ───────────────────────────────────────────────────────────────────────────
-- Make push_tokens poly-tenant (patient + doctor + secretary).
-- ───────────────────────────────────────────────────────────────────────────
-- Existing rows are all patients (table was patient-only). Columns added:
--   actor_type varchar(10): 'patient' | 'doctor' | 'secretary'
--   actor_id   uuid        : points to the appropriate entity table
--
-- Legacy patient_id is kept for backward compatibility during the migration
-- window — it gets populated from actor_id when actor_type='patient'. Drop
-- once all code paths stop referencing it.

ALTER TABLE push_tokens
  ADD COLUMN IF NOT EXISTS actor_type varchar(10) NOT NULL DEFAULT 'patient',
  ADD COLUMN IF NOT EXISTS actor_id uuid;

-- Backfill actor_id from patient_id for existing rows
UPDATE push_tokens
  SET actor_id = patient_id
  WHERE actor_id IS NULL AND patient_id IS NOT NULL;

-- Relax patient_id FK: make it nullable so non-patient tokens can be inserted
-- without a bogus patient_id. We keep the FK for now (will drop in a later
-- migration once actor_id is fully adopted).
ALTER TABLE push_tokens
  ALTER COLUMN patient_id DROP NOT NULL;

ALTER TABLE push_tokens
  ALTER COLUMN actor_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS push_tokens_actor_idx
  ON push_tokens(actor_type, actor_id)
  WHERE is_active = true;
