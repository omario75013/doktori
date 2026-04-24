import postgres from "postgres";
const sql = postgres("postgresql://doktori:doktori_dev_2026@localhost:5434/doktori");
const r = await sql`SELECT email, name, role, is_active FROM admin_users`;
console.log(r);
await sql.end();
