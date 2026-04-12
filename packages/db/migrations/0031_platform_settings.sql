CREATE TABLE IF NOT EXISTS platform_settings (
  key varchar(100) PRIMARY KEY,
  value text NOT NULL,
  category varchar(50) NOT NULL,
  label varchar(255) NOT NULL,
  description text,
  type varchar(20) NOT NULL DEFAULT 'text',
  options jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Seed default settings
INSERT INTO platform_settings (key, value, category, label, description, type, options) VALUES
  -- Payment (Flouci)
  ('payment.provider', 'flouci', 'payment', 'Fournisseur de paiement', 'Service de paiement en ligne', 'select', '["flouci", "stripe", "manual"]'),
  ('payment.flouci.app_token', '', 'payment', 'Flouci App Token', 'Token d''application Flouci', 'secret', NULL),
  ('payment.flouci.app_secret', '', 'payment', 'Flouci App Secret', 'Secret d''application Flouci', 'secret', NULL),
  ('payment.flouci.api_url', 'https://developers.flouci.com', 'payment', 'Flouci API URL', 'URL de l''API Flouci', 'text', NULL),
  ('payment.currency', 'TND', 'payment', 'Devise', 'Devise par défaut', 'select', '["TND", "EUR", "USD"]'),

  -- SMS
  ('sms.provider', 'twilio', 'sms', 'Fournisseur SMS', 'Service d''envoi de SMS', 'select', '["twilio", "vonage", "orange", "none"]'),
  ('sms.twilio.account_sid', '', 'sms', 'Twilio Account SID', NULL, 'secret', NULL),
  ('sms.twilio.auth_token', '', 'sms', 'Twilio Auth Token', NULL, 'secret', NULL),
  ('sms.twilio.phone_number', '', 'sms', 'Numéro Twilio', 'Numéro d''envoi SMS (+216...)', 'text', NULL),
  ('sms.enabled', 'true', 'sms', 'SMS activés', 'Activer/désactiver l''envoi de SMS', 'boolean', NULL),

  -- Email
  ('email.provider', 'resend', 'email', 'Fournisseur email', 'Service d''envoi d''emails', 'select', '["resend", "sendgrid", "smtp", "none"]'),
  ('email.resend.api_key', '', 'email', 'Resend API Key', NULL, 'secret', NULL),
  ('email.from', 'Doktori <noreply@doktori.tn>', 'email', 'Adresse d''expédition', 'Adresse email d''envoi', 'text', NULL),
  ('email.enabled', 'true', 'email', 'Emails activés', 'Activer/désactiver l''envoi d''emails', 'boolean', NULL),

  -- WhatsApp
  ('whatsapp.phone_id', '', 'whatsapp', 'Phone Number ID', 'ID du numéro WhatsApp Business', 'secret', NULL),
  ('whatsapp.access_token', '', 'whatsapp', 'Access Token', 'Token d''accès Meta', 'secret', NULL),
  ('whatsapp.enabled', 'false', 'whatsapp', 'WhatsApp activé', 'Activer les notifications WhatsApp', 'boolean', NULL),

  -- Teleconsult
  ('teleconsult.commission_rate', '0.15', 'teleconsult', 'Commission téléconsultation', 'Pourcentage prélevé par la plateforme (0.00 à 1.00)', 'number', NULL),
  ('teleconsult.jitsi_url', 'https://meet.jit.si', 'teleconsult', 'URL Jitsi', 'Serveur de vidéoconférence', 'text', NULL),
  ('teleconsult.noshow_delay_minutes', '15', 'teleconsult', 'Délai no-show (min)', 'Minutes après le début avant de déclarer un no-show médecin', 'number', NULL),
  ('teleconsult.auto_refund', 'true', 'teleconsult', 'Remboursement automatique', 'Rembourser automatiquement en cas de no-show', 'boolean', NULL),

  -- SOS
  ('sos.commission_rate', '0.10', 'sos', 'Commission SOS', 'Pourcentage sur les consultations SOS', 'number', NULL),
  ('sos.expiry_minutes', '30', 'sos', 'Expiration demande (min)', 'Durée de validité d''une demande SOS', 'number', NULL),
  ('sos.max_radius_km', '30', 'sos', 'Rayon max (km)', 'Rayon maximum de recherche de médecin', 'number', NULL),

  -- General
  ('general.platform_name', 'Doktori', 'general', 'Nom de la plateforme', NULL, 'text', NULL),
  ('general.support_email', 'support@doktori.tn', 'general', 'Email support', NULL, 'text', NULL),
  ('general.support_phone', '+216 71 000 000', 'general', 'Téléphone support', NULL, 'text', NULL),
  ('general.maintenance_mode', 'false', 'general', 'Mode maintenance', 'Mettre le site en maintenance', 'boolean', NULL),

  -- Branding
  ('branding.primary_color', '#0891B2', 'branding', 'Couleur principale', 'Couleur teal de la marque', 'text', NULL),
  ('branding.logo_url', '/logo.svg', 'branding', 'URL du logo', NULL, 'text', NULL),
  ('branding.favicon_url', '/favicon.ico', 'branding', 'URL du favicon', NULL, 'text', NULL)
ON CONFLICT (key) DO NOTHING;
