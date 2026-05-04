"use client";

import { useState, useEffect, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { Send, ArrowLeft } from "lucide-react";

interface Message {
  id: string;
  conversationId: string;
  senderType: "doctor" | "patient";
  senderId: string;
  content: string;
  readAt: string | null;
  createdAt: string;
}

export default function PatientConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = use(params);
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [doctorName, setDoctorName] = useState<string>("Médecin");
  const [doctorStatus, setDoctorStatus] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("doktori_patient_token");
    if (!stored) {
      router.push("/mes-rdv");
      return;
    }
    setToken(stored);
  }, [router]);

  useEffect(() => {
    if (!token) return;
    // Fetch conversation info to get doctor name + status
    fetch("/api/conversations", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.ok ? r.json() : [])
      .then((convs: Array<{ id: string; doctorName?: string; doctorId?: string }>) => {
        const conv = convs.find((c) => c.id === conversationId);
        if (conv?.doctorName) setDoctorName(conv.doctorName);
        if (conv?.doctorId) {
          fetch(`/api/doctors/${conv.doctorId}/status`)
            .then((r) => r.ok ? r.json() : null)
            .then((s: { statusMessage: string | null; isActive: boolean } | null) => {
              if (s?.isActive && s.statusMessage) setDoctorStatus(s.statusMessage);
            })
            .catch(() => null);
        }
      })
      .catch(() => null);
  }, [token, conversationId]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetch(`/api/conversations/${conversationId}/messages`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (r.status === 401) {
          localStorage.removeItem("doktori_patient_token");
          router.push("/mes-rdv");
          return [];
        }
        return r.json();
      })
      .then((data) => {
        if (Array.isArray(data)) setMessages(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [token, conversationId, router]);

  // Mark doctor messages as read on mount
  useEffect(() => {
    if (!token || messages.length === 0) return;
    const unread = messages.filter((m) => m.senderType === "doctor" && !m.readAt);
    unread.forEach((m) => {
      fetch(`/api/messages/${m.id}/read`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    });
  }, [token, messages]);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !input.trim() || sending) return;

    setSending(true);
    const content = input.trim();
    setInput("");

    // Optimistically append the message
    const tempId = `temp-${Date.now()}`;
    const tempMsg: Message = {
      id: tempId,
      conversationId,
      senderType: "patient",
      senderId: "",
      content,
      readAt: null,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);

    try {
      // We need doctorId — get it from existing messages or conversation list
      // The API requires doctorId, so we POST to /api/messages with conversationId flow
      // Actually we need doctorId for the patient-send endpoint.
      // Fetch conversation info to get doctorId
      const convRes = await fetch("/api/conversations", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!convRes.ok) throw new Error("fetch conversations failed");
      const convList = await convRes.json();
      const conv = convList.find((c: { id: string }) => c.id === conversationId);
      if (!conv) throw new Error("conversation not found");

      const res = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ doctorId: conv.doctorId, content }),
      });

      if (!res.ok) throw new Error("send failed");
      const data = await res.json();
      // Replace temp message with real one
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? data.message : m))
      );
    } catch {
      // Remove temp message on failure, restore input
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setInput(content);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col h-screen max-h-screen bg-secondary">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 flex-shrink-0">
        <button
          onClick={() => router.push("/messagerie")}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <p className="font-semibold text-gray-900 text-sm">{doctorName}</p>
          {doctorStatus ? (
            <p className="text-xs text-amber-600 italic">{doctorStatus}</p>
          ) : (
            <p className="text-xs text-teal-600">Médecin</p>
          )}
        </div>
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
            const isPatient = msg.senderType === "patient";
            return (
              <div
                key={msg.id}
                className={`flex ${isPatient ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                    isPatient
                      ? "bg-teal-600 text-white rounded-br-sm"
                      : "bg-white text-gray-900 rounded-bl-sm shadow-sm border border-gray-100"
                  }`}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                    {msg.content}
                  </p>
                  <p
                    className={`text-[10px] mt-1 ${
                      isPatient ? "text-teal-200" : "text-gray-400"
                    }`}
                  >
                    {new Date(msg.createdAt).toLocaleTimeString("fr-FR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
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
          className="flex-1 resize-none rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent max-h-32 overflow-y-auto"
          style={{ height: "auto" }}
        />
        <button
          type="submit"
          disabled={!input.trim() || sending}
          className="p-2.5 rounded-xl bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
