-- Polymorphic password reset tokens for staff actors:
-- actor_type ∈ ('doctor','clinic','lab','lab_user','secretary')
-- No FK on actor_id (polymorphic). Cleanup is done by expiry / single-use.
CREATE TABLE IF NOT EXISTS staff_password_reset_tokens (
  token_hash      varchar(128) PRIMARY KEY,
  actor_type      varchar(20) NOT NULL,
  actor_id        uuid        NOT NULL,
  expires_at      timestamptz NOT NULL,
  used_at         timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT staff_password_reset_tokens_actor_type_check
    CHECK (actor_type IN ('doctor','clinic','lab','lab_user','secretary'))
);

CREATE INDEX IF NOT EXISTS staff_password_reset_tokens_actor_idx
  ON staff_password_reset_tokens (actor_type, actor_id);

CREATE INDEX IF NOT EXISTS staff_password_reset_tokens_expires_idx
  ON staff_password_reset_tokens (expires_at);
