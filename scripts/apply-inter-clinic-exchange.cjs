#!/usr/bin/env node
/**
 * Apply inter_clinic_exchange.sql to the local dev database.
 *
 * Usage:
 *   node scripts/apply-inter-clinic-exchange.cjs
 *
 * Uses DATABASE_URL from the environment (falls back to the dev default).
 */
const postgres = require("postgres");
const fs = require("fs");
const path = require("path");

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://doktori:doktori_dev@127.0.0.1:5432/doktori";

async function main() {
  const sql = postgres(DATABASE_URL);

  const migration = fs.readFileSync(
    path.join(__dirname, "../packages/db/migrations/inter_clinic_exchange.sql"),
    "utf8"
  );

  console.log("Applying inter_clinic_exchange.sql …");
  await sql.unsafe(migration);
  console.log("Done.");

  const [stats] = await sql`
    SELECT
      (SELECT COUNT(*)::int FROM patient_documents) AS total_docs,
      (SELECT COUNT(*)::int FROM patient_documents WHERE shared_with_clinic_ids <> '{}'::uuid[]) AS docs_shared_with_clinics
  `;
  console.log("patient_documents stats:", stats);

  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
