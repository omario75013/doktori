CREATE TABLE IF NOT EXISTS feature_flags (
  key varchar(100) PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT false,
  description text,
  rules jsonb DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO feature_flags (key, enabled, description) VALUES
  ('teleconsultation', true, 'Enable teleconsultation booking and video rooms'),
  ('sos_docteur', true, 'Enable SOS emergency doctor feature'),
  ('home_visit', true, 'Enable home visit booking'),
  ('whatsapp_reminders', false, 'Send appointment reminders via WhatsApp'),
  ('phone_masking', false, 'Enable Twilio phone masking for appointments'),
  ('chatbot_booking', true, 'Allow the Dokti chatbot to book appointments')
ON CONFLICT (key) DO NOTHING;
