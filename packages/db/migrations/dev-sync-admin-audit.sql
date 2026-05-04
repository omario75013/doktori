-- dev-only sync: create admin_audit_logs if missing (idempotent)
-- Required for admin template tests (D5 fix: admin_audit_logs was absent on dev DB).
-- This table is already on prod via 0017a_admin_core.sql.

CREATE TABLE IF NOT EXISTS "admin_audit_logs" (
  "id"            uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "actor_id"      uuid,
  "actor_email"   varchar(255) NOT NULL,
  "action"        varchar(80) NOT NULL,
  "resource_type" varchar(40) NOT NULL,
  "resource_id"   varchar(64),
  "before"        jsonb,
  "after"         jsonb,
  "reason"        text,
  "ip"            varchar(50),
  "user_agent"    text,
  "created_at"    timestamp with time zone NOT NULL DEFAULT now()
);

DO $$ BEGIN
  ALTER TABLE "admin_audit_logs"
  ADD CONSTRAINT "admin_audit_logs_actor_id_admin_users_id_fk"
  FOREIGN KEY ("actor_id") REFERENCES "admin_users"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "admin_audit_actor_idx"    ON "admin_audit_logs" ("actor_id");
CREATE INDEX IF NOT EXISTS "admin_audit_resource_idx" ON "admin_audit_logs" ("resource_type", "resource_id");
CREATE INDEX IF NOT EXISTS "admin_audit_action_idx"   ON "admin_audit_logs" ("action");
CREATE INDEX IF NOT EXISTS "admin_audit_created_idx"  ON "admin_audit_logs" ("created_at" DESC);

-- Insert the test admin user for CI/test environments.
-- Uses a fixed UUID so tests that mock requireAdmin with this ID can insert FK-valid audit rows.
INSERT INTO admin_users (id, email, password_hash, name, role, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'admin@doktori.test',
  '$2b$10$placeholder_not_for_login',
  'Test Admin',
  'super_admin',
  true
)
ON CONFLICT (id) DO NOTHING;
