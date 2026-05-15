"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  MessageSquare, Plus, Search, Send, Paperclip, Loader2,
  FlaskConical, User, X
} from "lucide-react";

type Conversation = {
  id: string;
  subject: string | null;
  lastMessagePreview: string | null;
  lastMessageAt: string;
  unreadCountLab: number;
  counterpart: { kind: string; id: string; name: string } | null;
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

export default function LaboratoireMessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [composerText, setComposerText] = useState("");
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState("");
  const [showNewModal, setShowNewModal] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async () => {
    const res = await fetch("/api/laboratoire/conversations");
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
    const res = await fetch(`/api/laboratoire/conversations/${conv.id}`);
    if (res.ok) {
      const d = await res.json() as { messages: Message[] };
      setMessages(d.messages);
      // Mark as read
      await fetch(`/api/laboratoire/conversations/${conv.id}/read`, { method: "POST" });
      setConversations((cs) =>
        cs.map((c) => c.id === conv.id ? { ...c, unreadCountLab: 0 } : c)
      );
    }
    setLoadingMsgs(false);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!activeId || !composerText.trim()) return;
    setSending(true);
    const res = await fetch(`/api/laboratoire/conversations/${activeId}/messages`, {
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

  async function handleFileAttach(f: File) {
    if (!activeId) return;
    setSending(true);
    const fd = new FormData();
    fd.append("file", f);
    const upRes = await fetch("/api/laboratoire/upload", { method: "POST", body: fd });
    if (!upRes.ok) { setSending(false); return; }
    const fileData = await upRes.json() as { url: string; name: string; mime: string; size: number };
    const res = await fetch(`/api/laboratoire/conversations/${activeId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attachment: fileData }),
    });
    if (res.ok) {
      const d = await res.json() as { message: Message };
      setMessages((ms) => [...ms, d.message]);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
    setSending(false);
  }

  const filtered = conversations.filter((c) =>
    !filter || (c.counterpart?.name ?? "").toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden rounded-2xl border border-border bg-white">
      {/* Left panel — conversation list */}
      <div className="w-72 flex flex-col border-r border-border shrink-0">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-black text-foreground flex items-center gap-1.5">
              <MessageSquare className="h-4 w-4 text-green-600" strokeWidth={2.5} />
              Messages
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
              placeholder="Rechercher…"
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
                  <span className="flex items-center gap-1.5 min-w-0">
                    {c.counterpart?.kind === "lab" ? (
                      <FlaskConical className="h-3 w-3 text-green-600 shrink-0" strokeWidth={2.5} />
                    ) : (
                      <User className="h-3 w-3 text-blue-600 shrink-0" strokeWidth={2.5} />
                    )}
                    <span className="text-xs font-semibold text-foreground truncate">
                      {c.counterpart?.name ?? "—"}
                    </span>
                  </span>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
                    {timeAgo(c.lastMessageAt)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate">{c.lastMessagePreview ?? c.subject ?? "…"}</p>
                {c.unreadCountLab > 0 && (
                  <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 mt-1 rounded-full bg-green-600 text-white text-[9px] font-bold">
                    {c.unreadCountLab}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right panel — thread */}
      {activeConv ? (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Thread header */}
          <div className="px-5 py-3.5 border-b border-border bg-gray-50 flex items-center gap-2">
            {activeConv.counterpart?.kind === "lab" ? (
              <FlaskConical className="h-4 w-4 text-green-600 shrink-0" strokeWidth={2.5} />
            ) : (
              <User className="h-4 w-4 text-blue-600 shrink-0" strokeWidth={2.5} />
            )}
            <p className="text-sm font-bold text-foreground">{activeConv.counterpart?.name ?? "—"}</p>
            {activeConv.subject && (
              <span className="text-xs text-muted-foreground">· {activeConv.subject}</span>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loadingMsgs ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-green-600" />
              </div>
            ) : messages.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">Aucun message.</p>
            ) : (
              messages.map((msg) => {
                const isLab = msg.senderType === "lab";
                return (
                  <div key={msg.id} className={`flex ${isLab ? "justify-end" : "justify-start"}`}>
                    <div className={[
                      "max-w-sm rounded-2xl px-4 py-2.5 text-sm",
                      isLab
                        ? "bg-green-600 text-white rounded-br-sm"
                        : "bg-gray-100 text-foreground rounded-bl-sm",
                    ].join(" ")}>
                      {msg.body && <p className="whitespace-pre-wrap">{msg.body}</p>}
                      {msg.attachmentUrl && (
                        <a
                          href={msg.attachmentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex items-center gap-1.5 text-xs font-semibold underline mt-1 ${isLab ? "text-green-100" : "text-green-700"}`}
                        >
                          <Paperclip className="h-3 w-3 shrink-0" strokeWidth={2.5} />
                          {msg.attachmentName ?? "Pièce jointe"}
                        </a>
                      )}
                      <p className={`text-[10px] mt-1 ${isLab ? "text-green-200" : "text-muted-foreground"}`}>
                        {timeAgo(msg.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Composer */}
          <form onSubmit={handleSend} className="px-4 py-3 border-t border-border bg-white flex items-end gap-2">
            <input
              type="file"
              ref={fileRef}
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileAttach(f);
                if (fileRef.current) fileRef.current.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={sending}
              className="h-9 w-9 shrink-0 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-green-400 disabled:opacity-50 transition-colors"
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
              className="flex-1 resize-none rounded-xl border-2 border-border bg-white px-3 py-2 text-sm text-foreground outline-none focus:border-green-500 leading-tight"
            />
            <button
              type="submit"
              disabled={sending || !composerText.trim()}
              className="h-9 w-9 shrink-0 rounded-xl bg-green-600 flex items-center justify-center text-white hover:bg-green-700 disabled:opacity-60 transition-all"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" strokeWidth={2.5} />}
            </button>
          </form>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <p className="text-sm">Sélectionnez une conversation</p>
        </div>
      )}

      {/* New conversation modal */}
      {showNewModal && (
        <NewConversationModal
          onClose={() => setShowNewModal(false)}
          onCreated={(id, conv) => {
            setShowNewModal(false);
            loadConversations();
            setActiveId(id);
            setActiveConv(conv);
            setMessages([]);
          }}
        />
      )}
    </div>
  );
}

type Candidate = { id: string; name: string; sub: string; photoUrl: string | null };

function NewConversationModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (id: string, conv: Conversation) => void;
}) {
  const [type, setType] = useState<"lab" | "doctor">("doctor");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Candidate[]>([]);
  const [picked, setPicked] = useState<Candidate | null>(null);
  const [creating, setCreating] = useState(false);
  const [subject, setSubject] = useState("");

  useEffect(() => {
    setPicked(null);
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const ac = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/laboratoire/search-counterparts?type=${type}&q=${encodeURIComponent(query.trim())}`,
          { signal: ac.signal },
        );
        if (res.ok) {
          const d = (await res.json()) as { results: Candidate[] };
          setResults(d.results ?? []);
        }
      } catch {
        /* aborted */
      }
    }, 200);
    return () => {
      clearTimeout(t);
      ac.abort();
    };
  }, [query, type]);

  async function handleCreate() {
    if (!picked) return;
    setCreating(true);
    const res = await fetch("/api/laboratoire/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ counterpartType: type, counterpartId: picked.id, subject: subject || undefined }),
    });
    if (res.ok) {
      const d = (await res.json()) as { conversationId: string };
      onCreated(d.conversationId, {
        id: d.conversationId,
        subject: subject || null,
        lastMessagePreview: null,
        lastMessageAt: new Date().toISOString(),
        unreadCountLab: 0,
        counterpart: { kind: type, id: picked.id, name: picked.name },
      });
    }
    setCreating(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl border border-border p-6 w-full max-w-sm space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <p className="text-sm font-black text-foreground">Nouvelle conversation</p>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </div>

        <div className="flex gap-2">
          {(["doctor", "lab"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={[
                "flex-1 h-9 rounded-xl text-sm font-medium border-2 transition-all",
                type === t ? "border-green-500 bg-green-50 text-green-700" : "border-border text-muted-foreground",
              ].join(" ")}
            >
              {t === "doctor" ? "Médecin" : "Laboratoire"}
            </button>
          ))}
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold text-muted-foreground uppercase tracking-wider">
            {type === "doctor" ? "Rechercher un médecin" : "Rechercher un laboratoire"}
          </label>
          {picked ? (
            <div className="flex items-center justify-between gap-2 rounded-xl border-2 border-green-500 bg-green-50 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{picked.name}</p>
                {picked.sub && <p className="truncate text-xs text-muted-foreground">{picked.sub}</p>}
              </div>
              <button
                type="button"
                onClick={() => { setPicked(null); setQuery(""); }}
                className="text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                Changer
              </button>
            </div>
          ) : (
            <>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={type === "doctor" ? "Nom du médecin…" : "Nom du laboratoire…"}
                className="h-10 w-full rounded-xl border-2 border-border bg-white px-3 text-sm outline-none focus:border-green-500"
                autoFocus
              />
              {results.length > 0 && (
                <div className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-border bg-white shadow-sm">
                  {results.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setPicked(r)}
                      className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-green-50"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100 text-xs font-black text-green-700">
                        {r.name.split(" ").slice(0, 2).map((s) => s[0]).join("").toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">{r.name}</p>
                        {r.sub && <p className="truncate text-xs text-muted-foreground">{r.sub}</p>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {query.trim().length >= 2 && results.length === 0 && (
                <p className="mt-2 text-xs text-muted-foreground">Aucun résultat.</p>
              )}
            </>
          )}
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Sujet (optionnel)
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Résultats patient…"
            className="h-10 w-full rounded-xl border-2 border-border bg-white px-3 text-sm outline-none focus:border-green-500"
          />
        </div>

        <button
          type="button"
          onClick={handleCreate}
          disabled={creating || !picked}
          className="w-full h-10 rounded-xl bg-green-600 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-60 inline-flex items-center justify-center gap-2"
        >
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Créer la conversation
        </button>
      </div>
    </div>
  );
}
