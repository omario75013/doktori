#!/usr/bin/env node
/**
 * Apply lab_order_workflow.sql to the local dev database.
 * Usage: node scripts/apply-lab-order-workflow.cjs
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
  "lab_order_workflow.sql"
);

async function main() {
  const sql = postgres(DATABASE_URL, { max: 1 });
  console.log("Connecting to:", DATABASE_URL.replace(/:\/\/.*@/, "://<redacted>@"));
  const script = fs.readFileSync(SQL_FILE, "utf8");
  console.log("Running lab_order_workflow.sql …");
  try {
    await sql.unsafe(script);
    console.log("Migration applied successfully.");

    const colCount = await sql`
      SELECT count(*) AS cnt FROM information_schema.columns
      WHERE table_name = 'lab_orders'
        AND column_name IN (
          'internal_ref','specimen_collected_at','expected_result_at',
          'result_uploaded_at','technician_id','result_summary'
        )
    `;
    console.log(`New columns present on lab_orders: ${colCount[0]?.cnt ?? 0} / 6`);

    const orderCount = await sql`SELECT count(*) AS cnt FROM lab_orders`;
    console.log(`Total lab_orders rows: ${orderCount[0]?.cnt ?? 0}`);
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
