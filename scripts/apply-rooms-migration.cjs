#!/usr/bin/env node
/**
 * Apply rooms_details.sql to the local dev database.
 *
 * Usage:
 *   node scripts/apply-rooms-migration.cjs
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
  "rooms_details.sql"
);

async function main() {
  const sql = postgres(DATABASE_URL, { max: 1 });

  console.log("Connecting to:", DATABASE_URL.replace(/:\/\/.*@/, "://<redacted>@"));

  const script = fs.readFileSync(SQL_FILE, "utf8");

  console.log("Running rooms_details.sql …");
  try {
    await sql.unsafe(script);
    console.log("Migration applied successfully.");

    const cols = await sql`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'clinic_rooms'
        AND column_name IN ('capacity','floor','equipment_notes','status','last_cleaned_at')
      ORDER BY column_name
    `;
    console.log("New columns confirmed:", cols.map((c) => c.column_name).join(", "));

  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
