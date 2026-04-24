-- 0056_doctor_network — Phase 5: doctor-to-doctor graph + referrals + peer messaging
-- Idempotent.

CREATE TABLE IF NOT EXISTS doctor_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  addressee_id uuid NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  status varchar(10) NOT NULL DEFAULT 'pending',
  created_at timestamp DEFAULT now(),
  accepted_at timestamp,
  CONSTRAINT doctor_connections_unique UNIQUE (requester_id, addressee_id),
  CONSTRAINT doctor_connections_self CHECK (requester_id <> addressee_id)
);
CREATE INDEX IF NOT EXISTS doctor_connections_requester_idx
  ON doctor_connections(requester_id, status);
CREATE INDEX IF NOT EXISTS doctor_connections_addressee_idx
  ON doctor_connections(addressee_id, status);

CREATE TABLE IF NOT EXISTS patient_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_doctor_id uuid NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  to_doctor_id uuid NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  reason text NOT NULL,
  share_medical_record boolean NOT NULL DEFAULT false,
  patient_consent_status varchar(10) NOT NULL DEFAULT 'pending',
  patient_consent_token varchar(64) UNIQUE,
  suggested_appointment_at timestamp,
  status varchar(15) NOT NULL DEFAULT 'pending',
  notes_for_receiving_doctor text,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS patient_referrals_to_doctor_idx
  ON patient_referrals(to_doctor_id, status);
CREATE INDEX IF NOT EXISTS patient_referrals_from_doctor_idx
  ON patient_referrals(from_doctor_id, status);
CREATE INDEX IF NOT EXISTS patient_referrals_consent_token_idx
  ON patient_referrals(patient_consent_token);

CREATE TABLE IF NOT EXISTS doctor_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_a_id uuid NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  doctor_b_id uuid NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  last_message_at timestamp,
  created_at timestamp DEFAULT now(),
  CONSTRAINT doctor_conversations_pair CHECK (doctor_a_id < doctor_b_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS doctor_conversations_pair_idx
  ON doctor_conversations(doctor_a_id, doctor_b_id);

CREATE TABLE IF NOT EXISTS doctor_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES doctor_conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  body text NOT NULL,
  read_at timestamp,
  created_at timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS doctor_messages_conv_idx
  ON doctor_messages(conversation_id, created_at);

CREATE TABLE IF NOT EXISTS doctor_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  type varchar(30) NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}',
  read_at timestamp,
  created_at timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS doctor_notifications_doctor_idx
  ON doctor_notifications(doctor_id, created_at DESC);
