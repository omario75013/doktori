"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, CheckCheck, Inbox } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

type Filter = "all" | "unread";

export default function MesNotificationsPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    const stored = localStorage.getItem("doktori_patient_token");
    if (!stored) {
      router.replace("/mes-rdv");
      return;
    }
    setToken(stored);
  }, [router]);

  const load = useCallback(
    async (f: Filter, t: string) => {
      setLoading(true);
      try {
        const url = f === "unread" ? "/api/me/notifications?unread=1" : "/api/me/notifications";
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${t}` },
          cache: "no-store",
        });
        if (res.status === 401) {
          localStorage.removeItem("doktori_patient_token");
          router.replace("/mes-rdv");
          return;
        }
        const data = await res.json();
        setItems(Array.isArray(data.items) ? data.items : []);
      } finally {
        setLoading(false);
      }
    },
    [router],
  );

  useEffect(() => {
    if (token) void load(filter, token);
  }, [token, filter, load]);

  async function markRead(id: string, link: string | null) {
    if (!token) return;
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, readAt: n.readAt ?? new Date().toISOString() } : n)),
    );
    await fetch(`/api/me/notifications/${id}/read`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
    if (link) router.push(link);
  }

  async function markAllRead() {
    if (!token) return;
    const res = await fetch("/api/me/notifications/read-all", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setItems((prev) =>
        prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })),
      );
      toast.success("Notifications marquées comme lues");
    }
  }

  const unreadCount = items.filter((n) => !n.readAt).length;

  return (
    <div className="min-h-screen bg-secondary/40 dark:bg-gray-900">
      <div className="bg-gradient-to-br from-primary to-foreground px-4 py-8">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/20">
              <Bell className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white">Mes notifications</h1>
              <p className="text-white/70 text-xs mt-0.5">
                {unreadCount > 0 ? `${unreadCount} non lue${unreadCount > 1 ? "s" : ""}` : "Tout est lu"}
              </p>
            </div>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-xs font-semibold text-white/90 bg-white/15 hover:bg-white/25 rounded-lg px-3 py-2 transition-colors flex items-center gap-1.5"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Tout marquer lu
            </button>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex gap-1 bg-white dark:bg-gray-800 rounded-2xl border border-border p-1 mb-6 shadow-sm">
          {(["all", "unread"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                filter === f
                  ? "bg-primary text-white shadow-sm"
                  : "text-foreground/60 hover:text-foreground hover:bg-secondary"
              }`}
            >
              {f === "all" ? "Toutes" : "Non lues"}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-border shadow-sm p-10 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-secondary mb-4">
              <Inbox className="h-7 w-7 text-primary/50" />
            </div>
            <p className="font-semibold text-foreground mb-1">Aucune notification</p>
            <p className="text-sm text-foreground/50">
              {filter === "unread"
                ? "Toutes vos notifications ont été lues."
                : "Vous n'avez encore reçu aucune notification."}
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {items.map((n) => (
              <li key={n.id}>
                <button
                  onClick={() => markRead(n.id, n.link)}
                  className={`w-full text-left bg-white dark:bg-gray-800 rounded-2xl border border-border p-4 hover:shadow-md hover:border-primary/30 transition-all flex gap-3 ${
                    !n.readAt ? "border-l-4 border-l-primary" : ""
                  }`}
                >
                  <div
                    className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                      n.readAt ? "bg-transparent" : "bg-primary"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p
                        className={`text-sm truncate ${
                          n.readAt ? "text-foreground/70" : "font-bold text-foreground"
                        }`}
                      >
                        {n.title}
                      </p>
                      <span className="text-xs text-foreground/40 shrink-0">
                        {format(new Date(n.createdAt), "d MMM HH:mm", { locale: fr })}
                      </span>
                    </div>
                    {n.body && (
                      <p className="text-xs text-foreground/60 line-clamp-2">{n.body}</p>
                    )}
                  </div>
                  {n.readAt && <Check className="h-4 w-4 text-foreground/30 shrink-0 mt-1" />}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
