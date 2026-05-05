/**
 * Bootstrap script: create test patient accounts for QA / staging.
 *
 * Creates 3 test patients with predictable phone numbers and a shared
 * password. Idempotent: if a patient with the same phone exists, the row
 * is updated (password + name + auth_method = 'password').
 *
 * Usage:
 *   DATABASE_URL=... pnpm --filter @doktori/db exec tsx src/seed-test-patients.ts
 *   # or with custom password:
 *   DATABASE_URL=... pnpm --filter @doktori/db exec tsx src/seed-test-patients.ts --password MyT3st!2026
 *
 * Login on the app:
 *   - URL          : https://doktori.tn/connexion-patient
 *   - Phone        : as printed at the end of this script
 *   - Password     : as passed via --password (default: TestDoktori2026!)
 *
 * NOTE: Do NOT run this against production unless you intentionally want
 * test accounts in prod. Recommended: run against staging / QA database.
 */
import postgres from "postgres";
import bcrypt from "bcryptjs";

interface TestPatient {
  name: string;
  phone: string;
  email: string;
  dateOfBirth: string;
  gender: "male" | "female";
  cnamNumber?: string;
}

const TEST_PATIENTS: TestPatient[] = [
  {
    name: "Test Patient Un",
    phone: "+21650000001",
    email: "test.patient1@doktori.tn",
    dateOfBirth: "1990-05-15",
    gender: "female",
  },
  {
    name: "Test Patient Deux",
    phone: "+21650000002",
    email: "test.patient2@doktori.tn",
    dateOfBirth: "1985-11-23",
    gender: "male",
    cnamNumber: "12345678",
  },
  {
    name: "Test Patient Senior",
    phone: "+21650000003",
    email: "test.patient3@doktori.tn",
    dateOfBirth: "1955-03-08",
    gender: "male",
    cnamNumber: "87654321",
  },
];

function parseArgs(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        out[key] = next;
        i++;
      } else {
        out[key] = "true";
      }
    }
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const password = args.password || "TestDoktori2026!";

  const dbUrl =
    process.env.DATABASE_URL ||
    "postgresql://doktori:doktori_dev@localhost:5433/doktori";

  // Refuse to run against an obviously-production-looking URL unless --force is set.
  // Heuristic: prod URLs typically contain "supabase" or the prod hostname.
  if (
    !args.force &&
    /supabase|doktori\.tn|157\.90\.152\.204/.test(dbUrl)
  ) {
    console.error(
      "❌ DATABASE_URL looks like production. Refusing to create test patients.\n" +
        "   Re-run with --force if you really intend to seed prod."
    );
    process.exit(1);
  }

  const sql = postgres(dbUrl);
  const hash = await bcrypt.hash(password, 10);

  const created: Array<{ phone: string; name: string; action: string }> = [];

  for (const p of TEST_PATIENTS) {
    const existing = await sql<Array<{ id: string }>>`
      SELECT id FROM patients WHERE phone = ${p.phone} LIMIT 1
    `;

    if (existing.length > 0) {
      await sql`
        UPDATE patients
           SET name = ${p.name},
               email = ${p.email},
               password_hash = ${hash},
               date_of_birth = ${p.dateOfBirth},
               gender = ${p.gender},
               cnam_number = ${p.cnamNumber ?? null},
               auth_method = 'password',
               is_suspended = false
         WHERE id = ${existing[0].id}
      `;
      created.push({ phone: p.phone, name: p.name, action: "updated" });
    } else {
      await sql`
        INSERT INTO patients (
          name, phone, email, password_hash, date_of_birth, gender, cnam_number,
          auth_method, email_verified
        ) VALUES (
          ${p.name}, ${p.phone}, ${p.email}, ${hash}, ${p.dateOfBirth},
          ${p.gender}, ${p.cnamNumber ?? null}, 'password', true
        )
      `;
      created.push({ phone: p.phone, name: p.name, action: "created" });
    }
  }

  await sql.end();

  console.log("");
  console.log("=".repeat(70));
  console.log("✅ Test patient accounts ready");
  console.log("=".repeat(70));
  console.log("");
  for (const c of created) {
    console.log(`  ${c.action === "created" ? "➕" : "🔄"}  ${c.name.padEnd(24)} ${c.phone}`);
  }
  console.log("");
  console.log(`  Password (all 3 accounts) : ${password}`);
  console.log("");
  console.log("  Login URL                 : https://doktori.tn/connexion-patient");
  console.log("                              (or http://localhost:3000/connexion-patient in dev)");
  console.log("");
  console.log("=".repeat(70));
}

main().catch((e) => {
  console.error("❌ Seed failed:", e);
  process.exit(1);
});
