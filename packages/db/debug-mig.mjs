import { readFileSync } from "fs";
const content = readFileSync("./migrations/0036_messaging.sql", "utf-8");
console.log("HAS_BREAKPOINT:", content.includes("--> statement-breakpoint"));
let statements;
if (content.includes("--> statement-breakpoint")) {
  statements = content.split(/--> statement-breakpoint/).map(s => s.trim()).filter(Boolean);
} else {
  statements = [];
  let buf = "", inDollar = false;
  for (let i = 0; i < content.length; i++) {
    const c = content[i];
    if (content.slice(i, i + 2) === "$$") { inDollar = !inDollar; buf += "$$"; i++; continue; }
    buf += c;
    if (c === ";" && !inDollar && (content[i+1] === "\n" || content[i+1] === undefined)) {
      statements.push(buf.trim()); buf = "";
    }
  }
  if (buf.trim()) statements.push(buf.trim());
  statements = statements.map(s => s.replace(/;$/, "").trim()).filter(Boolean);
}
console.log("count:", statements.length);
statements.forEach((s, i) => console.log(`--- [${i}] ---\n${s.slice(0, 100)}`));
