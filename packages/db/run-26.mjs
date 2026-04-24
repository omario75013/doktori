import postgres from "postgres";
import { readFileSync } from "fs";
const sql = postgres("postgresql://doktori:doktori_dev_2026@localhost:5434/doktori");
const content = readFileSync("./migrations/0026_doctor_practices.sql", "utf-8").replace(/\r\n/g, "\n");
try {
  await sql.unsafe(content);
  console.log("OK whole file");
} catch (e) {
  console.log("ERR:", e.message);
}
const t = await sql`SELECT to_regclass('doctor_practices') AS dp, to_regclass('doctor_schedules') AS ds`;
const c = await sql`SELECT column_name FROM information_schema.columns WHERE table_name='doctor_schedules'`;
console.log(t[0]);
console.log("schedules:", c.map(x => x.column_name).join(","));
await sql.end();
