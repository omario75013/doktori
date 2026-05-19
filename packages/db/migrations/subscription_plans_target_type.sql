-- Plans can now target doctors, clinics, labs, or all actor types.
-- Existing rows default to "doctor" (the original implicit target).

ALTER TABLE subscription_plans
  ADD COLUMN IF NOT EXISTS target_type varchar(20) NOT NULL DEFAULT 'doctor';

ALTER TABLE subscription_plans
  ADD COLUMN IF NOT EXISTS description text;

-- A plan may now also declare numeric module-rules beyond the 3 hard counters
-- (extra rules live in jsonb so admins can extend without migrations).
ALTER TABLE subscription_plans
  ADD COLUMN IF NOT EXISTS extra_rules jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS subscription_plans_target_type_idx
  ON subscription_plans (target_type);
