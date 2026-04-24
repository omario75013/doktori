import postgres from "postgres";
const sql = postgres("postgresql://doktori:doktori_dev_2026@localhost:5434/doktori");
const cmds = [
  `ALTER TABLE doctor_schedules ADD COLUMN IF NOT EXISTS practice_id uuid REFERENCES doctor_practices(id) ON DELETE SET NULL`,
];
for (const c of cmds) {
  try { await sql.unsafe(c); console.log("OK:", c.slice(0, 70)); }
  catch (e) { console.log("ERR:", e.message.slice(0, 100)); }
}
await sql.end();
