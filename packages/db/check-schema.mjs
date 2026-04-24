import postgres from "postgres";
const sql = postgres("postgresql://doktori:doktori_dev_2026@localhost:5434/doktori");
const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name`;
console.log("TABLES:", tables.map(t => t.table_name).join(","));
await sql.end();
