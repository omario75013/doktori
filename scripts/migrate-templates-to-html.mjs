#!/usr/bin/env node
/**
 * One-shot migration: convert all `prescription_templates.body_markdown`
 * from Markdown to Quill-compatible HTML.
 *
 * Uses psql via stdin (no node-postgres dependency).
 *
 * Run: node scripts/migrate-templates-to-html.mjs
 */

import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load DATABASE_URL from apps/web/.env
const envFile = readFileSync(join(__dirname, "..", "apps", "web", ".env"), "utf8");
const dbUrl = envFile.split("\n").find((l) => l.startsWith("DATABASE_URL="))?.slice("DATABASE_URL=".length).trim();
if (!dbUrl) throw new Error("DATABASE_URL not found in apps/web/.env");

// Locate psql.exe
const PSQL_CANDIDATES = [
  "C:\\Program Files\\PostgreSQL\\17\\bin\\psql.exe",
  "C:\\Program Files\\PostgreSQL\\16\\bin\\psql.exe",
  "C:\\Program Files\\PostgreSQL\\15\\bin\\psql.exe",
  "psql",
];
let psqlPath = null;
for (const cand of PSQL_CANDIDATES) {
  const r = spawnSync(cand, ["--version"], { stdio: "ignore" });
  if (r.status === 0) {
    psqlPath = cand;
    break;
  }
}
if (!psqlPath) throw new Error("psql not found in PATH or standard install locations");
console.log("Using psql at:", psqlPath);

function mdToHtml(md) {
  if (!md) return "";
  if (/<(p|h[1-6]|strong|em|hr|br|ul|ol|li|div)\b/i.test(md)) return md;

  const escapeHtml = (s) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const inline = (s) =>
    s
      .replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, "<em>$1</em>");

  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const blocks = [];
  let buffer = [];

  function flushParagraph() {
    if (buffer.length === 0) return;
    blocks.push(`<p>${buffer.map((line) => inline(escapeHtml(line))).join("<br>")}</p>`);
    buffer = [];
  }

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line === "") {
      flushParagraph();
      continue;
    }
    if (/^---+\s*$/.test(line)) {
      flushParagraph();
      blocks.push("<hr>");
      continue;
    }
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      flushParagraph();
      blocks.push(`<h${h[1].length}>${inline(escapeHtml(h[2]))}</h${h[1].length}>`);
      continue;
    }
    buffer.push(line);
  }
  flushParagraph();

  return blocks.join("");
}

function psql(sql) {
  const r = spawnSync(psqlPath, ["--dbname=" + dbUrl, "--no-align", "--tuples-only", "--command=" + sql], {
    encoding: "utf8",
    maxBuffer: 50 * 1024 * 1024,
  });
  if (r.status !== 0) throw new Error("psql failed: " + r.stderr);
  return r.stdout;
}

function psqlFile(sqlFilePath) {
  const r = spawnSync(psqlPath, ["--dbname=" + dbUrl, "--file=" + sqlFilePath], {
    encoding: "utf8",
    maxBuffer: 50 * 1024 * 1024,
  });
  if (r.status !== 0) throw new Error("psql file failed: " + r.stderr);
  return r.stdout;
}

// Fetch IDs first
const idList = psql(
  `SELECT id::text FROM prescription_templates WHERE deleted_at IS NULL`
)
  .split("\n")
  .map((s) => s.trim())
  .filter(Boolean);

// Fetch each row's title + base64-encoded body individually (avoids parsing trouble)
const rows = idList.map((id) => {
  const title = psql(`SELECT title FROM prescription_templates WHERE id = '${id}'`).trim();
  const b64 = psql(
    `SELECT replace(encode(body_markdown::bytea, 'base64'), E'\\n', '') FROM prescription_templates WHERE id = '${id}'`
  ).trim();
  const body = Buffer.from(b64, "base64").toString("utf8");
  return { id, title, body };
});

console.log(`Found ${rows.length} templates`);

const updates = [];
let skipped = 0;
for (const row of rows) {
  const html = mdToHtml(row.body);
  if (html === row.body) {
    console.log(`  ⏭  ${row.title} — already HTML`);
    skipped++;
    continue;
  }
  updates.push({ id: row.id, html });
  console.log(`  ✓  ${row.title}`);
}

if (updates.length === 0) {
  console.log("\nNothing to update.");
  process.exit(0);
}

// Write updates as a SQL file (parameterized via dollar-quoting to avoid escape issues)
const tmp = mkdtempSync(join(tmpdir(), "tpl-mig-"));
const sqlFile = join(tmp, "updates.sql");
const sqlBody = updates
  .map((u, i) => {
    const tag = `body${i}`;
    return `UPDATE prescription_templates SET body_markdown = $${tag}$${u.html}$${tag}$, updated_at = now() WHERE id = '${u.id}';`;
  })
  .join("\n");
writeFileSync(sqlFile, sqlBody, "utf8");
psqlFile(sqlFile);
rmSync(tmp, { recursive: true, force: true });

console.log(`\nDone: ${updates.length} converted, ${skipped} skipped`);
