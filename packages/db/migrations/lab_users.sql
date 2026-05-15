-- Migration: lab_users
-- Adds per-user accounts for in-house labs.
-- Idempotent: safe to run multiple times.

DO $$ BEGIN

  CREATE TABLE IF NOT EXISTS lab_users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lab_id uuid NOT NULL REFERENCES labs(id) ON DELETE CASCADE,
    email varchar(255) NOT NULL UNIQUE,
    password_hash text NOT NULL,
    first_name varchar(100) NOT NULL,
    last_name varchar(100) NOT NULL,
    role varchar(20) NOT NULL DEFAULT 'technician',
    is_active boolean NOT NULL DEFAULT true,
    last_login_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );

END $$;

CREATE INDEX IF NOT EXISTS lab_users_lab_idx ON lab_users(lab_id);
CREATE INDEX IF NOT EXISTS lab_users_email_idx ON lab_users(email);
