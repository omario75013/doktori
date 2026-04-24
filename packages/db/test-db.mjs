import postgres from "postgres";
const sql = postgres("postgresql://doktori:doktori_dev_2026@localhost:5434/doktori");
try {
  const r = await sql`SELECT email, length(password_hash) AS hashlen, substring(password_hash, 1, 7) AS hash_prefix FROM doctors WHERE email = 'karim.benali@doktori.tn'`;
  console.log("user:", JSON.stringify(r));
  const cols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name='doctors' ORDER BY ordinal_position`;
  console.log("doctor cols count:", cols.length);
} catch (e) {
  console.error("err:", e.message);
}
await sql.end();
