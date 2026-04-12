"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  MessageCircle,
  X,
  Send,
  Stethoscope,
  Sparkles,
  AlertTriangle,
  Loader2,
  CheckCircle,
} from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  metadata?: {
    type: "doctor_list" | "slots" | "booking_confirmation" | "patient_greeting";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any;
  };
}

export function Chatbot() {
  const t = useTranslations("chatbot");
  const locale = useLocale();
  const QUICK_REPLIES = useMemo(
    () => [
      t("quickReply1"),
      t("quickReply2"),
      t("quickReply3"),
      t("quickReply4"),
    ],
    [t]
  );
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(() => [
    { role: "assistant", content: t("welcome") },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;

    const userMessage: Message = { role: "user", content: text };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale,
          // Skip welcome message when sending to API
          messages: newMessages
            .slice(1)
            .map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: err.error || t("errorGeneric"),
          },
        ]);
        return;
      }

      const data = await res.json();
      const assistantMsg: Message = { role: "assistant", content: data.content };
      if (data.metadata) assistantMsg.metadata = data.metadata;
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: t("errorNetwork"),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Floating toggle button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="group fixed bottom-6 right-6 z-40 flex h-16 w-16 items-center justify-center rounded-full bg-[#0891B2] text-white shadow-xl shadow-[#0891B2]/30 transition-all hover:scale-110 hover:bg-[#0E7490] sm:bottom-8 sm:right-8"
          aria-label={t("openAriaLabel")}
        >
          <MessageCircle className="h-7 w-7" strokeWidth={2.5} />
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#22C55E] opacity-75"></span>
            <span className="relative inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#22C55E] text-[10px] font-bold text-[#134E4A] ring-2 ring-white">
              !
            </span>
          </span>
          {/* Tooltip */}
          <span className="absolute right-full top-1/2 mr-3 hidden -translate-y-1/2 whitespace-nowrap rounded-lg bg-[#134E4A] px-3 py-1.5 text-xs font-semibold text-white shadow-lg group-hover:block">
            {t("tooltip")}
            <span className="absolute left-full top-1/2 -translate-y-1/2 border-4 border-transparent border-l-[#134E4A]"></span>
          </span>
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed inset-x-0 bottom-0 z-50 flex h-full w-full flex-col bg-white shadow-2xl sm:inset-auto sm:bottom-6 sm:right-6 sm:h-[640px] sm:w-[400px] sm:rounded-3xl sm:border sm:border-[#E6F4F1]">
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between bg-gradient-to-br from-[#0891B2] to-[#0E7490] px-5 py-4 sm:rounded-t-3xl">
            <div className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20">
                <Stethoscope className="h-5 w-5 text-white" strokeWidth={2.5} />
                <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#22C55E]"></span>
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#22C55E] ring-2 ring-[#0891B2]"></span>
                </span>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-heading text-base font-bold text-white">{t("headerName")}</span>
                  <Sparkles className="h-3 w-3 text-[#A7F3D0]" strokeWidth={2.5} />
                </div>
                <div className="text-[11px] text-[#A7F3D0]">{t("headerStatus")}</div>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-white/80 transition-colors hover:bg-white/10 hover:text-white"
              aria-label={t("closeAriaLabel")}
            >
              <X className="h-5 w-5" strokeWidth={2.5} />
            </button>
          </div>

          {/* Disclaimer banner */}
          <div className="flex shrink-0 items-start gap-2 border-b border-yellow-100 bg-yellow-50 px-4 py-2">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-yellow-600" strokeWidth={2.5} />
            <p
              className="text-[10px] leading-tight text-yellow-800"
              dangerouslySetInnerHTML={{ __html: t.raw("disclaimer") as string }}
            />
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto bg-[#F0FDFA]/30 p-4">
            <div className="space-y-4">
              {messages.map((msg, i) => (
                <MessageBubble key={i} message={msg} onSend={sendMessage} />
              ))}
              {loading && (
                <div className="flex items-center gap-2 text-xs text-[#5E7574]">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0891B2] text-white">
                    <Stethoscope className="h-4 w-4" strokeWidth={2.5} />
                  </div>
                  <Loader2 className="h-4 w-4 animate-spin text-[#0891B2]" />
                  <span>{t("thinking")}</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Quick replies (only on first message) */}
          {messages.length === 1 && !loading && (
            <div className="shrink-0 border-t border-[#E6F4F1] bg-white px-4 py-3">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#5E7574]">
                {t("suggestionsLabel")}
              </p>
              <div className="flex flex-wrap gap-2">
                {QUICK_REPLIES.map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="rounded-full border border-[#E6F4F1] bg-[#F0FDFA] px-3 py-1.5 text-xs font-semibold text-[#0E7490] transition-all hover:border-[#0891B2] hover:bg-[#0891B2] hover:text-white"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(input);
            }}
            className="shrink-0 border-t border-[#E6F4F1] bg-white p-4 sm:rounded-b-3xl"
          >
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t("inputPlaceholder")}
                disabled={loading}
                className="h-12 flex-1 rounded-xl border-2 border-[#E6F4F1] bg-[#F0FDFA]/50 px-4 text-sm text-[#134E4A] placeholder:text-[#5E7574]/60 outline-none transition-colors focus:border-[#0891B2] focus:bg-white disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#0891B2] text-white transition-all hover:bg-[#0E7490] disabled:opacity-40"
                aria-label={t("sendAriaLabel")}
              >
                <Send className="h-5 w-5" strokeWidth={2.5} />
              </button>
            </div>
            <p className="mt-2 text-center text-[9px] text-[#5E7574]">{t("footer")}</p>
          </form>
        </div>
      )}
    </>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Message bubble with basic markdown (bold + newlines) + rich metadata widgets
// ──────────────────────────────────────────────────────────────────────────────
function MessageBubble({ message, onSend }: { message: Message; onSend: (text: string) => void }) {
  const isUser = message.role === "user";
  const html = simpleMarkdown(message.content);
  const { metadata } = message;

  return (
    <div className={`flex items-start gap-2 ${isUser ? "flex-row-reverse" : ""}`}>
      {!isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0891B2] text-white ring-1 ring-[#0891B2]/20">
          <Stethoscope className="h-4 w-4" strokeWidth={2.5} />
        </div>
      )}
      <div className="max-w-[80%]">
        {/* Patient greeting badge */}
        {!isUser && metadata?.type === "patient_greeting" && (
          <div className="text-xs text-teal-600 font-medium mb-1">
            👋 Bienvenue {metadata.data.name} !
          </div>
        )}

        <div
          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
            isUser
              ? "rounded-br-sm bg-[#0891B2] text-white"
              : "rounded-bl-sm bg-white text-[#134E4A] shadow-sm ring-1 ring-[#E6F4F1]"
          }`}
          dangerouslySetInnerHTML={{ __html: html }}
        />

        {/* Doctor chips */}
        {!isUser && metadata?.type === "doctor_list" && Array.isArray(metadata.data?.doctors) && metadata.data.doctors.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {metadata.data.doctors.map((d: { id: string; name: string }) => (
              <button
                key={d.id}
                onClick={() => onSend(`Je choisis ${d.name}`)}
                className="px-3 py-1.5 rounded-full border border-teal-200 bg-teal-50 text-xs font-medium text-teal-700 hover:bg-teal-100 transition-colors"
              >
                {d.name}
              </button>
            ))}
          </div>
        )}

        {/* Slot picker */}
        {!isUser && metadata?.type === "slots" && Array.isArray(metadata.data?.slots) && metadata.data.slots.length > 0 && (
          <div className="flex gap-2 overflow-x-auto mt-2 pb-1">
            {metadata.data.slots.map((s: { startTime: string }) => (
              <button
                key={s.startTime}
                onClick={() => onSend(`Je choisis ${s.startTime}`)}
                className="shrink-0 px-3 py-2 rounded-lg border border-teal-200 bg-white text-sm font-medium text-teal-700 hover:bg-teal-50 transition-colors"
              >
                {s.startTime}
              </button>
            ))}
          </div>
        )}

        {/* Booking confirmation card */}
        {!isUser && metadata?.type === "booking_confirmation" && metadata.data?.success && (
          <div className="mt-3 rounded-xl border border-green-200 bg-green-50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="font-bold text-green-800">RDV confirmé</span>
            </div>
            <div className="text-sm text-green-700 space-y-1">
              <p><strong>{metadata.data.doctorName}</strong></p>
              <p>{metadata.data.date} à {metadata.data.time}</p>
              <p>{metadata.data.address}</p>
            </div>
            <a href="/mes-rdv" className="mt-3 inline-block text-sm font-medium text-teal-600 hover:underline">
              Voir mes rendez-vous →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

// Minimal, safe markdown subset: **bold**, line breaks, bullet lists
function simpleMarkdown(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/^[•\-] (.+)$/gm, '<div class="flex gap-1.5"><span>•</span><span>$1</span></div>')
    .replace(/\n/g, "<br/>");
}
