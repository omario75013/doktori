-- ── Admin Notifications ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS admin_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type varchar(30) NOT NULL, -- 'new_doctor', 'new_patient', 'sos_alert', 'payment_failed', 'trial_expiring', 'review_pending', 'system'
  title varchar(255) NOT NULL,
  message text,
  link varchar(500),
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX admin_notifications_read_idx ON admin_notifications(is_read, created_at DESC);

-- ── Webhooks ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url varchar(500) NOT NULL,
  events jsonb NOT NULL DEFAULT '[]', -- ['booking.created', 'booking.cancelled', 'doctor.registered']
  secret varchar(64) NOT NULL, -- for HMAC signature
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES admin_users(id),
  last_triggered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
