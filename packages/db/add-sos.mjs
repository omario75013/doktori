import postgres from "postgres";
const sql = postgres("postgresql://doktori:doktori_dev_2026@localhost:5434/doktori");
await sql.unsafe(`CREATE TABLE IF NOT EXISTS sos_declines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES sos_sessions(id) ON DELETE CASCADE,
  doctor_id uuid NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  reason varchar(30),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, doctor_id)
)`);
await sql.unsafe(`CREATE INDEX IF NOT EXISTS sos_declines_session_idx ON sos_declines(session_id)`);
console.log("sos_declines OK");
await sql.end();
