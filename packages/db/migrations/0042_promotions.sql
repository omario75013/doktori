-- Promo codes table
CREATE TABLE IF NOT EXISTS promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(30) NOT NULL UNIQUE,
  type varchar(20) NOT NULL, -- 'percentage' | 'fixed_amount' | 'free_months'
  value integer NOT NULL, -- percentage (0-100), amount in millimes, or months count
  target varchar(20) NOT NULL DEFAULT 'subscription', -- 'subscription' | 'teleconsult'
  max_uses integer, -- null = unlimited
  current_uses integer NOT NULL DEFAULT 0,
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_until timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES admin_users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS promo_codes_code_idx ON promo_codes(code);

-- Promo code usage tracking
CREATE TABLE IF NOT EXISTS promo_code_usages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id uuid NOT NULL REFERENCES promo_codes(id) ON DELETE CASCADE,
  doctor_id uuid NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  applied_to varchar(50), -- subscription_id or appointment_id
  discount_amount integer NOT NULL, -- actual discount in millimes
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS promo_usages_code_idx ON promo_code_usages(promo_code_id);
CREATE INDEX IF NOT EXISTS promo_usages_doctor_idx ON promo_code_usages(doctor_id);
CREATE UNIQUE INDEX IF NOT EXISTS promo_usages_unique_idx ON promo_code_usages(promo_code_id, doctor_id);

-- Referral reward settings
INSERT INTO platform_settings (key, value, category, label, description, type) VALUES
  ('referral.reward_type', 'free_months', 'referral', 'Type de récompense parrainage', 'Récompense offerte au parrain', 'select'),
  ('referral.reward_value', '1', 'referral', 'Valeur de la récompense', 'Nombre de mois ou montant en DT', 'number'),
  ('referral.referee_reward_type', 'free_months', 'referral', 'Récompense filleul', 'Récompense offerte au filleul', 'select'),
  ('referral.referee_reward_value', '1', 'referral', 'Valeur récompense filleul', 'Nombre de mois gratuits pour le filleul', 'number')
ON CONFLICT (key) DO NOTHING;
