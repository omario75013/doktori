#!/usr/bin/env node
/**
 * Apply lab_analysis_types.sql to the local dev database.
 * Usage: node scripts/apply-lab-analyses.cjs
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
  "lab_analysis_types.sql"
);

async function main() {
  const sql = postgres(DATABASE_URL, { max: 1 });
  console.log("Connecting to:", DATABASE_URL.replace(/:\/\/.*@/, "://<redacted>@"));
  const script = fs.readFileSync(SQL_FILE, "utf8");
  console.log("Running lab_analysis_types.sql …");
  try {
    await sql.unsafe(script);
    console.log("Migration applied successfully.");

    const tableCheck = await sql`
      SELECT count(*) AS cnt FROM information_schema.tables
      WHERE table_name = 'lab_analysis_types'
    `;
    console.log(`lab_analysis_types table exists: ${tableCheck[0]?.cnt > 0}`);

    const rowCount = await sql`SELECT count(*) AS cnt FROM lab_analysis_types`;
    console.log(`Total lab_analysis_types rows: ${rowCount[0]?.cnt ?? 0}`);
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
