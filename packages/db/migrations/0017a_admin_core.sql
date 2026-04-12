-- ── Admin users (RBAC) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS "admin_users" (
  "id"            uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "email"         varchar(255) NOT NULL,
  "password_hash" text NOT NULL,
  "name"          varchar(255) NOT NULL,
  "role"          varchar(30) NOT NULL,
  "is_active"     boolean NOT NULL DEFAULT true,
  "last_login_at" timestamp with time zone,
  "totp_secret"   text,
  "created_at"    timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"    timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "admin_users_email_idx" ON "admin_users" ("email");
CREATE INDEX IF NOT EXISTS "admin_users_role_idx" ON "admin_users" ("role");

-- ── Admin audit log (append-only) ─────────────────────────
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

CREATE INDEX IF NOT EXISTS "admin_audit_actor_idx" ON "admin_audit_logs" ("actor_id");
CREATE INDEX IF NOT EXISTS "admin_audit_resource_idx" ON "admin_audit_logs" ("resource_type", "resource_id");
CREATE INDEX IF NOT EXISTS "admin_audit_action_idx" ON "admin_audit_logs" ("action");
CREATE INDEX IF NOT EXISTS "admin_audit_created_idx" ON "admin_audit_logs" ("created_at" DESC);
