#!/usr/bin/env node
/**
 * Apply lab_users.sql to the local dev database.
 *
 * Usage:
 *   node scripts/apply-lab-users.cjs
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
  "lab_users.sql"
);

async function main() {
  const sql = postgres(DATABASE_URL, { max: 1 });

  console.log("Connecting to:", DATABASE_URL.replace(/:\/\/.*@/, "://<redacted>@"));

  const script = fs.readFileSync(SQL_FILE, "utf8");

  console.log("Running lab_users.sql ...");
  try {
    await sql.unsafe(script);
    console.log("Migration applied successfully.");

    const [tableCheck] = await sql`
      SELECT count(*) AS cnt
      FROM information_schema.tables
      WHERE table_name = 'lab_users'
    `;
    console.log(`lab_users table exists: ${Number(tableCheck?.cnt) > 0 ? "YES" : "NO"}`);

    const [colCount] = await sql`
      SELECT count(*) AS cnt
      FROM information_schema.columns
      WHERE table_name = 'lab_users'
    `;
    console.log(`lab_users columns: ${colCount?.cnt ?? 0}`);

    const [rowCount] = await sql`SELECT count(*) AS cnt FROM lab_users`;
    console.log(`lab_users rows: ${rowCount?.cnt ?? 0}`);
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
