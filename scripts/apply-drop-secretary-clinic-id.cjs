// apply-drop-secretary-clinic-id.cjs
// Applies packages/db/migrations/drop_secretaries_clinic_id.sql
// Usage: node scripts/apply-drop-secretary-clinic-id.cjs

const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://doktori:doktori_dev@127.0.0.1:5432/doktori";

async function main() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  const sql = fs.readFileSync(
    path.join(__dirname, "../packages/db/migrations/drop_secretaries_clinic_id.sql"),
    "utf8"
  );

  console.log("Applying drop_secretaries_clinic_id.sql …");
  await client.query(sql);
  console.log("Done.");

  const { rows } = await client.query(
    `SELECT COUNT(*) AS total FROM secretaries`
  );
  console.log("Secretary count:", rows[0].total);

  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
