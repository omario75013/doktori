-- 0036: Doctor-patient secure messaging
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  status varchar(20) NOT NULL DEFAULT 'active',
  last_notification_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(doctor_id, patient_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_type varchar(10) NOT NULL,
  sender_id uuid NOT NULL,
  content text NOT NULL,
  file_url text,
  file_name varchar(255),
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS messages_conversation_idx ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS messages_unread_idx ON messages(conversation_id) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS conversations_doctor_idx ON conversations(doctor_id);
CREATE INDEX IF NOT EXISTS conversations_patient_idx ON conversations(patient_id);
