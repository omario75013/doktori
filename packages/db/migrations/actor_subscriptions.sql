-- Polymorphic subscriptions: a single row per (actor_type, actor_id) records
-- which plan an admin assigned to a doctor / clinic / lab. The legacy
-- `subscriptions` table (doctor-only) still drives the gate code paths today
-- and is kept untouched; new admin assignments mirror to it for doctors.

CREATE TABLE IF NOT EXISTS actor_subscriptions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_type      varchar(20) NOT NULL,  -- 'doctor' | 'clinic' | 'lab'
  actor_id        uuid NOT NULL,
  plan_code       varchar(20) NOT NULL REFERENCES subscription_plans(code),
  status          varchar(20) NOT NULL DEFAULT 'active', -- active | canceled | expired
  current_period_start timestamptz NOT NULL DEFAULT now(),
  current_period_end   timestamptz,
  assigned_by_admin_id uuid,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT actor_subscriptions_unique UNIQUE (actor_type, actor_id)
);

CREATE INDEX IF NOT EXISTS actor_subscriptions_actor_idx
  ON actor_subscriptions (actor_type, actor_id);
CREATE INDEX IF NOT EXISTS actor_subscriptions_plan_idx
  ON actor_subscriptions (plan_code);
