"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  FlaskConical, MessageSquare, Plus, Send, Paperclip, Loader2, X, Search
} from "lucide-react";

type Conversation = {
  id: string;
  subject: string | null;
  lastMessagePreview: string | null;
  lastMessageAt: string;
  unreadCountCounterpart: number;
  labId: string;
  lab: { id: string; name: string } | null;
};

type Message = {
  id: string;
  senderType: string;
  senderId: string;
  body: string | null;
  attachmentUrl: string | null;
  attachmentName: string | null;
  createdAt: string;
};

function timeAgo(iso: string) {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "maintenant";
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return d.toLocaleDateString("fr-TN", { day: "numeric", month: "short" });
}

export default function MedecinLabosPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [composerText, setComposerText] = useState("");
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState("");
  const [showNewModal, setShowNewModal] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async () => {
    const res = await fetch("/api/medecin/lab-conversations");
    if (res.ok) {
      const d = await res.json() as { conversations: Conversation[] };
      setConversations(d.conversations);
    }
    setLoadingConvs(false);
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  async function openConversation(conv: Conversation) {
    setActiveId(conv.id);
    setActiveConv(conv);
    setLoadingMsgs(true);
    const res = await fetch(`/api/medecin/lab-conversations/${conv.id}`);
    if (res.ok) {
      const d = await res.json() as { messages: Message[] };
      setMessages(d.messages);
      await fetch(`/api/medecin/lab-conversations/${conv.id}/read`, { method: "POST" });
    }
    setLoadingMsgs(false);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!activeId || !composerText.trim()) return;
    setSending(true);
    const res = await fetch(`/api/medecin/lab-conversations/${activeId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: composerText.trim() }),
    });
    if (res.ok) {
      const d = await res.json() as { message: Message };
      setMessages((ms) => [...ms, d.message]);
      setComposerText("");
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
    setSending(false);
  }

  const filtered = conversations.filter(
    (c) => !filter || (c.lab?.name ?? "").toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden rounded-2xl border border-border bg-white">
      {/* Left */}
      <div className="w-72 flex flex-col border-r border-border shrink-0">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-black text-foreground flex items-center gap-1.5">
              <FlaskConical className="h-4 w-4 text-green-600" strokeWidth={2.5} />
              Labos
            </p>
            <button
              type="button"
              onClick={() => setShowNewModal(true)}
              className="h-7 w-7 rounded-lg bg-green-600 text-white flex items-center justify-center hover:bg-green-700"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
            </button>
          </div>
          <div className="flex h-9 items-center rounded-xl border border-border px-2.5 focus-within:border-green-400 bg-gray-50">
            <Search className="h-3.5 w-3.5 text-muted-foreground mr-1.5 shrink-0" strokeWidth={2} />
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filtrer…"
              className="flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground/60"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loadingConvs ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-green-600" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">Aucune conversation.</p>
          ) : (
            filtered.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => openConversation(c)}
                className={[
                  "w-full text-left px-4 py-3.5 border-b border-border hover:bg-gray-50 transition-colors",
                  activeId === c.id ? "bg-green-50 border-l-2 border-l-green-500" : "",
                ].join(" ")}
              >
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <span className="text-xs font-semibold text-foreground truncate">{c.lab?.name ?? "Labo"}</span>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">{timeAgo(c.lastMessageAt)}</span>
                </div>
                <p className="text-xs text-muted-foreground truncate">{c.lastMessagePreview ?? c.subject ?? "…"}</p>
                {c.unreadCountCounterpart > 0 && (
                  <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 mt-1 rounded-full bg-green-600 text-white text-[9px] font-bold">
                    {c.unreadCountCounterpart}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right */}
      {activeConv ? (
        <div className="flex-1 flex flex-col min-w-0">
          <div className="px-5 py-3.5 border-b border-border bg-gray-50 flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-green-600 shrink-0" strokeWidth={2.5} />
            <p className="text-sm font-bold text-foreground">{activeConv.lab?.name ?? "Labo"}</p>
            {activeConv.subject && <span className="text-xs text-muted-foreground">· {activeConv.subject}</span>}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loadingMsgs ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-green-600" />
              </div>
            ) : messages.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">Aucun message.</p>
            ) : (
              messages.map((msg) => {
                const isDoctor = msg.senderType === "doctor";
                return (
                  <div key={msg.id} className={`flex ${isDoctor ? "justify-end" : "justify-start"}`}>
                    <div className={[
                      "max-w-sm rounded-2xl px-4 py-2.5 text-sm",
                      isDoctor ? "bg-blue-600 text-white rounded-br-sm" : "bg-gray-100 text-foreground rounded-bl-sm",
                    ].join(" ")}>
                      {msg.body && <p className="whitespace-pre-wrap">{msg.body}</p>}
                      {msg.attachmentUrl && (
                        <a
                          href={msg.attachmentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex items-center gap-1.5 text-xs font-semibold underline mt-1 ${isDoctor ? "text-blue-100" : "text-green-700"}`}
                        >
                          <Paperclip className="h-3 w-3 shrink-0" strokeWidth={2.5} />
                          {msg.attachmentName ?? "Pièce jointe"}
                        </a>
                      )}
                      <p className={`text-[10px] mt-1 ${isDoctor ? "text-blue-200" : "text-muted-foreground"}`}>{timeAgo(msg.createdAt)}</p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={handleSend} className="px-4 py-3 border-t border-border bg-white flex items-end gap-2">
            <input
              type="file"
              ref={fileRef}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={sending}
              className="h-9 w-9 shrink-0 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              <Paperclip className="h-4 w-4" strokeWidth={2.5} />
            </button>
            <textarea
              value={composerText}
              onChange={(e) => setComposerText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(e as unknown as React.FormEvent); }
              }}
              rows={1}
              placeholder="Écrire un message…"
              className="flex-1 resize-none rounded-xl border-2 border-border bg-white px-3 py-2 text-sm text-foreground outline-none focus:border-blue-500 leading-tight"
            />
            <button
              type="submit"
              disabled={sending || !composerText.trim()}
              className="h-9 w-9 shrink-0 rounded-xl bg-blue-600 flex items-center justify-center text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" strokeWidth={2.5} />}
            </button>
          </form>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <p className="text-sm">Sélectionnez une conversation avec un laboratoire</p>
        </div>
      )}

      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl border border-border p-6 w-full max-w-sm space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <p className="text-sm font-black text-foreground">Contacter un laboratoire</p>
              <button type="button" onClick={() => setShowNewModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" strokeWidth={2.5} />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Saisissez l&apos;ID du laboratoire. Dans une future version, vous pourrez le chercher par nom.
            </p>
            <NewConversationForm
              onCreated={(id) => {
                setShowNewModal(false);
                loadConversations();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function NewConversationForm({ onCreated }: { onCreated: (id: string) => void }) {
  const [labId, setLabId] = useState("");
  const [subject, setSubject] = useState("");
  const [creating, setCreating] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!labId.trim()) return;
    setCreating(true);
    const res = await fetch("/api/medecin/lab-conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ labId: labId.trim(), subject: subject || undefined }),
    });
    if (res.ok) {
      const d = await res.json() as { conversationId: string };
      onCreated(d.conversationId);
    }
    setCreating(false);
  }

  return (
    <form onSubmit={handleCreate} className="space-y-3">
      <input
        type="text"
        value={labId}
        onChange={(e) => setLabId(e.target.value)}
        placeholder="UUID du laboratoire"
        className="h-10 w-full rounded-xl border-2 border-border bg-white px-3 text-sm outline-none focus:border-green-500"
      />
      <input
        type="text"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        placeholder="Sujet (optionnel)"
        className="h-10 w-full rounded-xl border-2 border-border bg-white px-3 text-sm outline-none focus:border-green-500"
      />
      <button
        type="submit"
        disabled={creating || !labId.trim()}
        className="w-full h-10 rounded-xl bg-green-600 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-60 inline-flex items-center justify-center gap-2"
      >
        {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Démarrer la conversation
      </button>
    </form>
  );
}
