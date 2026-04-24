-- 0061_calls — voice call sessions + WebRTC signaling
-- caller / callee are (type, id) tuples covering doctor, secretary, patient.

CREATE TABLE IF NOT EXISTS call_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_type varchar(10) NOT NULL,    -- 'doctor' | 'secretary' | 'patient'
  caller_id uuid NOT NULL,
  callee_type varchar(10) NOT NULL,
  callee_id uuid NOT NULL,
  /** ringing | active | ended | missed | declined */
  status varchar(12) NOT NULL DEFAULT 'ringing',
  created_at timestamp DEFAULT now(),
  answered_at timestamp,
  ended_at timestamp
);
CREATE INDEX IF NOT EXISTS call_sessions_callee_ring_idx
  ON call_sessions(callee_type, callee_id, created_at) WHERE status = 'ringing';
CREATE INDEX IF NOT EXISTS call_sessions_caller_idx
  ON call_sessions(caller_type, caller_id, created_at DESC);

CREATE TABLE IF NOT EXISTS call_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES call_sessions(id) ON DELETE CASCADE,
  sender_type varchar(10) NOT NULL,
  sender_id uuid NOT NULL,
  /** offer | answer | ice */
  kind varchar(10) NOT NULL,
  payload jsonb NOT NULL,
  consumed_at timestamp,
  created_at timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS call_signals_session_idx
  ON call_signals(session_id, created_at) WHERE consumed_at IS NULL;
