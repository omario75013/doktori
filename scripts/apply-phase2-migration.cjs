#!/usr/bin/env node
/**
 * Apply clinic_patient_phase2.sql to the local dev database.
 *
 * Usage:
 *   node scripts/apply-phase2-migration.cjs
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
  "clinic_patient_phase2.sql"
);

async function main() {
  const sql = postgres(DATABASE_URL, { max: 1 });

  console.log("Connecting to:", DATABASE_URL.replace(/:\/\/.*@/, "://<redacted>@"));

  const script = fs.readFileSync(SQL_FILE, "utf8");

  console.log("Running clinic_patient_phase2.sql …");
  try {
    await sql.unsafe(script);
    console.log("Migration applied successfully.");

    // Report backfill counts
    const profileRows = await sql`
      SELECT count(*) AS cnt FROM patient_medical_profile
    `;
    console.log(`patient_medical_profile total rows: ${profileRows[0]?.cnt ?? 0}`);

    const patientRows = await sql`
      SELECT count(*) AS cnt FROM patients WHERE created_by_clinic_id IS NOT NULL
    `;
    console.log(
      `patients with created_by_clinic_id set: ${patientRows[0]?.cnt ?? 0}`
    );

    const backfillRows = await sql`
      SELECT count(*) AS cnt
      FROM patient_medical_profile
      WHERE shared_with_clinics = '{}'::jsonb
    `;
    console.log(
      `patient_medical_profile rows with empty shared_with_clinics (default): ${backfillRows[0]?.cnt ?? 0}`
    );
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
