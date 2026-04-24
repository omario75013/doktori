import postgres from "postgres";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";

const sql = postgres("postgresql://doktori:doktori_dev_2026@localhost:5434/doktori", {
  onnotice: () => {},
});

const dir = "./migrations";
const files = readdirSync(dir).filter(f => f.endsWith(".sql")).sort();

let ok = 0, skipped = 0, partial = 0;
for (const f of files) {
  const content = readFileSync(join(dir, f), "utf-8").replace(/\r\n/g, "\n");
  let statements;
  if (content.includes("--> statement-breakpoint")) {
    statements = content.split(/--> statement-breakpoint/).map(s => s.trim()).filter(Boolean);
  } else {
    statements = [content];
  }
  let fileErrors = [];
  for (const stmt of statements) {
    if (!stmt || stmt.startsWith("--")) continue;
    try {
      await sql.unsafe(stmt);
    } catch (e) {
      fileErrors.push(`${e.code || ""}: ${e.message.slice(0, 120)}`);
    }
  }
  if (fileErrors.length === 0) { ok++; console.log(`OK    ${f}`); }
  else if (fileErrors.every(e => /already exists|duplicate/i.test(e))) {
    skipped++; console.log(`SKIP  ${f} (${fileErrors.length} non-fatal)`);
  } else {
    partial++; console.log(`PART  ${f}`);
    fileErrors.slice(0, 5).forEach(e => console.log(`      ${e}`));
  }
}
console.log(`\nDone. ok=${ok} skipped=${skipped} partial=${partial}`);
await sql.end();
