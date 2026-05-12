"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import Image from "next/image";
import {
  Send,
  Loader2,
  MessageCircle,
  AlertCircle,
  X,
  Pencil,
  ImagePlus,
  Check,
  CheckCheck,
  Trash2,
  Phone,
  PhoneMissed,
  PhoneOff,
  RotateCw,
} from "lucide-react";
import { CallButton } from "@/components/call-ui";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { io, type Socket } from "socket.io-client";

// /messagerie hosts peer-doctor messaging.
// Live updates via Socket.IO (reuses the existing SOS server). Polling
// stays as a fallback when the WS server isn't reachable.
// Messages support: text, image (max 5 MB), edit (own), soft-delete (own).

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
  imageUrl: string | null;
  imageMimeType: string | null;
  createdAt: string;
  readAt: string | null;
  editedAt: string | null;
  deletedAt: string | null;
};

type CallSession = {
  id: string;
  callerId: string;
  calleeId: string;
  status: string;
  createdAt: string;
  answeredAt: string | null;
  endedAt: string | null;
};

// Outbound messages live in local state alongside server-confirmed rows
// so failed sends can be retried without losing their content. Confirmed
// rows are flattened into Message, optimistic rows carry the extra fields.
type OutboxItem = Message & {
  _localId: string;
  _status: "sending" | "sent" | "failed";
  _file?: File | null;
};

type DoctorStatus = {
  statusMessage: string | null;
  awayMessage: string | null;
  statusActiveUntil: string | null;
  isActive: boolean;
};

function StatusBanner({ status, onEdit }: { status: DoctorStatus; onEdit: () => void }) {
  const t = useTranslations("medecin.messages");
  if (!status.isActive || !status.statusMessage) return null;
  return (
    <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-700 rounded-xl px-4 py-3 mb-4 text-sm">
      <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
      <span className="flex-1 text-amber-800 dark:text-amber-200">
        <span className="font-medium">{t("statusBanner", { status: status.statusMessage })}</span>
      </span>
      <button onClick={onEdit} className="text-amber-600 hover:text-amber-800 dark:text-amber-400 flex-shrink-0">
        <Pencil className="w-4 h-4" />
      </button>
    </div>
  );
}

function StatusModal({
  status,
  onClose,
  onSaved,
}: {
  status: DoctorStatus | null;
  onClose: () => void;
  onSaved: (s: DoctorStatus) => void;
}) {
  const t = useTranslations("medecin.messages");
  const [msg, setMsg] = useState(status?.statusMessage ?? "");
  const [away, setAway] = useState(status?.awayMessage ?? "");
  const [until, setUntil] = useState(status?.statusActiveUntil ? status.statusActiveUntil.slice(0, 10) : "");
  const [saving, setSaving] = useState(false);
  async function save() {
    setSaving(true);
    await fetch("/api/doctor/status", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        statusMessage: msg || null,
        awayMessage: away || null,
        statusActiveUntil: until ? new Date(until).toISOString() : null,
      }),
    });
    setSaving(false);
    onSaved({
      statusMessage: msg || null,
      awayMessage: away || null,
      statusActiveUntil: until ? new Date(until).toISOString() : null,
      isActive: !!msg,
    });
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t("statusMessage")}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <input
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          placeholder="Ex: En congé jusqu'au 5 mai"
          className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
        <textarea
          value={away}
          onChange={(e) => setAway(e.target.value)}
          rows={3}
          placeholder="Réponse automatique..."
          className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
        />
        <input
          type="date"
          value={until}
          onChange={(e) => setUntil(e.target.value)}
          className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
        <div className="flex gap-2">
          <button
            onClick={() => { setMsg(""); setAway(""); setUntil(""); }}
            className="flex-1 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            {t("clearStatus")}
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex-1 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 disabled:opacity-50"
          >
            {saving ? "…" : t("editStatus")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MessageriePage() {
  const t = useTranslations("medecin.reseau");
  const tNav = useTranslations("medecin.nav");
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [calls, setCalls] = useState<CallSession[]>([]);
  const [outbox, setOutbox] = useState<OutboxItem[]>([]);
  const [input, setInput] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [myId, setMyId] = useState<string | null>(null);
  const [doctorStatus, setDoctorStatus] = useState<DoctorStatus | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const socketRef = useRef<unknown>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((s) => setMyId(s?.user?.id ?? null));
    fetch("/api/doctor/status")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setDoctorStatus(d as DoctorStatus); })
      .catch(() => {});
  }, []);

  // Load + poll the thread list. Poll is still here as a safety net even
  // when the socket is up — a fresh conversation may not have an open
  // socket subscription yet.
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/doctor/peer-conversations");
        if (!res.ok) throw new Error("Erreur");
        const data: Thread[] = await res.json();
        setThreads(data);
        const peer = searchParams.get("peer");
        const convId = searchParams.get("conv");
        if (convId && data.some((th) => th.id === convId)) {
          setActiveId(convId);
        } else if (peer && !data.some((th) => th.peerId === peer)) {
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
          const found = data.find((th) => th.peerId === peer);
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

  // Load messages for the active conversation + connect a Socket.IO client
  // to its room. Falls back to a 10s poll if the socket can't be loaded.
  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      setCalls([]);
      setOutbox([]);
      return;
    }
    // Reset outbox on conversation switch so failed sends don't leak between
    // threads. They'd be confusing inside the wrong context.
    setOutbox([]);
    async function loadMessages() {
      try {
        const [mr, cr] = await Promise.all([
          fetch(`/api/doctor/peer-conversations/${activeId}/messages`),
          fetch(`/api/doctor/peer-conversations/${activeId}/calls`),
        ]);
        if (mr.ok) setMessages((await mr.json()) as Message[]);
        if (cr.ok) setCalls((await cr.json()) as CallSession[]);
      } catch {
        /* silent */
      }
    }
    loadMessages();
    // Long-cadence poll (30s) as a safety net for missed WS pushes after a
    // disconnect/reconnect. Real-time delivery is the WS path.
    const poll = setInterval(loadMessages, 30_000);

    let sock: Socket | null = null;
    try {
      const url =
        typeof window !== "undefined"
          ? `${window.location.protocol}//${window.location.hostname}:3010`
          : "http://localhost:3010";
      sock = io(url, {
        path: "/sos-socket",
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionDelay: 500,
      });
      sock.on("connect", () => sock?.emit("join-peer-conv", activeId));
      sock.on("message:new", (m: Message) => {
        if (m.conversationId !== activeId) return;
        setMessages((prev) => (prev.some((p) => p.id === m.id) ? prev : [...prev, m]));
      });
      sock.on("message:updated", (m: Message) => {
        setMessages((prev) => prev.map((p) => (p.id === m.id ? m : p)));
      });
      sock.on("message:deleted", (m: { id: string }) => {
        setMessages((prev) =>
          prev.map((p) =>
            p.id === m.id
              ? { ...p, body: "", imageUrl: null, deletedAt: new Date().toISOString() }
              : p,
          ),
        );
      });
      socketRef.current = sock;
    } catch {
      /* socket server unreachable — poll fallback */
    }

    return () => {
      clearInterval(poll);
      try {
        sock?.emit("leave-peer-conv", activeId);
        sock?.disconnect();
      } catch {
        /* ignore */
      }
      socketRef.current = null;
    };
  }, [activeId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  function pickImage() {
    fileRef.current?.click();
  }

  function onImageSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      toast.error("Image trop volumineuse (max 5 Mo)");
      return;
    }
    setImageFile(f);
    setImagePreview(URL.createObjectURL(f));
    e.target.value = "";
  }

  function clearImage() {
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
  }

  async function deliverOutbox(item: OutboxItem) {
    if (!activeId) return;
    setOutbox((prev) =>
      prev.map((o) => (o._localId === item._localId ? { ...o, _status: "sending" } : o)),
    );
    try {
      let res: Response;
      if (item._file) {
        const fd = new FormData();
        fd.append("body", item.body);
        fd.append("file", item._file);
        res = await fetch(`/api/doctor/peer-conversations/${activeId}/messages`, {
          method: "POST",
          body: fd,
        });
      } else {
        res = await fetch(`/api/doctor/peer-conversations/${activeId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: item.body }),
        });
      }
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Erreur");
      const data = await res.json();
      // Drop the optimistic row and add the server-confirmed one.
      setOutbox((prev) => prev.filter((o) => o._localId !== item._localId));
      setMessages((prev) =>
        prev.some((m) => m.id === data.message.id) ? prev : [...prev, data.message],
      );
    } catch (e) {
      setOutbox((prev) =>
        prev.map((o) => (o._localId === item._localId ? { ...o, _status: "failed" } : o)),
      );
      toast.error(e instanceof Error ? e.message : "Erreur d'envoi");
    }
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!activeId || !myId) return;
    if (!input.trim() && !imageFile) return;
    const localId = `out-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const item: OutboxItem = {
      _localId: localId,
      _status: "sending",
      _file: imageFile,
      id: localId,
      conversationId: activeId,
      senderId: myId,
      body: input.trim(),
      imageUrl: imagePreview, // preview URL for instant display
      imageMimeType: imageFile?.type ?? null,
      createdAt: new Date().toISOString(),
      readAt: null,
      editedAt: null,
      deletedAt: null,
    };
    setOutbox((prev) => [...prev, item]);
    setInput("");
    setImageFile(null);
    setImagePreview(null);
    setSending(true);
    try {
      await deliverOutbox(item);
    } finally {
      setSending(false);
    }
  }

  async function retryOutbox(localId: string) {
    const item = outbox.find((o) => o._localId === localId);
    if (!item) return;
    await deliverOutbox(item);
  }

  function discardOutbox(localId: string) {
    setOutbox((prev) => prev.filter((o) => o._localId !== localId));
  }

  async function saveEdit() {
    if (!editingId || !activeId) return;
    const body = editDraft.trim();
    if (!body) return;
    try {
      const res = await fetch(
        `/api/doctor/peer-conversations/${activeId}/messages/${editingId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body }),
        },
      );
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => prev.map((p) => (p.id === data.message.id ? data.message : p)));
        setEditingId(null);
        setEditDraft("");
      } else {
        const e = await res.json().catch(() => ({}));
        toast.error(e.error ?? "Erreur");
      }
    } catch {
      toast.error("Erreur");
    }
  }

  async function deleteMessage(messageId: string) {
    if (!activeId) return;
    if (!confirm("Supprimer ce message ?")) return;
    try {
      const res = await fetch(
        `/api/doctor/peer-conversations/${activeId}/messages/${messageId}`,
        { method: "DELETE" },
      );
      if (res.ok) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? { ...m, body: "", imageUrl: null, deletedAt: new Date().toISOString() }
              : m,
          ),
        );
      }
    } catch {
      toast.error("Erreur");
    }
  }

  const activeThread = threads.find((th) => th.id === activeId);

  // Merge messages + outbox + calls into a single chronological timeline.
  // - "message" entries render as left/right bubbles.
  // - "outbox" entries are unsent messages still in local state (sending /
  //   failed). They never come back from the server until delivered.
  // - "call" entries render as centered system bubbles in the middle of
  //   the chat with the call duration + start time.
  type TimelineEntry =
    | { kind: "message"; ts: number; message: Message }
    | { kind: "outbox"; ts: number; item: OutboxItem }
    | { kind: "call"; ts: number; call: CallSession };
  const timeline: TimelineEntry[] = [
    ...messages.map((m) => ({
      kind: "message" as const,
      ts: new Date(m.createdAt).getTime(),
      message: m,
    })),
    ...outbox.map((o) => ({
      kind: "outbox" as const,
      ts: new Date(o.createdAt).getTime(),
      item: o,
    })),
    ...calls.map((c) => ({
      kind: "call" as const,
      ts: new Date(c.createdAt).getTime(),
      call: c,
    })),
  ].sort((a, b) => a.ts - b.ts);

  function formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return s === 0 ? `${m} min` : `${m} min ${s.toString().padStart(2, "0")}`;
  }

  function callLabel(c: CallSession): { icon: typeof Phone; label: string; tone: string } {
    if (c.answeredAt && c.endedAt) {
      const dur = Math.round(
        (new Date(c.endedAt).getTime() - new Date(c.answeredAt).getTime()) / 1000,
      );
      return {
        icon: Phone,
        label: `Appel — ${formatDuration(Math.max(dur, 1))}`,
        tone: "text-emerald-700 bg-emerald-50 border-emerald-200",
      };
    }
    if (c.endedAt && !c.answeredAt) {
      return {
        icon: PhoneMissed,
        label: c.callerId === myId ? "Appel non décroché" : "Appel manqué",
        tone: "text-rose-700 bg-rose-50 border-rose-200",
      };
    }
    return {
      icon: PhoneOff,
      label: "Appel terminé",
      tone: "text-gray-600 bg-gray-50 border-gray-200",
    };
  }

  return (
    <div className="w-full">
      {showStatusModal && (
        <StatusModal
          status={doctorStatus}
          onClose={() => setShowStatusModal(false)}
          onSaved={(s) => { setDoctorStatus(s); setShowStatusModal(false); }}
        />
      )}
      {doctorStatus && <StatusBanner status={doctorStatus} onEdit={() => setShowStatusModal(true)} />}

      <div className="flex items-center gap-3 mb-5">
        <div className="p-2 bg-teal-100 rounded-lg">
          <MessageCircle className="w-6 h-6 text-teal-700" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{tNav("messagerie")}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 h-[calc(100vh-220px)] min-h-[500px]">
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
              {threads.map((th) => (
                <li key={th.id}>
                  <button
                    type="button"
                    onClick={() => setActiveId(th.id)}
                    className={`w-full text-left p-3 flex gap-3 hover:bg-secondary/40 transition-colors ${
                      activeId === th.id ? "bg-secondary" : ""
                    }`}
                  >
                    {th.peerPhotoUrl ? (
                      <Image
                        src={th.peerPhotoUrl}
                        alt={th.peerName}
                        width={40}
                        height={40}
                        className="h-10 w-10 rounded-2xl object-cover shrink-0"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center text-sm font-bold shrink-0">
                        {th.peerName
                          .split(/\s+/)
                          .map((p) => p[0])
                          .slice(0, 2)
                          .join("")}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold truncate">{th.peerName}</p>
                        {th.unread > 0 && (
                          <span className="text-[10px] px-1.5 bg-red-500 text-white rounded-full font-bold min-w-[18px] text-center">
                            {th.unread > 99 ? "99+" : th.unread}
                          </span>
                        )}
                      </div>
                      {th.peerSpecialty && (
                        <p className="text-[10px] text-gray-400 truncate">{th.peerSpecialty}</p>
                      )}
                      {th.lastMessage && (
                        <p className="text-xs text-gray-500 truncate mt-0.5">{th.lastMessage}</p>
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
                {timeline.length === 0 ? (
                  <p className="text-center text-sm text-gray-400 italic py-8">
                    {t("noMessages")}
                  </p>
                ) : (
                  timeline.map((entry) => {
                    // ── Call log — centered system bubble ──────────────
                    if (entry.kind === "call") {
                      const { call } = entry;
                      const { icon: Icon, label, tone } = callLabel(call);
                      return (
                        <div key={`call-${call.id}`} className="flex justify-center my-2">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium ${tone}`}
                          >
                            <Icon className="h-3 w-3" />
                            {label}
                            <span className="opacity-70">
                              · {format(new Date(call.createdAt), "HH:mm", { locale: fr })}
                            </span>
                          </span>
                        </div>
                      );
                    }

                    // ── Outbox — unsent / failed local message ─────────
                    if (entry.kind === "outbox") {
                      const o = entry.item;
                      const isFailed = o._status === "failed";
                      return (
                        <div key={o._localId} className="flex justify-end">
                          <div className="max-w-[75%]">
                            <div
                              className={`rounded-2xl px-3 py-2 text-sm ${
                                isFailed
                                  ? "bg-red-50 text-red-900 border border-red-200"
                                  : "bg-primary/70 text-white"
                              }`}
                            >
                              {o.imageUrl && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={o.imageUrl}
                                  alt="image"
                                  className="rounded-lg mb-1 max-h-72"
                                />
                              )}
                              {o.body && (
                                <p className="whitespace-pre-wrap break-words">{o.body}</p>
                              )}
                            </div>
                            {isFailed ? (
                              <div className="mt-0.5 flex items-center justify-end gap-2 text-[11px]">
                                <span className="inline-flex items-center gap-1 text-red-600">
                                  <AlertCircle className="w-3 h-3" />
                                  Échec de l&apos;envoi
                                </span>
                                <button
                                  type="button"
                                  onClick={() => retryOutbox(o._localId)}
                                  className="inline-flex items-center gap-1 text-primary font-semibold hover:underline"
                                >
                                  <RotateCw className="w-3 h-3" /> Réessayer
                                </button>
                                <button
                                  type="button"
                                  onClick={() => discardOutbox(o._localId)}
                                  className="text-gray-500 hover:underline"
                                >
                                  Annuler
                                </button>
                              </div>
                            ) : (
                              <p className="text-[10px] mt-0.5 text-right text-gray-400">
                                Envoi… <Loader2 className="w-3 h-3 inline animate-spin" />
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    }

                    // ── Confirmed message ─────────────────────────────
                    const m = entry.message;
                    const isMe = m.senderId === myId;
                    const isDeleted = !!m.deletedAt;
                    const isEditingThis = editingId === m.id;
                    const isRead = !!m.readAt;
                    return (
                      <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"} group`}>
                        <div className="max-w-[75%]">
                          <div
                            className={`rounded-2xl px-3 py-2 text-sm ${
                              isMe ? "bg-primary text-white" : "bg-secondary text-foreground"
                            } ${isDeleted ? "italic opacity-70" : ""}`}
                          >
                            {isDeleted ? (
                              <p>Message supprimé</p>
                            ) : isEditingThis ? (
                              <div className="space-y-1.5">
                                <textarea
                                  value={editDraft}
                                  onChange={(e) => setEditDraft(e.target.value)}
                                  rows={2}
                                  className="w-full rounded-lg bg-white/15 text-white placeholder-white/60 px-2 py-1 text-sm focus:outline-none resize-none"
                                  autoFocus
                                />
                                <div className="flex gap-1.5 justify-end">
                                  <button
                                    type="button"
                                    onClick={() => { setEditingId(null); setEditDraft(""); }}
                                    className="text-[11px] px-2 py-1 rounded-md bg-white/15 hover:bg-white/25"
                                  >
                                    Annuler
                                  </button>
                                  <button
                                    type="button"
                                    onClick={saveEdit}
                                    className="text-[11px] px-2 py-1 rounded-md bg-white text-primary font-medium hover:bg-white/90"
                                  >
                                    <Check className="w-3 h-3 inline" /> Enregistrer
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                {m.imageUrl && (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={m.imageUrl}
                                    alt="image"
                                    className="rounded-lg mb-1 max-h-72 cursor-pointer"
                                    onClick={() => window.open(m.imageUrl!, "_blank")}
                                  />
                                )}
                                {m.body && (
                                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                                )}
                              </>
                            )}
                          </div>
                          {/* Timestamp under the bubble, with single/double
                              tick on own messages (✓ sent, ✓✓ blue read). */}
                          <div
                            className={`mt-0.5 flex items-center gap-1 text-[10px] text-gray-400 ${
                              isMe ? "justify-end" : "justify-start"
                            }`}
                          >
                            <span>{format(new Date(m.createdAt), "HH:mm", { locale: fr })}</span>
                            {m.editedAt && !isDeleted && <span>· modifié</span>}
                            {isMe && !isDeleted && (
                              isRead ? (
                                <CheckCheck className="w-3 h-3 text-sky-500" />
                              ) : (
                                <Check className="w-3 h-3" />
                              )
                            )}
                          </div>
                          {isMe && !isDeleted && !isEditingThis && (
                            <div className="flex gap-1.5 mt-0.5 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                              {!m.imageUrl && (
                                <button
                                  type="button"
                                  onClick={() => { setEditingId(m.id); setEditDraft(m.body); }}
                                  className="text-[10px] text-gray-400 hover:text-primary"
                                >
                                  Modifier
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => deleteMessage(m.id)}
                                className="text-[10px] text-gray-400 hover:text-red-500"
                              >
                                <Trash2 className="w-3 h-3 inline" /> Supprimer
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              {imagePreview && (
                <div className="px-3 pt-2 flex items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imagePreview} alt="preview" className="h-16 w-16 rounded-lg object-cover" />
                  <span className="text-xs text-gray-500 truncate flex-1">
                    {imageFile?.name} · {imageFile ? Math.round(imageFile.size / 1024) : 0} Ko
                  </span>
                  <button
                    type="button"
                    onClick={clearImage}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              <form
                onSubmit={sendMessage}
                className="p-3 border-t border-border flex items-center gap-2"
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={onImageSelected}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={pickImage}
                  className="inline-flex items-center justify-center h-10 w-10 rounded-xl border border-border bg-white hover:bg-secondary text-gray-600"
                  title="Joindre une image (max 5 Mo)"
                >
                  <ImagePlus className="h-4 w-4" />
                </button>
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
                  disabled={sending || (!input.trim() && !imageFile)}
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
