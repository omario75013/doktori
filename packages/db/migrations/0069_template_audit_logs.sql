-- 0069 — Bilateral audit (doctor + admin) for template mutations
CREATE TABLE IF NOT EXISTS template_audit_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_type  varchar(10) NOT NULL CHECK (actor_type IN ('doctor', 'admin')),
  actor_id    uuid NOT NULL,
  template_id uuid NOT NULL,
  action      varchar(20) NOT NULL CHECK (action IN ('created', 'edited', 'cloned', 'deleted', 'applied')),
  before      jsonb,
  after       jsonb,
  context     jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS template_audit_actor_idx
  ON template_audit_logs(actor_type, actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS template_audit_template_idx
  ON template_audit_logs(template_id, created_at DESC);
CREATE INDEX IF NOT EXISTS template_audit_action_idx
  ON template_audit_logs(action);
