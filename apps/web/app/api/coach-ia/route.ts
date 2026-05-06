import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isEnabled } from "@/lib/feature-flags";
import { requireAuth } from "@/lib/require-auth";
import {
  buildSystemPrompt,
  checkCostCap,
  checkGlobalRateLimit,
  checkRateLimit,
  estimateCost,
  recordUsage,
  streamCompletion,
} from "@/lib/coach-ia";

// Streaming → opt out of static rendering / aggressive caching.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_MESSAGE_CHARS = 2000;
const MAX_HISTORY = 20;

const requestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1),
      })
    )
    .min(1)
    .max(MAX_HISTORY)
    // Last message must be from the patient — Kimi answers it.
    .refine((arr) => arr[arr.length - 1].role === "user", {
      message: "Le dernier message doit provenir du patient",
    }),
});

function jsonError(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

export async function POST(req: NextRequest) {
  try {
    // 1. Auth — must be a logged-in patient.
    const user = await requireAuth(req);
    if (!user || user.role !== "patient") {
      return jsonError(401, "Non autorisé");
    }

    // 2. Feature flag — fails closed.
    if (!(await isEnabled("coach_ia_enabled"))) {
      return jsonError(403, "Feature unavailable");
    }

    // 3. Body validation.
    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return jsonError(400, "Corps invalide");
    }
    const parsed = requestSchema.safeParse(raw);
    if (!parsed.success) {
      return jsonError(400, "Paramètres invalides");
    }

    // 4. Truncate over-long content (don't fail — just slice).
    const messages = parsed.data.messages.map((m) => ({
      role: m.role,
      content:
        m.content.length > MAX_MESSAGE_CHARS
          ? m.content.slice(0, MAX_MESSAGE_CHARS)
          : m.content,
    }));

    // 5. Per-patient rate limit.
    if (!(await checkRateLimit(user.id))) {
      return jsonError(429, "Rate limit: 10 messages/24h");
    }

    // 6. Global rate limit.
    if (!(await checkGlobalRateLimit())) {
      return jsonError(429, "Service temporarily unavailable due to load");
    }

    // 7. Daily cost cap.
    if (!(await checkCostCap())) {
      return jsonError(429, "Daily cost cap reached");
    }

    // 8. Prepend the system prompt and call Kimi.
    const promptedMessages = [
      { role: "system" as const, content: buildSystemPrompt() },
      ...messages,
    ];

    const { stream, finalize } = await streamCompletion({
      messages: promptedMessages,
    });

    // 9. Hook into stream lifecycle: when the upstream stream terminates,
    //    `finalize()` resolves with token counts + latency. We record usage
    //    in a TransformStream `flush` hook so we capture the close even if
    //    the client disconnects mid-stream (the upstream still drains).
    const recordOnClose = new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        controller.enqueue(chunk);
      },
      async flush() {
        try {
          const { tokensIn, tokensOut, latencyMs } = await finalize();
          await recordUsage({
            patientId: user.id,
            eventType: "message",
            tokensIn,
            tokensOut,
            costUsd: estimateCost(tokensIn, tokensOut),
            latencyMs,
          });
        } catch (e) {
          console.error("[POST /api/coach-ia] finalize error:", e);
          await recordUsage({
            patientId: user.id,
            eventType: "message",
            error: e instanceof Error ? e.message : String(e),
          });
        }
      },
    });

    const piped = stream.pipeThrough(recordOnClose);

    return new Response(piped, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (e) {
    console.error("[POST /api/coach-ia]", e);
    // Best-effort log of the failure event (no patientId scope at this point
    // is acceptable since we may not have authed; we attach what we have).
    try {
      const user = await requireAuth(req).catch(() => null);
      await recordUsage({
        patientId: user?.id ?? null,
        eventType: "message",
        error: e instanceof Error ? e.message : String(e),
      });
    } catch {
      // swallow — never let logging break the error response
    }
    return jsonError(503, "Service indisponible — réessayez plus tard");
  }
}
