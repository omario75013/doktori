import postgres from "postgres";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";

const DB_URL = process.env.DATABASE_URL || "postgresql://doktori:doktori_dev@127.0.0.1:5432/doktori";
const sql = postgres(DB_URL, { onnotice: () => {} });

const dir = "./migrations";
const files = readdirSync(dir).filter(f => f.endsWith(".sql")).sort();

let ok = 0, skipped = 0, partial = 0;
for (const f of files) {
  const content = readFileSync(join(dir, f), "utf-8").replace(/\r\n/g, "\n");
  const statements = content.includes("--> statement-breakpoint")
    ? content.split(/--> statement-breakpoint/).map(s => s.trim()).filter(Boolean)
    : [content];
  const fileErrors = [];
  for (const stmt of statements) {
    if (!stmt || stmt.startsWith("--")) continue;
    try { await sql.unsafe(stmt); }
    catch (e) { fileErrors.push(`${e.code || ""}: ${e.message.slice(0, 140)}`); }
  }
  if (fileErrors.length === 0) { ok++; console.log(`OK    ${f}`); }
  else if (fileErrors.every(e => /already exists|duplicate|existe d.j./i.test(e))) {
    skipped++; console.log(`SKIP  ${f}`);
  } else {
    partial++; console.log(`PART  ${f}`);
    fileErrors.slice(0, 3).forEach(e => console.log(`      ${e}`));
  }
}
console.log(`\nDone. ok=${ok} skipped=${skipped} partial=${partial}`);
await sql.end();
