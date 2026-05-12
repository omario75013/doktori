"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Send, Loader2, MessagesSquare } from "lucide-react";
import { CallButton } from "@/components/call-ui";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

type Thread = {
  id: string;
  peerId: string;
  peerName: string;
  peerPhotoUrl: string | null;
  peerSpecialty: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unread: number;
};

type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
  readAt: string | null;
};

export default function PeerMessagingPage() {
  const t = useTranslations("medecin.reseau");
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [myId, setMyId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((s) => setMyId(s?.user?.id ?? null));
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/doctor/peer-conversations");
        if (!res.ok) throw new Error("Erreur");
        const data: Thread[] = await res.json();
        setThreads(data);
        const peer = searchParams.get("peer");
        if (peer && !data.some((t) => t.peerId === peer)) {
          const res2 = await fetch("/api/doctor/peer-conversations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ peerId: peer }),
          });
          const created = await res2.json();
          if (res2.ok) {
            setActiveId(created.conversation.id);
            const res3 = await fetch("/api/doctor/peer-conversations");
            if (res3.ok) setThreads(await res3.json());
          }
        } else if (peer) {
          const found = data.find((t) => t.peerId === peer);
          if (found) setActiveId(found.id);
        } else if (data.length > 0) {
          setActiveId(data[0].id);
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erreur");
      } finally {
        setLoading(false);
      }
    }
    load();
    // Poll the conversation list so a new peer message creates a row +
    // unread badge without requiring a manual page refresh. 15s mirrors
    // the doctor topbar bell cadence.
    const iv = setInterval(async () => {
      try {
        const r = await fetch("/api/doctor/peer-conversations", { cache: "no-store" });
        if (r.ok) setThreads(await r.json());
      } catch {
        /* ignore */
      }
    }, 15_000);
    return () => clearInterval(iv);
  }, [searchParams]);

  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return;
    }
    async function loadMessages() {
      try {
        const res = await fetch(`/api/doctor/peer-conversations/${activeId}/messages`);
        if (!res.ok) return;
        const data: Message[] = await res.json();
        setMessages(data);
      } catch {
        /* silent */
      }
    }
    loadMessages();
    const interval = setInterval(loadMessages, 10000);
    return () => clearInterval(interval);
  }, [activeId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!activeId || !input.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/doctor/peer-conversations/${activeId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: input.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Erreur");
      }
      const data = await res.json();
      setMessages((prev) => [...prev, data.message]);
      setInput("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSending(false);
    }
  }

  const activeThread = threads.find((t) => t.id === activeId);

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      <Link
        href="/reseau"
        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("backToNetwork")}
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <MessagesSquare className="h-5 w-5" />
          {t("messagerieTitle")}
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 h-[calc(100vh-280px)] min-h-[500px]">
        <aside className="ds-card overflow-y-auto">
          {loading ? (
            <div className="p-6 text-center">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400 mx-auto" />
            </div>
          ) : threads.length === 0 ? (
            <p className="p-6 text-center text-sm text-gray-400">
              {t("noConversations")}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {threads.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => setActiveId(t.id)}
                    className={`w-full text-left p-3 flex gap-3 hover:bg-secondary/40 transition-colors ${
                      activeId === t.id ? "bg-secondary" : ""
                    }`}
                  >
                    {t.peerPhotoUrl ? (
                      <Image
                        src={t.peerPhotoUrl}
                        alt={t.peerName}
                        width={40}
                        height={40}
                        className="h-10 w-10 rounded-2xl object-cover shrink-0"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center text-sm font-bold shrink-0">
                        {t.peerName
                          .split(/\s+/)
                          .map((p) => p[0])
                          .slice(0, 2)
                          .join("")}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold truncate">{t.peerName}</p>
                        {t.unread > 0 && (
                          <span className="text-[10px] px-1.5 bg-red-500 text-white rounded-full font-bold">
                            {t.unread}
                          </span>
                        )}
                      </div>
                      {t.peerSpecialty && (
                        <p className="text-[10px] text-gray-400 truncate">{t.peerSpecialty}</p>
                      )}
                      {t.lastMessage && (
                        <p className="text-xs text-gray-500 truncate mt-0.5">{t.lastMessage}</p>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <section className="ds-card flex flex-col">
          {!activeThread ? (
            <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
              {t("selectConversation")}
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-border flex items-center gap-3">
                {activeThread.peerPhotoUrl ? (
                  <Image
                    src={activeThread.peerPhotoUrl}
                    alt={activeThread.peerName}
                    width={40}
                    height={40}
                    className="h-10 w-10 rounded-2xl object-cover"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center text-sm font-bold">
                    {activeThread.peerName.split(/\s+/).map((p) => p[0]).slice(0, 2).join("")}
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-semibold text-foreground">{activeThread.peerName}</p>
                  {activeThread.peerSpecialty && (
                    <p className="text-xs text-gray-500">{activeThread.peerSpecialty}</p>
                  )}
                </div>
                <CallButton
                  peerType="doctor"
                  peerId={activeThread.peerId}
                  peerName={activeThread.peerName}
                />
              </div>
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">
                {messages.length === 0 ? (
                  <p className="text-center text-sm text-gray-400 italic py-8">
                    {t("noMessages")}
                  </p>
                ) : (
                  messages.map((m) => {
                    const isMe = m.senderId === myId;
                    return (
                      <div
                        key={m.id}
                        className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                            isMe
                              ? "bg-primary text-white"
                              : "bg-secondary text-foreground"
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">{m.body}</p>
                          <p
                            className={`text-[10px] mt-0.5 ${
                              isMe ? "text-white/70" : "text-gray-400"
                            }`}
                          >
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
                  placeholder={t("messagePlaceholder")}
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
    </div>
  );
}
