// apply-patient-identity.cjs
// Applies packages/db/migrations/patient_identity_unique.sql
// Usage: node scripts/apply-patient-identity.cjs

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
    path.join(__dirname, "../packages/db/migrations/patient_identity_unique.sql"),
    "utf8"
  );

  console.log("Applying patient_identity_unique.sql …");
  await client.query(sql);
  console.log("Done.");

  // Print row counts
  const { rows } = await client.query(`
    SELECT
      (SELECT COUNT(*) FROM patients) AS total_patients,
      (SELECT COUNT(*) FROM patients WHERE cin IS NOT NULL) AS patients_with_cin,
      (SELECT COUNT(*) FROM patients WHERE phone IS NOT NULL) AS patients_with_phone
  `);
  console.log("Patient counts:", rows[0]);

  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
