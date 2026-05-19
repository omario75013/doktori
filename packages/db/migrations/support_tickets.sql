-- Support tickets opened by any actor (patient / doctor / clinic / lab /
-- secretary). Each ticket has a thread of messages alternating between the
-- requester and the admin team.

CREATE TABLE IF NOT EXISTS support_tickets (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_type  varchar(20) NOT NULL,
  requester_id    uuid NOT NULL,
  requester_email varchar(255),
  requester_name  varchar(255),
  subject         varchar(255) NOT NULL,
  category        varchar(40) NOT NULL DEFAULT 'general',
  priority        varchar(20) NOT NULL DEFAULT 'normal',  -- low | normal | high | urgent
  status          varchar(20) NOT NULL DEFAULT 'open',    -- open | in_progress | waiting_user | resolved | closed
  assigned_admin_id uuid,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS support_tickets_status_idx ON support_tickets (status);
CREATE INDEX IF NOT EXISTS support_tickets_requester_idx ON support_tickets (requester_type, requester_id);
CREATE INDEX IF NOT EXISTS support_tickets_last_msg_idx ON support_tickets (last_message_at DESC);

CREATE TABLE IF NOT EXISTS support_ticket_messages (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id    uuid NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  author_type  varchar(20) NOT NULL,  -- requester actor type or 'admin'
  author_id    uuid,                  -- nullable for system messages
  body         text NOT NULL,
  is_internal  boolean NOT NULL DEFAULT false,  -- internal admin-only note
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS support_ticket_messages_ticket_idx ON support_ticket_messages (ticket_id, created_at);
