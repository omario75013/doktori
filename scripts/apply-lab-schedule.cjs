#!/usr/bin/env node
/**
 * Apply lab_schedule.sql to the local dev database.
 * Usage: node scripts/apply-lab-schedule.cjs
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
  "lab_schedule.sql"
);

async function main() {
  const sql = postgres(DATABASE_URL, { max: 1 });
  console.log("Connecting to:", DATABASE_URL.replace(/:\/\/.*@/, "://<redacted>@"));
  const script = fs.readFileSync(SQL_FILE, "utf8");
  console.log("Running lab_schedule.sql …");
  try {
    await sql.unsafe(script);
    console.log("Migration applied successfully.");

    const schedCheck = await sql`
      SELECT count(*) AS cnt FROM information_schema.tables
      WHERE table_name = 'lab_schedules'
    `;
    const closedCheck = await sql`
      SELECT count(*) AS cnt FROM information_schema.tables
      WHERE table_name = 'lab_closed_days'
    `;
    console.log(`lab_schedules table exists: ${schedCheck[0]?.cnt > 0}`);
    console.log(`lab_closed_days table exists: ${closedCheck[0]?.cnt > 0}`);
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
