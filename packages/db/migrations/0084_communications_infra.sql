-- 0084_communications_infra.sql — Wave 8 Comms (Gap 3a)
-- Idempotent.

CREATE TABLE IF NOT EXISTS whatsapp_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_phone VARCHAR(30) NOT NULL,
  recipient_type VARCHAR(20),
  recipient_id UUID,
  body TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'queued',
  provider_message_id VARCHAR(255),
  error TEXT,
  triggered_by_admin_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS whatsapp_logs_recipient_idx ON whatsapp_logs (recipient_id);
CREATE INDEX IF NOT EXISTS whatsapp_logs_status_idx ON whatsapp_logs (status);
CREATE INDEX IF NOT EXISTS whatsapp_logs_created_idx ON whatsapp_logs (created_at);

CREATE TABLE IF NOT EXISTS push_notifications_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_type VARCHAR(20) NOT NULL,
  recipient_id UUID NOT NULL,
  device_token TEXT,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  data JSONB,
  status VARCHAR(20) NOT NULL DEFAULT 'queued',
  error TEXT,
  triggered_by_admin_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS push_notifications_log_recipient_idx ON push_notifications_log (recipient_type, recipient_id);
CREATE INDEX IF NOT EXISTS push_notifications_log_status_idx ON push_notifications_log (status);
CREATE INDEX IF NOT EXISTS push_notifications_log_created_idx ON push_notifications_log (created_at);

CREATE TABLE IF NOT EXISTS message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  channel VARCHAR(20) NOT NULL,
  subject VARCHAR(255),
  body TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb,
  language VARCHAR(5) NOT NULL DEFAULT 'fr',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by_admin_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS message_templates_channel_idx ON message_templates (channel);
CREATE INDEX IF NOT EXISTS message_templates_active_idx ON message_templates (is_active);
