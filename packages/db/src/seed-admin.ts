/**
 * Bootstrap script: create the first super-admin row.
 *
 * Usage:
 *   DATABASE_URL=... pnpm tsx packages/db/src/seed-admin.ts \
 *     --email you@doktori.tn --name "Omar" --password "Str0ngP@ss" [--role super_admin]
 *
 * Idempotent: if an admin with the same email exists, it updates the row
 * (password + name + role) instead of failing.
 */
import postgres from "postgres";
import bcrypt from "bcryptjs";

type Role = "super_admin" | "moderator" | "finance" | "support" | "marketing";

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
  const email = (args.email || "").toLowerCase();
  const name = args.name;
  const password = args.password;
  const role = (args.role || "super_admin") as Role;

  if (!email || !name || !password) {
    console.error(
      "❌ Missing args. Usage: --email X --name Y --password Z [--role super_admin]"
    );
    process.exit(1);
  }

  const validRoles: Role[] = [
    "super_admin",
    "moderator",
    "finance",
    "support",
    "marketing",
  ];
  if (!validRoles.includes(role)) {
    console.error(`❌ Invalid role: ${role}. Must be one of ${validRoles.join(", ")}`);
    process.exit(1);
  }

  const dbUrl =
    process.env.DATABASE_URL ||
    "postgresql://doktori:doktori_dev@localhost:5433/doktori";
  const sql = postgres(dbUrl);

  const hash = await bcrypt.hash(password, 10);

  const existing = await sql<Array<{ id: string }>>`
    SELECT id FROM admin_users WHERE email = ${email} LIMIT 1
  `;

  if (existing.length > 0) {
    await sql`
      UPDATE admin_users
         SET password_hash = ${hash},
             name          = ${name},
             role          = ${role},
             is_active     = true,
             updated_at    = now()
       WHERE id = ${existing[0].id}
    `;
    console.log(`✅ Updated existing admin: ${email} (${role})`);
  } else {
    const [row] = await sql<Array<{ id: string }>>`
      INSERT INTO admin_users (email, password_hash, name, role, is_active)
      VALUES (${email}, ${hash}, ${name}, ${role}, true)
      RETURNING id
    `;
    console.log(`✅ Created admin: ${email} (${role}) id=${row.id}`);
  }

  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
