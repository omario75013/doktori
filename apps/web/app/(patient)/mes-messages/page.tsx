"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MessageCircle, Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface Conversation {
  id: string;
  status: string;
  lastMessageAt: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialty: string;
  doctorPhotoUrl: string | null;
}

interface Message {
  id: string;
  conversationId: string;
  senderType: "doctor" | "patient";
  senderId: string;
  content: string;
  readAt: string | null;
  createdAt: string;
}

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function PatientMessagesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load token from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("doktori_patient_token");
    if (!stored) {
      router.push("/mes-rdv");
      return;
    }
    setToken(stored);
  }, [router]);

  // Load conversation list
  const loadConversations = useCallback(
    async (tok: string) => {
      try {
        const r = await fetch("/api/messages/conversations", {
          headers: { Authorization: `Bearer ${tok}` },
        });
        if (r.status === 401) {
          localStorage.removeItem("doktori_patient_token");
          router.push("/mes-rdv");
          return;
        }
        if (r.ok) {
          const data = await r.json();
          setConversations(Array.isArray(data) ? data : []);
        }
      } catch {
        // ignore
      } finally {
        setLoadingConvs(false);
      }
    },
    [router]
  );

  useEffect(() => {
    if (!token) return;
    loadConversations(token);
  }, [token, loadConversations]);

  // Auto-select conversation if doctorId is passed via query param
  useEffect(() => {
    const doctorId = searchParams.get("doctorId");
    if (!token || !doctorId) return;

    // Create or retrieve conversation with this doctor, then select it
    fetch("/api/messages/conversations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ doctorId }),
    })
      .then((r) => r.json())
      .then((conv) => {
        if (conv?.id) {
          setSelectedId(conv.id);
          // Refresh conversation list to include the new one
          loadConversations(token);
        }
      })
      .catch(() => {});
  }, [token, searchParams, loadConversations]);

  // Load messages for selected conversation
  const loadMessages = useCallback(
    async (convId: string, tok: string) => {
      setLoadingMsgs(true);
      try {
        const r = await fetch(`/api/messages/${convId}`, {
          headers: { Authorization: `Bearer ${tok}` },
        });
        if (r.ok) {
          const data = await r.json();
          if (Array.isArray(data)) setMessages(data);
        }
      } catch {
        // ignore
      } finally {
        setLoadingMsgs(false);
      }
    },
    []
  );

  // Poll messages every 10s
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (!selectedId || !token) return;

    loadMessages(selectedId, token);

    pollRef.current = setInterval(() => {
      loadMessages(selectedId, token);
    }, 10_000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [selectedId, token, loadMessages]);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function selectConversation(id: string) {
    setSelectedId(id);
    setMessages([]);
    setInput("");
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId || !token || !input.trim() || sending) return;

    const content = input.trim();
    setSending(true);
    setInput("");

    const tempId = `temp-${Date.now()}`;
    const tempMsg: Message = {
      id: tempId,
      conversationId: selectedId,
      senderType: "patient",
      senderId: "",
      content,
      readAt: null,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);

    try {
      const res = await fetch(`/api/messages/${selectedId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("send failed");
      const data = await res.json();
      setMessages((prev) => prev.map((m) => (m.id === tempId ? data.message : m)));
      loadConversations(token);
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setInput(content);
    } finally {
      setSending(false);
    }
  }

  const selected = conversations.find((c) => c.id === selectedId) ?? null;

  if (!token) return null;

  return (
    <div className="flex h-[calc(100vh-2rem)] bg-white rounded-xl border border-gray-100 overflow-hidden">
      {/* Left panel — conversation list */}
      <div className="w-[350px] flex-shrink-0 flex flex-col border-r border-gray-100">
        <div className="px-4 py-4 border-b border-gray-100 flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-teal-600" />
          <h1 className="text-lg font-bold text-gray-900">Messages</h1>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingConvs ? (
            <p className="text-sm text-gray-400 text-center py-8">Chargement...</p>
          ) : conversations.length === 0 ? (
            <div className="text-center py-12 px-4">
              <MessageCircle className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-500 font-medium">Aucune conversation</p>
              <p className="text-xs text-gray-400 mt-1">
                Vous pouvez contacter un médecin depuis vos rendez-vous
              </p>
            </div>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => selectConversation(conv.id)}
                className={`w-full text-left px-4 py-3 flex items-center gap-3 border-b border-gray-50 transition-colors ${
                  selectedId === conv.id
                    ? "bg-teal-50 border-l-2 border-l-teal-500"
                    : "hover:bg-gray-50"
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-teal-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                  {initials(conv.doctorName)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-gray-900 text-sm truncate">
                      {conv.doctorName}
                    </p>
                    {conv.lastMessageAt && (
                      <span className="text-[11px] text-gray-400 flex-shrink-0">
                        {formatDistanceToNow(new Date(conv.lastMessageAt), {
                          addSuffix: false,
                          locale: fr,
                        })}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-teal-600 truncate">{conv.doctorSpecialty}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right panel — messages */}
      <div className="flex-1 flex flex-col bg-secondary min-w-0">
        {!selected ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageCircle className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Sélectionnez une conversation</p>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <header className="bg-white border-b border-gray-100 px-5 py-3 flex items-center gap-3 flex-shrink-0">
              <div className="w-9 h-9 rounded-full bg-teal-600 flex items-center justify-center text-white text-sm font-semibold">
                {initials(selected.doctorName)}
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">{selected.doctorName}</p>
                <p className="text-xs text-teal-600">{selected.doctorSpecialty}</p>
              </div>
            </header>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {loadingMsgs ? (
                <p className="text-center text-gray-400 text-sm py-8">Chargement...</p>
              ) : messages.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-8">
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
                        className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
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

            {/* Input bar */}
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
              />
              <button
                type="submit"
                disabled={!input.trim() || sending}
                className="p-2.5 rounded-xl bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
