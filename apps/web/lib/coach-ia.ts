import "server-only";

import { SPECIALTIES } from "@doktori/shared";
import { db, coachIaUsage } from "@doktori/db";
import { redis } from "./cache";

// ─── Pricing (Kimi K2 via OpenRouter) ─────────────────────────────────────────
// $0.40 / M input tokens, $2.00 / M output tokens.
const PRICE_PER_INPUT_TOKEN = 0.0000004;
const PRICE_PER_OUTPUT_TOKEN = 0.000002;

// ─── Limits ───────────────────────────────────────────────────────────────────
const PER_PATIENT_LIMIT = 10;          // messages per 24h per patient
const GLOBAL_LIMIT = 1000;             // messages per 24h across all patients
const RATE_WINDOW_SECONDS = 86400;     // 24h

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * `redis` is a real ioredis client (or `ioredis-mock` in tests). Treat it as
 * usable only when fully connected. Mirrors the pattern in cache.ts; under
 * `ioredis-mock` the status field is `undefined` and commands run synchronously.
 */
function isReady(): boolean {
  return redis.status === undefined || redis.status === "ready";
}

function todayKey(): string {
  // YYYY-MM-DD in UTC — keeps key calc deterministic across environments.
  return new Date().toISOString().slice(0, 10);
}

// ─── System prompt ────────────────────────────────────────────────────────────

/**
 * Builds the V1 Coach IA system prompt, embedding the canonical specialty list
 * from `@doktori/shared`. The prompt body is verbatim from the spec
 * (docs/superpowers/specs/2026-05-06-coach-ia-design.md).
 *
 * IMPORTANT: All wording is "to be reviewed" — the feature flag stays OFF
 * until physician + legal sign-off (see DPIA in the spec).
 */
export function buildSystemPrompt(): string {
  const specialtyList = SPECIALTIES.map((s) => `- ${s.id} (${s.label})`).join("\n");

  return `Tu es un assistant d'orientation médicale pour Doktori (plateforme tunisienne
de prise de rendez-vous médicaux). Tu n'es PAS un médecin et tu ne fais PAS de
diagnostic. Ton rôle est uniquement d'aider le patient à identifier vers quelle
SPÉCIALITÉ il peut s'orienter pour consulter un professionnel de santé.

RÈGLES STRICTES — non négociables :

1. Ne jamais poser de diagnostic. Si tu reconnais un pattern de symptômes,
   formule toujours en termes d'orientation : "Ces symptômes peuvent relever
   de la spécialité X — un médecin de cette spécialité pourra évaluer".

2. Ne jamais conseiller de médicament, de dosage, ni d'arrêt de traitement.
   Si la question porte là-dessus, répondre : "Pour toute question médicament,
   consultez un pharmacien ou votre médecin."

3. Si le patient mentionne :
   - Une douleur thoracique aiguë
   - Des difficultés respiratoires
   - Des pensées suicidaires ou idées noires
   - Une perte de connaissance ou état confusionnel
   - Une hémorragie importante
   - Tout traumatisme grave
   ⇒ Réponds IMMÉDIATEMENT en redirigeant vers les urgences :
   "Ces symptômes peuvent indiquer une urgence médicale. Appelez le SAMU
   au 190 ou les pompiers au 198 immédiatement, ou rendez-vous au service
   d'urgence le plus proche. Ne pas attendre."

4. Si une question dépasse l'orientation symptôme → spécialité (par exemple
   demande d'avis sur résultat d'examen, demande de seconde opinion,
   demande d'interprétation d'imagerie), réponds : "Cette question
   nécessite l'avis direct d'un médecin. Vous pouvez prendre rendez-vous
   sur Doktori avec un [spécialité]."

5. Toujours conclure ta réponse par une suggestion concrète :
   - Si la spécialité est claire : "Vous pouvez consulter un [SPÉCIALITÉ]
     sur Doktori."
   - Si plusieurs sont possibles : les lister, en commençant par celle
     qui couvre le plus large (généraliste si en doute).

6. Réponds toujours en français, sauf si le patient écrit en arabe — dans
   ce cas reste en français mais sois attentif à la langue du patient.

7. Réponds de manière brève et claire. Pas de paragraphes longs.

Liste des spécialités disponibles sur Doktori (utilise EXACTEMENT ces noms) :
${specialtyList}
`;
}

// ─── Rate limiting ────────────────────────────────────────────────────────────

/**
 * Per-patient rate limit: 10 messages / 24h.
 * Returns `true` if the call is allowed, `false` if rejected.
 *
 * Fail-closed: if Redis is unreachable we return `false` to avoid uncapped
 * spend (a model call without a rate limit is more dangerous than a denied
 * one — the patient can retry later).
 */
export async function checkRateLimit(patientId: string): Promise<boolean> {
  if (!isReady()) return false;
  const key = `coach_ia:rate:patient:${patientId}`;
  try {
    const count = await redis.incr(key);
    if (count === 1) {
      // First hit in the window — set TTL.
      await redis.expire(key, RATE_WINDOW_SECONDS);
    }
    return count <= PER_PATIENT_LIMIT;
  } catch (e) {
    console.warn("[coach-ia] rate-limit redis fail:", e);
    return false;
  }
}

/**
 * Global rate limit: 1000 messages / 24h across all patients (cost guard).
 * Same fail-closed semantics as `checkRateLimit`.
 */
export async function checkGlobalRateLimit(): Promise<boolean> {
  if (!isReady()) return false;
  const key = `coach_ia:rate:global:${todayKey()}`;
  try {
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, RATE_WINDOW_SECONDS);
    }
    return count <= GLOBAL_LIMIT;
  } catch (e) {
    console.warn("[coach-ia] global rate-limit redis fail:", e);
    return false;
  }
}

// ─── Cost guard ───────────────────────────────────────────────────────────────

/**
 * Estimate USD cost of a Kimi K2 call given input + output token counts.
 * Pure function; no I/O.
 */
export function estimateCost(tokensIn: number, tokensOut: number): number {
  return tokensIn * PRICE_PER_INPUT_TOKEN + tokensOut * PRICE_PER_OUTPUT_TOKEN;
}

/**
 * Check whether today's cumulative cost is still under
 * `OPENROUTER_MAX_DAILY_COST_USD` (default $5).
 *
 * Fail-closed: if Redis is unreachable, return `false` (we can't verify
 * the budget — better safe than overcharged).
 */
export async function checkCostCap(): Promise<boolean> {
  if (!isReady()) return false;
  const cap = parseFloat(process.env.OPENROUTER_MAX_DAILY_COST_USD ?? "5");
  const key = `coach_ia:cost:${todayKey()}`;
  try {
    const raw = await redis.get(key);
    const current = raw ? parseFloat(raw) : 0;
    return current <= cap;
  } catch (e) {
    console.warn("[coach-ia] cost-cap redis fail:", e);
    return false;
  }
}

// ─── Usage logging ────────────────────────────────────────────────────────────

/**
 * Insert a row into `coach_ia_usage`. Privacy-by-design: no message content,
 * no model response, no conversation IDs. Metadata only (see DPIA).
 *
 * Fail-soft: a logging failure must NEVER crash the user-facing request.
 * (We accept that an outage means we miss a few rows in analytics.)
 */
export async function recordUsage(args: {
  patientId: string | null;
  eventType: "message" | "disclaimer_accepted";
  tokensIn?: number;
  tokensOut?: number;
  costUsd?: number;
  latencyMs?: number;
  error?: string | null;
}): Promise<void> {
  try {
    await db.insert(coachIaUsage).values({
      patientId: args.patientId,
      eventType: args.eventType,
      tokensIn: args.tokensIn ?? 0,
      tokensOut: args.tokensOut ?? 0,
      costUsd: (args.costUsd ?? 0).toString(),
      latencyMs: args.latencyMs ?? 0,
      error: args.error ?? null,
    });

    // Also bump the daily cost counter so checkCostCap is enforceable
    // without re-reading the DB.
    if (args.costUsd && args.costUsd > 0 && isReady()) {
      const key = `coach_ia:cost:${todayKey()}`;
      try {
        // INCRBYFLOAT atomically increments. We use a string read in
        // checkCostCap to compare against the cap.
        await redis.incrbyfloat(key, args.costUsd);
        await redis.expire(key, RATE_WINDOW_SECONDS);
      } catch (e) {
        console.warn("[coach-ia] cost counter increment fail:", e);
      }
    }
  } catch (e) {
    console.warn("[coach-ia] recordUsage fail:", e);
  }
}

// ─── OpenRouter streaming ─────────────────────────────────────────────────────

/**
 * POST to OpenRouter's chat completion endpoint with `stream: true`. Returns
 * the upstream stream untouched (the route handler relays chunks straight to
 * the client) and a `finalize()` callback that yields the usage stats once
 * the stream closes.
 *
 * NOTE: `include_usage: true` makes OpenRouter emit a final usage chunk
 * containing `prompt_tokens` + `completion_tokens` — that's how we get
 * accurate token counts without having to tokenize ourselves.
 */
export async function streamCompletion(args: {
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>;
}): Promise<{
  stream: ReadableStream;
  finalize: () => Promise<{ tokensIn: number; tokensOut: number; latencyMs: number }>;
}> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set");

  const model = process.env.OPENROUTER_MODEL || "moonshotai/kimi-k2-0905";
  const startedAt = Date.now();

  const upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      // Optional but recommended by OpenRouter for ranking / referrer attribution.
      "HTTP-Referer": process.env.NEXTAUTH_URL ?? "https://doktori.tn",
      "X-Title": "Doktori — Coach IA",
    },
    body: JSON.stringify({
      model,
      messages: args.messages,
      max_tokens: 800,
      stream: true,
      stream_options: { include_usage: true },
    }),
  });

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => "");
    throw new Error(`OpenRouter upstream error ${upstream.status}: ${text.slice(0, 200)}`);
  }

  // Tee the upstream so we can parse usage off one branch while relaying the
  // other branch to the client.
  const [forClient, forParse] = upstream.body.tee();

  let tokensIn = 0;
  let tokensOut = 0;
  const finalizePromise = (async () => {
    const reader = forParse.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        // Split on SSE event boundaries.
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (!payload || payload === "[DONE]") continue;
          try {
            const parsed = JSON.parse(payload);
            if (parsed.usage) {
              tokensIn = parsed.usage.prompt_tokens ?? 0;
              tokensOut = parsed.usage.completion_tokens ?? 0;
            }
          } catch {
            // Ignore — partial JSON or non-data line.
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
    return { tokensIn, tokensOut, latencyMs: Date.now() - startedAt };
  })();

  return { stream: forClient, finalize: () => finalizePromise };
}
