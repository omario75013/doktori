import postgres from "postgres";
const sql = postgres("postgresql://doktori:doktori_dev_2026@localhost:5434/doktori");
try {
  const r = await sql`SELECT extname FROM pg_extension WHERE extname='postgis'`;
  console.log("postgis:", r.length ? "installed" : "MISSING");
  const t = await sql`SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_name='sos_sessions' AND column_name='patient_location'`;
  console.log("patient_location:", t);
  const d = await sql`SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_name='doctors' AND column_name='location'`;
  console.log("doctors.location:", d);
  // simulate the failing query
  const doctorId = "e058a92a-9a74-409d-b34a-fc7ba11e899b";
  const q = await sql`SELECT s.id, p.name, ST_Distance(s.patient_location, d.location) AS distance_m FROM sos_sessions s INNER JOIN doctors d ON d.id = ${doctorId} INNER JOIN patients p ON p.id = s.patient_id LIMIT 1`;
  console.log("query result:", q);
} catch (e) { console.log("ERR:", e.message); }
await sql.end();
