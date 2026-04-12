CREATE TABLE IF NOT EXISTS subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(20) NOT NULL UNIQUE,
  label varchar(100) NOT NULL,
  price_millimes integer NOT NULL,
  billing_cycle varchar(20) NOT NULL DEFAULT 'monthly',
  features jsonb NOT NULL DEFAULT '[]',
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO subscription_plans (code, label, price_millimes, billing_cycle, features, display_order) VALUES
  ('free', 'Gratuit', 0, 'monthly', '["5 RDV/mois", "Profil basique"]', 0),
  ('essentiel', 'Essentiel', 49000, 'monthly', '["RDV illimités", "Rappels SMS", "Avis patients"]', 1),
  ('pro', 'Pro', 99000, 'monthly', '["Tout Essentiel", "Téléconsultation", "CNAM bordereau", "Secrétaires"]', 2),
  ('clinique', 'Clinique', 199000, 'monthly', '["Tout Pro", "Multi-médecins", "Dashboard clinique", "Support prioritaire"]', 3)
ON CONFLICT (code) DO NOTHING;
