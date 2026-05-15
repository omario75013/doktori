#!/usr/bin/env node
/**
 * Apply secretary_practice_phase3.sql to the local dev database.
 *
 * Usage:
 *   node scripts/apply-phase3-migration.cjs
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
  "secretary_practice_phase3.sql"
);

async function main() {
  const sql = postgres(DATABASE_URL, { max: 1 });

  console.log("Connecting to:", DATABASE_URL.replace(/:\/\/.*@/, "://<redacted>@"));

  const script = fs.readFileSync(SQL_FILE, "utf8");

  console.log("Running secretary_practice_phase3.sql …");
  try {
    await sql.unsafe(script);
    console.log("Migration applied successfully.");

    // Report backfill counts
    const backfilled = await sql`
      SELECT count(*) AS cnt
      FROM secretaries
      WHERE practice_id IS NOT NULL
    `;
    console.log(`secretaries with practice_id set: ${backfilled[0]?.cnt ?? 0}`);

    const unresolved = await sql`
      SELECT count(*) AS cnt
      FROM secretaries
      WHERE practice_id IS NULL
    `;
    console.log(`secretaries still without practice_id (no practices for doctor): ${unresolved[0]?.cnt ?? 0}`);

  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
