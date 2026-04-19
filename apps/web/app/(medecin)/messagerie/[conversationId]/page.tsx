"use client";

import { useState, useEffect, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { Send, ArrowLeft, Archive } from "lucide-react";

interface Message {
  id: string;
  conversationId: string;
  senderType: "doctor" | "patient";
  senderId: string;
  content: string;
  readAt: string | null;
  createdAt: string;
}

interface ConversationMeta {
  id: string;
  status: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
}

export default function DoctorConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = use(params);
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [meta, setMeta] = useState<ConversationMeta | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load conversation meta + messages
  useEffect(() => {
    // Fetch conversation list to get metadata
    fetch("/api/doctor/conversations")
      .then((r) => r.json())
      .then((data: ConversationMeta[]) => {
        if (Array.isArray(data)) {
          const found = data.find((c) => c.id === conversationId);
          if (found) setMeta(found);
        }
      })
      .catch(() => {});

    fetch(`/api/doctor/conversations/${conversationId}/messages`)
      .then((r) => {
        if (r.status === 404) {
          router.push("/messagerie");
          return [];
        }
        return r.json();
      })
      .then((data) => {
        if (Array.isArray(data)) setMessages(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [conversationId, router]);

  // Mark patient messages as read on mount
  useEffect(() => {
    if (messages.length === 0) return;
    const unread = messages.filter((m) => m.senderType === "patient" && !m.readAt);
    unread.forEach((m) => {
      fetch(`/api/doctor/messages/${m.id}/read`, { method: "PATCH" }).catch(() => {});
    });
  }, [messages]);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!meta || !input.trim() || sending) return;

    setSending(true);
    const content = input.trim();
    setInput("");

    const tempId = `temp-${Date.now()}`;
    const tempMsg: Message = {
      id: tempId,
      conversationId,
      senderType: "doctor",
      senderId: "",
      content,
      readAt: null,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);

    try {
      const res = await fetch("/api/doctor/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId: meta.patientId, content }),
      });
      if (!res.ok) throw new Error("send failed");
      const data = await res.json();
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? data.message : m))
      );
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setInput(content);
    } finally {
      setSending(false);
    }
  }

  async function archiveConversation() {
    if (!confirm("Archiver cette conversation ?")) return;
    setArchiving(true);
    try {
      const res = await fetch(`/api/doctor/conversations/${conversationId}/archive`, {
        method: "POST",
      });
      if (res.ok) {
        router.push("/messagerie");
      }
    } finally {
      setArchiving(false);
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] bg-secondary rounded-xl overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 flex-shrink-0">
        <button
          onClick={() => router.push("/messagerie")}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <p className="font-semibold text-gray-900 text-sm">
            {meta?.patientName ?? "Patient"}
          </p>
          {meta?.patientPhone && (
            <p className="text-xs text-gray-500">{meta.patientPhone}</p>
          )}
        </div>
        {meta?.status !== "archived" && (
          <button
            onClick={archiveConversation}
            disabled={archiving}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <Archive className="w-3.5 h-3.5" />
            Archiver
          </button>
        )}
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {loading ? (
          <p className="text-center text-gray-400 py-8">Chargement...</p>
        ) : messages.length === 0 ? (
          <p className="text-center text-gray-400 py-8 text-sm">
            Aucun message. Commencez la conversation.
          </p>
        ) : (
          messages.map((msg) => {
            const isDoctor = msg.senderType === "doctor";
            return (
              <div
                key={msg.id}
                className={`flex ${isDoctor ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                    isDoctor
                      ? "bg-primary text-white rounded-br-sm"
                      : "bg-white text-gray-900 rounded-bl-sm shadow-sm border border-gray-100"
                  }`}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                    {msg.content}
                  </p>
                  <p
                    className={`text-[10px] mt-1 ${
                      isDoctor ? "text-sky-200" : "text-gray-400"
                    }`}
                  >
                    {new Date(msg.createdAt).toLocaleTimeString("fr-FR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {isDoctor && msg.readAt && (
                      <span className="ml-1 opacity-70">· Lu</span>
                    )}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={sendMessage}
        className="bg-white border-t border-gray-100 px-4 py-3 flex items-end gap-3 flex-shrink-0"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage(e as unknown as React.FormEvent);
            }
          }}
          placeholder="Écrire un message..."
          rows={1}
          className="flex-1 resize-none rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent max-h-32 overflow-y-auto"
        />
        <button
          type="submit"
          disabled={!input.trim() || sending}
          className="p-2.5 rounded-xl bg-primary text-white hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
