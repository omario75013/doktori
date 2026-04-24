import postgres from "postgres";
const sql = postgres("postgresql://doktori:doktori_dev_2026@localhost:5434/doktori");

const cmds = [
  `ALTER TABLE appointment_types ADD COLUMN IF NOT EXISTS mode varchar(20) NOT NULL DEFAULT 'cabinet'`,
];
for (const c of cmds) {
  try { await sql.unsafe(c); console.log("OK:", c.slice(0, 80)); }
  catch (e) { console.log("ERR:", e.message.slice(0, 100)); }
}

// Diagnose SOS: check sos_sessions and reviews columns
const sos_cols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name='sos_sessions' ORDER BY ordinal_position`;
console.log("sos_sessions:", sos_cols.map(c => c.column_name).join(","));
const rev_cols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name='reviews' ORDER BY ordinal_position`;
console.log("reviews:", rev_cols.map(c => c.column_name).join(","));
const doc_cols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name='doctors' ORDER BY ordinal_position`;
console.log("doctors loc:", doc_cols.filter(c => /location|sos/i.test(c.column_name)).map(c => c.column_name).join(","));

await sql.end();
