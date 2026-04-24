-- 0058_staff_collab — Secretary profile + staff messaging + bells + doctor-only notes
-- Idempotent.

-- Secretary profile extras
ALTER TABLE secretaries
  ADD COLUMN IF NOT EXISTS photo_url text,
  ADD COLUMN IF NOT EXISTS bio text;

-- Doctor-only (private) notes on patient medical profile (hidden to secretary)
ALTER TABLE patient_medical_profile
  ADD COLUMN IF NOT EXISTS private_doctor_notes text;

-- ─── Staff conversations (any 2 members of the same "cabinet": doctor + secretaries) ──
-- A cabinet = a doctor and their secretaries. We store each participant as
-- (staffType, staffId) tuple.
CREATE TABLE IF NOT EXISTS staff_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  member_a_type varchar(10) NOT NULL,   -- 'doctor' | 'secretary'
  member_a_id uuid NOT NULL,
  member_b_type varchar(10) NOT NULL,
  member_b_id uuid NOT NULL,
  last_message_at timestamp,
  created_at timestamp DEFAULT now(),
  CONSTRAINT staff_conv_members_distinct CHECK (
    member_a_type <> member_b_type OR member_a_id <> member_b_id
  )
);
CREATE INDEX IF NOT EXISTS staff_conv_doctor_idx ON staff_conversations(doctor_id);
CREATE INDEX IF NOT EXISTS staff_conv_member_a_idx ON staff_conversations(member_a_type, member_a_id);
CREATE INDEX IF NOT EXISTS staff_conv_member_b_idx ON staff_conversations(member_b_type, member_b_id);

CREATE TABLE IF NOT EXISTS staff_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES staff_conversations(id) ON DELETE CASCADE,
  sender_type varchar(10) NOT NULL,   -- 'doctor' | 'secretary'
  sender_id uuid NOT NULL,
  body text NOT NULL,
  read_at timestamp,
  created_at timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS staff_messages_conv_idx ON staff_messages(conversation_id, created_at);

-- Secretary-side notifications feed
CREATE TABLE IF NOT EXISTS secretary_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  secretary_id uuid NOT NULL REFERENCES secretaries(id) ON DELETE CASCADE,
  type varchar(30) NOT NULL,          -- 'bell' | 'message' | 'rdv_soon' | 'timeoff_decided' ...
  title varchar(255) NOT NULL,
  body text,
  payload jsonb NOT NULL DEFAULT '{}',
  read_at timestamp,
  seen_at timestamp,
  created_at timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sec_notif_sec_idx ON secretary_notifications(secretary_id, created_at DESC);
CREATE INDEX IF NOT EXISTS sec_notif_unread_idx
  ON secretary_notifications(secretary_id) WHERE read_at IS NULL;

-- Doctor-defined custom "bell" actions (templates: label + optional icon/sound)
CREATE TABLE IF NOT EXISTS doctor_quick_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  label varchar(100) NOT NULL,
  message text,
  icon varchar(30),      -- lucide icon name, e.g. 'bell' 'folder' 'coffee'
  sound varchar(20),     -- 'bell' | 'ping' | 'chime' (reserved for future variations)
  position integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS doctor_quick_actions_doctor_idx
  ON doctor_quick_actions(doctor_id, position) WHERE is_active = true;

-- Individual bell events (sent from doctor, consumed by secretary UI)
CREATE TABLE IF NOT EXISTS doctor_bells (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  -- If null, bell targets ALL active secretaries of the doctor
  secretary_id uuid REFERENCES secretaries(id) ON DELETE CASCADE,
  label varchar(100) NOT NULL,
  message text,
  icon varchar(30),
  sound varchar(20),
  acknowledged_at timestamp,
  acknowledged_by uuid REFERENCES secretaries(id) ON DELETE SET NULL,
  created_at timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS doctor_bells_doctor_idx ON doctor_bells(doctor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS doctor_bells_unack_idx
  ON doctor_bells(doctor_id, created_at) WHERE acknowledged_at IS NULL;
