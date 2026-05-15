#!/usr/bin/env node
/**
 * Apply clinic_membership_phase1.sql to the local dev database.
 *
 * Usage:
 *   node scripts/apply-phase1-migration.cjs
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
  "clinic_membership_phase1.sql"
);

async function main() {
  const sql = postgres(DATABASE_URL, { max: 1 });

  console.log("Connecting to:", DATABASE_URL.replace(/:\/\/.*@/, "://<redacted>@"));

  const script = fs.readFileSync(SQL_FILE, "utf8");

  console.log("Running clinic_membership_phase1.sql …");
  try {
    await sql.unsafe(script);
    console.log("Migration applied successfully.");

    // Report backfill count
    const rows = await sql`
      SELECT count(*) AS cnt
      FROM doctor_practices dp
      JOIN clinic_doctors cd ON cd.doctor_id = dp.doctor_id AND cd.clinic_id = dp.clinic_id
      WHERE dp.kind = 'clinic'
    `;
    console.log(
      `doctor_practices rows with kind='clinic': ${rows[0]?.cnt ?? 0}`
    );
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
