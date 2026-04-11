/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Translate fr.json → ar.json using DeepL API Free.
 *
 * Usage:
 *   DEEPL_API_KEY=xxx pnpm tsx scripts/translate-with-deepl.ts
 *
 * The script:
 *   1. Loads apps/web/i18n/messages/fr.json
 *   2. Walks every leaf string
 *   3. Calls DeepL in batches of 50 strings
 *   4. Writes apps/web/i18n/messages/ar.json
 *
 * Free plan limit: 500,000 chars/month. A full Doktori ar.json is ~8,000 chars.
 */

import fs from "node:fs/promises";
import path from "node:path";

const DEEPL_ENDPOINT = "https://api-free.deepl.com/v2/translate";
const BATCH_SIZE = 50;
const FR_PATH = path.resolve(__dirname, "../i18n/messages/fr.json");
const AR_PATH = path.resolve(__dirname, "../i18n/messages/ar.json");

type JsonObject = { [k: string]: JsonValue };
type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];

interface Leaf {
  path: string[];
  text: string;
}

function collectLeaves(obj: JsonValue, prefix: string[] = []): Leaf[] {
  const out: Leaf[] = [];
  if (typeof obj === "string") {
    out.push({ path: prefix, text: obj });
  } else if (Array.isArray(obj)) {
    obj.forEach((v, i) => out.push(...collectLeaves(v, [...prefix, String(i)])));
  } else if (obj && typeof obj === "object") {
    for (const [k, v] of Object.entries(obj)) {
      out.push(...collectLeaves(v, [...prefix, k]));
    }
  }
  return out;
}

function setByPath(obj: any, pathArr: string[], value: string): void {
  let cur = obj;
  for (let i = 0; i < pathArr.length - 1; i++) {
    const key = pathArr[i];
    if (!(key in cur)) cur[key] = {};
    cur = cur[key];
  }
  cur[pathArr[pathArr.length - 1]] = value;
}

async function translateBatch(texts: string[], apiKey: string): Promise<string[]> {
  const body = new URLSearchParams();
  body.set("source_lang", "FR");
  body.set("target_lang", "AR");
  body.set("preserve_formatting", "1");
  body.set("formality", "more");
  for (const t of texts) body.append("text", t);

  const res = await fetch(DEEPL_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `DeepL-Auth-Key ${apiKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`DeepL ${res.status}: ${err}`);
  }

  const data = (await res.json()) as { translations: Array<{ text: string }> };
  return data.translations.map((t) => t.text);
}

async function main() {
  const apiKey = process.env.DEEPL_API_KEY;
  if (!apiKey) {
    console.error("❌ DEEPL_API_KEY is required. Get one at https://www.deepl.com/pro");
    process.exit(1);
  }

  console.log("📖 Loading fr.json...");
  const fr = JSON.parse(await fs.readFile(FR_PATH, "utf-8"));

  const leaves = collectLeaves(fr);
  console.log(`📝 ${leaves.length} strings to translate`);

  const totalChars = leaves.reduce((sum, l) => sum + l.text.length, 0);
  console.log(`📏 Total: ${totalChars.toLocaleString()} characters`);
  console.log(`💰 Free plan usage: ${((totalChars / 500000) * 100).toFixed(2)}%`);

  // Load existing ar.json to skip already-translated keys
  let existingAr: JsonObject = {};
  try {
    existingAr = JSON.parse(await fs.readFile(AR_PATH, "utf-8"));
  } catch {
    console.log("ℹ️  No existing ar.json, starting fresh");
  }

  const existingLeaves = collectLeaves(existingAr);
  const existingMap = new Map<string, string>();
  for (const l of existingLeaves) existingMap.set(l.path.join("."), l.text);

  const ar: JsonObject = JSON.parse(JSON.stringify(existingAr));

  // Skip keys that are already in ar.json AND have a non-empty value
  const toTranslate = leaves.filter((l) => {
    const existing = existingMap.get(l.path.join("."));
    return !existing || existing === "" || existing === l.text;
  });

  console.log(`🔄 Translating ${toTranslate.length} new/changed strings...`);

  // Translate in batches
  for (let i = 0; i < toTranslate.length; i += BATCH_SIZE) {
    const batch = toTranslate.slice(i, i + BATCH_SIZE);
    const texts = batch.map((l) => l.text);
    console.log(
      `  Batch ${i / BATCH_SIZE + 1}/${Math.ceil(toTranslate.length / BATCH_SIZE)} (${batch.length} strings)`
    );

    try {
      const translations = await translateBatch(texts, apiKey);
      batch.forEach((leaf, idx) => {
        setByPath(ar, leaf.path, translations[idx] ?? leaf.text);
      });
    } catch (e) {
      console.error(`  ❌ Batch failed:`, e);
      throw e;
    }

    // Rate limit: wait 1s between batches
    if (i + BATCH_SIZE < toTranslate.length) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  // Preserve existing keys structure even if not in fr.json
  await fs.writeFile(AR_PATH, JSON.stringify(ar, null, 2) + "\n", "utf-8");
  console.log(`✅ Saved to ${AR_PATH}`);
  console.log(`📊 Final ar.json: ${collectLeaves(ar).length} keys`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
