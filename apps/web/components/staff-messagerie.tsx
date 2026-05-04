"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import { Send, Loader2, MessagesSquare, Plus, X } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { CallButton } from "@/components/call-ui";
import { useTranslations } from "next-intl";

type Thread = {
  id: string;
  peerType: "doctor" | "secretary";
  peerId: string;
  peerName: string;
  peerPhotoUrl: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unread: number;
};

type Peer = {
  type: "doctor" | "secretary";
  id: string;
  name: string;
  photoUrl: string | null;
};

type Message = {
  id: string;
  conversationId: string;
  senderType: "doctor" | "secretary";
  senderId: string;
  body: string;
  createdAt: string;
  readAt: string | null;
};

export function StaffMessagerie({
  selfType,
  selfId,
}: {
  selfType: "doctor" | "secretary";
  selfId: string;
}) {
  const t = useTranslations("medecin.messages");
  const [threads, setThreads] = useState<Thread[]>([]);
  const [peers, setPeers] = useState<Peer[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showPeerPicker, setShowPeerPicker] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadThreads = useCallback(async () => {
    try {
      const res = await fetch("/api/staff/conversations");
      if (res.ok) setThreads(await res.json());
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const [threadsRes, peersRes] = await Promise.all([
          fetch("/api/staff/conversations"),
          fetch("/api/staff/peers"),
        ]);
        if (threadsRes.ok) {
          const data: Thread[] = await threadsRes.json();
          setThreads(data);
          if (data.length > 0 && !activeId) setActiveId(data[0].id);
        }
        if (peersRes.ok) setPeers(await peersRes.json());
      } finally {
        setLoading(false);
      }
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return;
    }
    async function loadMessages() {
      const res = await fetch(`/api/staff/conversations/${activeId}/messages`);
      if (res.ok) setMessages(await res.json());
    }
    loadMessages();
    const id = setInterval(loadMessages, 5000);
    return () => clearInterval(id);
  }, [activeId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function startWith(peer: Peer) {
    try {
      const res = await fetch("/api/staff/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ peerType: peer.type, peerId: peer.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      await loadThreads();
      setActiveId(data.conversation.id);
      setShowPeerPicker(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    }
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!activeId || !input.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/staff/conversations/${activeId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: input.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      setMessages((prev) => [...prev, data.message]);
      setInput("");
      loadThreads();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSending(false);
    }
  }

  const active = threads.find((t) => t.id === activeId);

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessagesSquare className="h-5 w-5" />
          {t("staffTitle")}
        </h1>
        <button
          type="button"
          onClick={() => setShowPeerPicker(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          {t("newConversation")}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4 h-[calc(100vh-260px)] min-h-[500px]">
        <aside className="rounded-2xl border border-border bg-white shadow-sm overflow-y-auto">
          {loading ? (
            <div className="p-6 text-center">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400 mx-auto" />
            </div>
          ) : threads.length === 0 ? (
            <p className="p-6 text-center text-sm text-gray-400">
              {t("noThreads")}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {threads.map((thread) => (
                <li key={thread.id}>
                  <button
                    type="button"
                    onClick={() => setActiveId(thread.id)}
                    className={`w-full text-left p-3 flex gap-3 hover:bg-secondary/40 transition-colors ${
                      activeId === thread.id ? "bg-secondary" : ""
                    }`}
                  >
                    {thread.peerPhotoUrl ? (
                      <Image
                        src={thread.peerPhotoUrl}
                        alt={thread.peerName}
                        width={40}
                        height={40}
                        className="h-10 w-10 rounded-2xl object-cover shrink-0"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                        {thread.peerName
                          .split(/\s+/)
                          .map((p) => p[0])
                          .slice(0, 2)
                          .join("")}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold truncate">{thread.peerName}</p>
                        {thread.unread > 0 && (
                          <span className="text-[10px] px-1.5 bg-red-500 text-white rounded-full font-bold">
                            {thread.unread}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide">
                        {thread.peerType === "doctor" ? t("peerDoctor") : t("peerSecretary")}
                      </p>
                      {thread.lastMessage && (
                        <p className="text-xs text-gray-500 truncate mt-0.5">{thread.lastMessage}</p>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <section className="rounded-2xl border border-border bg-white shadow-sm flex flex-col">
          {!active ? (
            <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
              {t("selectThread")}
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-border flex items-center gap-3">
                {active.peerPhotoUrl ? (
                  <Image
                    src={active.peerPhotoUrl}
                    alt={active.peerName}
                    width={40}
                    height={40}
                    className="h-10 w-10 rounded-2xl object-cover"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center text-xs font-bold">
                    {active.peerName.split(/\s+/).map((p) => p[0]).slice(0, 2).join("")}
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-semibold text-foreground">{active.peerName}</p>
                  <p className="text-xs text-gray-500 capitalize">
                    {active.peerType === "doctor" ? t("peerDoctor") : t("peerSecretary")}
                  </p>
                </div>
                <CallButton
                  peerType={active.peerType}
                  peerId={active.peerId}
                  peerName={active.peerName}
                />
              </div>
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">
                {messages.length === 0 ? (
                  <p className="text-center text-sm text-gray-400 italic py-8">
                    {t("staffNoMessages")}
                  </p>
                ) : (
                  messages.map((m) => {
                    const isMe = m.senderType === selfType && m.senderId === selfId;
                    return (
                      <div
                        key={m.id}
                        className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                            isMe ? "bg-primary text-white" : "bg-secondary text-foreground"
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">{m.body}</p>
                          <p className={`text-[10px] mt-0.5 ${isMe ? "text-white/70" : "text-gray-400"}`}>
                            {format(new Date(m.createdAt), "HH:mm", { locale: fr })}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              <form
                onSubmit={sendMessage}
                className="p-3 border-t border-border flex items-center gap-2"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={t("staffPlaceholder")}
                  className="flex-1 h-10 rounded-xl border border-border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={sending}
                />
                <button
                  type="submit"
                  disabled={sending || !input.trim()}
                  className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-primary text-white hover:opacity-90 disabled:opacity-60"
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </form>
            </>
          )}
        </section>
      </div>

      {showPeerPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowPeerPicker(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{t("choosePeer")}</h3>
              <button onClick={() => setShowPeerPicker(false)} className="h-8 w-8 rounded-lg text-gray-400 hover:bg-secondary flex items-center justify-center">
                <X className="h-4 w-4" />
              </button>
            </div>
            {peers.length === 0 ? (
              <p className="text-sm text-gray-400 italic">{t("noPeers")}</p>
            ) : (
              <ul className="divide-y divide-border">
                {peers.map((p) => (
                  <li key={`${p.type}:${p.id}`}>
                    <button
                      type="button"
                      onClick={() => startWith(p)}
                      className="w-full text-left py-2 px-2 flex items-center gap-3 hover:bg-secondary/40 rounded-xl"
                    >
                      {p.photoUrl ? (
                        <Image src={p.photoUrl} alt={p.name} width={36} height={36} className="h-9 w-9 rounded-2xl object-cover" />
                      ) : (
                        <div className="h-9 w-9 rounded-2xl bg-teal-600 text-white flex items-center justify-center text-xs font-bold">
                          {p.name.split(/\s+/).map((s) => s[0]).slice(0, 2).join("")}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-semibold">{p.name}</p>
                        <p className="text-[10px] text-gray-400 uppercase">
                          {p.type === "doctor" ? t("peerDoctor") : t("peerSecretary")}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
