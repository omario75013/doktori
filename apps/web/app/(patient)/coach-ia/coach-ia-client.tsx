/**
 * Coach IA patient chat UI.
 *
 * Behaviour:
 * - Mandatory disclaimer modal on first visit (cached in localStorage).
 * - Permanent SAMU 190/198 button in header — tap-to-call on mobile.
 * - Streams responses from /api/coach-ia (OpenAI-compatible SSE).
 * - Specialty CTAs rendered after each assistant message.
 * - No persistence: each page reload starts a fresh session.
 *
 * Flagged OFF in production until physician + legal review of the system
 * prompt and disclaimer text. The page wrapper checks `coach_ia_enabled`
 * before rendering this component.
 */
"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { SPECIALTIES } from "@doktori/shared";
import { DisclaimerModal } from "./disclaimer-modal";

const DISCLAIMER_LS_KEY = "coach_ia_disclaimer_accepted";

type ChatRole = "user" | "assistant";

interface ChatMessage {
  role: ChatRole;
  content: string;
  /** Specialty IDs detected in the message (assistant only). */
  specialties?: string[];
}

/**
 * Find the specialty IDs mentioned in a piece of text. Matches on:
 *   - the canonical id (e.g. "cardiologue")
 *   - the human label (e.g. "Cardiologue")
 *
 * Word-boundary aware so "psy" alone does NOT match "psychiatre" / "psychologue".
 * Case-insensitive. Returns unique IDs in encounter order.
 */
function detectSpecialties(text: string): string[] {
  if (!text) return [];
  const found = new Set<string>();
  const ordered: string[] = [];
  for (const s of SPECIALTIES) {
    // Build a regex per specialty — escape regex chars in the label.
    const tokens = [s.id, s.label].map((t) =>
      t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    );
    const pattern = new RegExp(`(?<![\\p{L}\\p{N}-])(?:${tokens.join("|")})(?![\\p{L}\\p{N}-])`, "iu");
    if (pattern.test(text) && !found.has(s.id)) {
      found.add(s.id);
      ordered.push(s.id);
    }
  }
  return ordered;
}

function specialtyLabel(id: string): string {
  return SPECIALTIES.find((s) => s.id === id)?.label ?? id;
}

function errorForStatus(status: number): string {
  switch (status) {
    case 401:
      return "Session expirée — reconnectez-vous";
    case 403:
      return "Service non disponible";
    case 429:
      return "Limite atteinte (10 messages/24h ou cap de coût). Réessayez plus tard.";
    case 503:
      return "Service indisponible — réessayez plus tard";
    default:
      return "Erreur";
  }
}

interface CoachIaClientProps {
  /**
   * Admin-curated disclaimer HTML, resolved server-side from
   * `coach_ia.disclaimer_html` and passed through here so the modal
   * renders the configured wording without an extra fetch.
   */
  disclaimerHtml: string;
}

export function CoachIaClient({ disclaimerHtml }: CoachIaClientProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState<boolean | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Read disclaimer state from localStorage on mount.
  useEffect(() => {
    try {
      const v = window.localStorage.getItem(DISCLAIMER_LS_KEY);
      setDisclaimerAccepted(v === "true");
    } catch {
      // localStorage may be disabled (private mode etc.) — show modal anyway.
      setDisclaimerAccepted(false);
    }
  }, []);

  // Auto-scroll on new message.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Auto-size textarea (2-6 rows).
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    const lineHeight = 24;
    const minH = lineHeight * 2;
    const maxH = lineHeight * 6;
    ta.style.height = `${Math.min(maxH, Math.max(minH, ta.scrollHeight))}px`;
  }, [input]);

  function handleAccept() {
    try {
      window.localStorage.setItem(DISCLAIMER_LS_KEY, "true");
    } catch {
      // ignore — accepting in-session still works
    }
    setDisclaimerAccepted(true);
  }

  function handleCancel() {
    router.push("/");
  }

  function showDisclaimerAgain() {
    try {
      window.localStorage.removeItem(DISCLAIMER_LS_KEY);
    } catch {
      // ignore
    }
    setDisclaimerAccepted(false);
  }

  async function sendMessage() {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMessage = { role: "user", content: trimmed };
    const baseHistory = [...messages, userMsg];

    setMessages(baseHistory);
    setInput("");
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/coach-ia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: baseHistory.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!res.ok) {
        let serverMsg = "";
        try {
          const data = await res.json();
          serverMsg = typeof data?.error === "string" ? data.error : "";
        } catch {
          // ignore JSON parse failures
        }
        setError(serverMsg || errorForStatus(res.status));
        setLoading(false);
        return;
      }

      if (!res.body) {
        setError("Erreur");
        setLoading(false);
        return;
      }

      // Append a fresh empty assistant message we'll fill as deltas arrive.
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistantContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const rawLine of lines) {
          const line = rawLine.trim();
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          try {
            const parsed = JSON.parse(payload);
            const delta: string | undefined = parsed?.choices?.[0]?.delta?.content;
            if (typeof delta === "string" && delta.length > 0) {
              assistantContent += delta;
              setMessages((prev) => {
                const next = [...prev];
                const last = next[next.length - 1];
                if (last && last.role === "assistant") {
                  next[next.length - 1] = {
                    ...last,
                    content: assistantContent,
                  };
                }
                return next;
              });
            }
          } catch {
            // Ignore — partial JSON or non-data line.
          }
        }
      }

      // Stream done — compute specialty CTAs once on the final content.
      const specialties = detectSpecialties(assistantContent);
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last && last.role === "assistant") {
          next[next.length - 1] = {
            ...last,
            content: assistantContent,
            specialties,
          };
        }
        return next;
      });
    } catch (e) {
      console.warn("[coach-ia] send failed:", e);
      setError("Erreur réseau — réessayez");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void sendMessage();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  }

  // ─── Render gates ───────────────────────────────────────────────────────────
  if (disclaimerAccepted === null) {
    // Reading localStorage — render nothing to avoid flicker.
    return null;
  }

  if (disclaimerAccepted === false) {
    return (
      <DisclaimerModal
        onAccept={handleAccept}
        onCancel={handleCancel}
        disclaimerHtml={disclaimerHtml}
      />
    );
  }

  // ─── Chat UI ─────────────────────────────────────────────────────────────────
  const lastMessage = messages[messages.length - 1];
  const showTypingIndicator = loading && lastMessage?.role === "user";

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-h-[calc(100vh-4rem)] mx-auto max-w-3xl">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex flex-col">
          <h1 className="text-base font-semibold text-foreground">Coach IA</h1>
          <p className="text-xs text-gray-500">
            Pas un avis médical — consultez un médecin pour tout diagnostic.
          </p>
        </div>
        <a
          href="tel:190"
          className="rounded-xl bg-red-600 text-white px-3 py-2 text-sm font-medium hover:bg-red-700 whitespace-nowrap"
        >
          🚨 Urgence : 190 / 198
        </a>
      </header>

      {/* Message thread */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-gray-50">
        {messages.length === 0 && (
          <div className="text-center text-sm text-gray-500 mt-8">
            Décrivez vos symptômes — je vous oriente vers la spécialité
            adaptée.
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div className="flex flex-col max-w-[80%]">
              <div
                className={
                  msg.role === "user"
                    ? "bg-foreground text-white rounded-2xl px-4 py-2 whitespace-pre-wrap"
                    : "bg-gray-100 text-gray-900 rounded-2xl px-4 py-2 whitespace-pre-wrap"
                }
              >
                {msg.content || (msg.role === "assistant" && loading ? "…" : "")}
              </div>
              {msg.role === "assistant" && msg.specialties && msg.specialties.length > 0 && (
                <div className="mt-2 flex flex-wrap">
                  {msg.specialties.map((id) => (
                    <Link
                      key={id}
                      href={`/recherche?specialty=${id}`}
                      className="inline-block mr-2 mt-1 rounded-full bg-blue-100 text-blue-700 px-3 py-1 text-xs hover:bg-blue-200"
                    >
                      Prendre RDV avec un {specialtyLabel(id)}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {showTypingIndicator && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-2xl px-4 py-3">
              <div className="flex gap-1">
                <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.3s]" />
                <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.15s]" />
                <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce" />
              </div>
            </div>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm"
          >
            {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input row */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-gray-200 bg-white px-4 py-3"
      >
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            rows={2}
            placeholder="Décrivez vos symptômes…"
            className="flex-1 resize-none rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50"
            aria-label="Message"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="rounded-xl bg-foreground text-white px-4 py-2 text-sm font-medium hover:bg-foreground/90 disabled:opacity-50 flex items-center gap-1"
            aria-label="Envoyer"
          >
            <Send className="h-4 w-4" />
            <span className="hidden sm:inline">Envoyer</span>
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-500 text-center">
          Coach IA — Pas un avis médical —{" "}
          <button
            type="button"
            onClick={showDisclaimerAgain}
            className="underline hover:text-gray-700"
          >
            Lire le disclaimer
          </button>
        </p>
      </form>
    </div>
  );
}
