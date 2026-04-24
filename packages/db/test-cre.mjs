import postgres from "postgres";
const sql = postgres("postgresql://doktori:doktori_dev_2026@localhost:5434/doktori");
try {
  await sql.unsafe(`CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  status varchar(20) NOT NULL DEFAULT 'active',
  last_notification_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(doctor_id, patient_id)
)`);
  console.log("created conversations");
  const r = await sql`SELECT to_regclass('conversations')`;
  console.log(r);
} catch (e) {
  console.error("err code:", e.code, "msg:", e.message);
}
await sql.end();
