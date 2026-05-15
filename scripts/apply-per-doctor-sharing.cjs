#!/usr/bin/env node
/**
 * Apply per_doctor_sharing.sql to the local dev database.
 *
 * Usage:
 *   node scripts/apply-per-doctor-sharing.cjs
 *
 * Uses DATABASE_URL from the environment (falls back to the dev default).
 */
const postgres = require("postgres");
const fs = require("fs");
const path = require("path");

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://doktori:doktori_dev@127.0.0.1:5432/doktori";

const SQL_FILE = path.join(
  __dirname,
  "..",
  "packages",
  "db",
  "migrations",
  "per_doctor_sharing.sql"
);

async function main() {
  const sql = postgres(DATABASE_URL, { max: 1 });

  console.log("Connecting to:", DATABASE_URL.replace(/:\/\/.*@/, "://<redacted>@"));

  const script = fs.readFileSync(SQL_FILE, "utf8");

  console.log("Running per_doctor_sharing.sql …");
  try {
    await sql.unsafe(script);
    console.log("Migration applied successfully.");

    for (const tbl of ["prescriptions", "medical_certificates", "consultation_notes"]) {
      try {
        const [{ exists }] = await sql`
          SELECT EXISTS(
            SELECT 1 FROM information_schema.columns
            WHERE table_name = ${tbl}
              AND column_name = 'shared_with_doctor_ids'
          ) AS exists
        `;
        console.log(`${tbl}.shared_with_doctor_ids: ${exists ? "exists" : "missing (table may not exist)"}`);
      } catch {
        console.log(`${tbl}: could not check (table may not exist)`);
      }
    }
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
