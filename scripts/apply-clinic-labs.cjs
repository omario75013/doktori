#!/usr/bin/env node
/**
 * Apply clinic_labs.sql to the local dev database.
 *
 * Usage:
 *   node scripts/apply-clinic-labs.cjs
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
  "clinic_labs.sql"
);

async function main() {
  const sql = postgres(DATABASE_URL, { max: 1 });

  console.log("Connecting to:", DATABASE_URL.replace(/:\/\/.*@/, "://<redacted>@"));

  const script = fs.readFileSync(SQL_FILE, "utf8");

  console.log("Running clinic_labs.sql ...");
  try {
    await sql.unsafe(script);
    console.log("Migration applied successfully.");

    // Report current counts
    const [colCheck] = await sql`
      SELECT count(*) AS cnt
      FROM information_schema.columns
      WHERE table_name = 'labs'
        AND column_name IN ('clinic_id', 'kind')
    `;
    console.log(`labs columns added (clinic_id + kind): ${colCheck?.cnt ?? 0}/2`);

    const [inHouseCount] = await sql`
      SELECT count(*) AS cnt FROM labs WHERE clinic_id IS NOT NULL
    `;
    console.log(`In-house labs (clinic_id IS NOT NULL): ${inHouseCount?.cnt ?? 0}`);

    const [totalCount] = await sql`SELECT count(*) AS cnt FROM labs`;
    console.log(`Total labs: ${totalCount?.cnt ?? 0}`);
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
