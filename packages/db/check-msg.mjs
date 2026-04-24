import postgres from "postgres";
const sql = postgres("postgresql://doktori:doktori_dev_2026@localhost:5434/doktori");
const r = await sql`SELECT table_name FROM information_schema.tables WHERE table_name IN ('messages','conversations')`;
console.log(r);
const cols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name='messages' ORDER BY ordinal_position`;
console.log("messages cols:", cols.map(c => c.column_name).join(","));
await sql.end();
