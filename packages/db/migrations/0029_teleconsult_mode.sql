-- Doctor consultation mode
ALTER TABLE doctors ADD COLUMN consultation_mode varchar(20) NOT NULL DEFAULT 'cabinet';
-- Values: 'cabinet' (in-person only), 'teleconsult' (video only), 'both'

ALTER TABLE doctors ADD COLUMN teleconsult_fee integer;
-- Separate pricing for teleconsult (millimes), null = same as consultationFee

-- Appointment type mode
ALTER TABLE appointment_types ADD COLUMN mode varchar(20) NOT NULL DEFAULT 'cabinet';
-- Values: 'cabinet', 'teleconsult', 'both'

-- Doctor wallet
CREATE TABLE doctor_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL REFERENCES doctors(id) ON DELETE CASCADE UNIQUE,
  balance integer NOT NULL DEFAULT 0,
  total_earned integer NOT NULL DEFAULT 0,
  total_commission integer NOT NULL DEFAULT 0,
  total_withdrawn integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX doctor_wallets_doctor_idx ON doctor_wallets(doctor_id);

-- Wallet transactions
CREATE TABLE wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  type varchar(20) NOT NULL,
  amount integer NOT NULL,
  appointment_id uuid REFERENCES appointments(id) ON DELETE SET NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX wallet_tx_doctor_idx ON wallet_transactions(doctor_id, created_at DESC);

-- Initialize wallets for existing doctors
INSERT INTO doctor_wallets (doctor_id) SELECT id FROM doctors ON CONFLICT DO NOTHING;
