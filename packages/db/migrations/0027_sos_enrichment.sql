-- Session lifecycle columns
ALTER TABLE sos_sessions ADD COLUMN cancelled_at timestamptz;
ALTER TABLE sos_sessions ADD COLUMN cancel_reason text;
ALTER TABLE sos_sessions ADD COLUMN cancelled_by varchar(10);
ALTER TABLE sos_sessions ADD COLUMN distance_m integer;
ALTER TABLE sos_sessions ADD COLUMN admin_notes text;
ALTER TABLE sos_sessions ADD COLUMN resolution varchar(20);

CREATE INDEX IF NOT EXISTS sos_sessions_doctor_idx ON sos_sessions(doctor_id);

-- Reviews: relax appointment_id NOT NULL so SOS reviews can insert
ALTER TABLE reviews ALTER COLUMN appointment_id DROP NOT NULL;
ALTER TABLE reviews ADD COLUMN sos_session_id uuid REFERENCES sos_sessions(id) ON DELETE SET NULL;
CREATE INDEX reviews_sos_session_idx ON reviews(sos_session_id) WHERE sos_session_id IS NOT NULL;

-- Prevent duplicate active requests per patient
CREATE UNIQUE INDEX sos_sessions_active_patient_uidx ON sos_sessions(patient_id) WHERE status IN ('pending', 'accepted');

-- Doctor availability time windows
ALTER TABLE doctors ADD COLUMN sos_available_from time;
ALTER TABLE doctors ADD COLUMN sos_available_to time;

-- SOS decline tracking
CREATE TABLE sos_declines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES sos_sessions(id) ON DELETE CASCADE,
  doctor_id uuid NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  reason varchar(30),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX sos_declines_unique_idx ON sos_declines(session_id, doctor_id);
CREATE INDEX sos_declines_session_idx ON sos_declines(session_id);

-- Backfill resolution for existing sessions
UPDATE sos_sessions SET resolution = status WHERE status IN ('completed', 'expired');
