-- lab_messaging.sql
-- Idempotent: creates lab_conversations and lab_messages tables.

CREATE TABLE IF NOT EXISTS lab_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_id uuid NOT NULL REFERENCES labs(id) ON DELETE CASCADE,
  counterpart_lab_id uuid REFERENCES labs(id) ON DELETE CASCADE,
  counterpart_doctor_id uuid REFERENCES doctors(id) ON DELETE CASCADE,
  subject varchar(200),
  last_message_at timestamptz NOT NULL DEFAULT now(),
  last_message_preview text,
  unread_count_lab integer NOT NULL DEFAULT 0,
  unread_count_counterpart integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lab_conversations_lab_idx ON lab_conversations(lab_id);
CREATE INDEX IF NOT EXISTS lab_conversations_doc_idx ON lab_conversations(counterpart_doctor_id);
CREATE INDEX IF NOT EXISTS lab_conversations_lab_lab_idx ON lab_conversations(counterpart_lab_id);

CREATE TABLE IF NOT EXISTS lab_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES lab_conversations(id) ON DELETE CASCADE,
  sender_type varchar(15) NOT NULL,
  sender_id uuid NOT NULL,
  body text,
  attachment_url text,
  attachment_name varchar(255),
  attachment_mime varchar(100),
  attachment_size integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lab_messages_conv_idx ON lab_messages(conversation_id, created_at DESC);
