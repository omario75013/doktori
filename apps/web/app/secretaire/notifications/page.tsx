"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Bell, CalendarClock, MessagesSquare, Loader2, CheckCheck } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

type Feed = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  createdAt: string;
  readAt: string | null;
};

type Upcoming = {
  id: string;
  startsAt: string;
  patientName: string;
  patientPhone: string | null;
  status: string;
};

export default function NotifPage() {
  const t = useTranslations("secretaire.notifications");
  const [feed, setFeed] = useState<Feed[]>([]);
  const [upcoming, setUpcoming] = useState<Upcoming[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch("/api/secretary/notifications");
    if (!res.ok) return;
    const data = await res.json();
    setFeed(data.feed);
    setUpcoming(data.upcoming);
    setUnread(data.unreadCount);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, []);

  async function markAllRead() {
    await fetch("/api/secretary/notifications", { method: "PATCH" });
    load();
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{t("title")}</h1>
            <p className="text-sm text-gray-500">
              {unread > 0 ? t("unread", { count: unread, plural: unread > 1 ? "s" : "" }) : t("allRead")}
            </p>
          </div>
        </div>
        {unread > 0 && (
          <button
            type="button"
            onClick={markAllRead}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-3 py-2 text-xs font-semibold hover:bg-secondary"
          >
            <CheckCheck className="h-4 w-4" />
            {t("markAllRead")}
          </button>
        )}
      </div>

      <section className="rounded-2xl border border-border bg-white shadow-sm p-5">
        <h2 className="font-semibold mb-3 flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-primary" />
          {t("upcomingTitle")}
        </h2>
        {loading ? (
          <div className="py-6 text-center">
            <Loader2 className="h-4 w-4 animate-spin inline" />
          </div>
        ) : upcoming.length === 0 ? (
          <p className="py-4 text-sm text-gray-400 italic">{t("noUpcoming")}</p>
        ) : (
          <ul className="divide-y divide-border">
            {upcoming.map((r) => (
              <li key={r.id} className="py-2 flex items-center gap-3">
                <div className="text-sm font-mono font-bold text-primary w-24 shrink-0">
                  {format(new Date(r.startsAt), "EEE HH:mm", { locale: fr })}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{r.patientName}</p>
                  {r.patientPhone && (
                    <p className="text-xs text-gray-500">{r.patientPhone}</p>
                  )}
                </div>
                <span className="text-[10px] rounded-full bg-secondary px-2 py-0.5 font-semibold">
                  {r.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-white shadow-sm p-5">
        <h2 className="font-semibold mb-3 flex items-center gap-2">
          <MessagesSquare className="h-4 w-4 text-primary" />
          {t("activityTitle")}
        </h2>
        {loading ? (
          <div className="py-6 text-center">
            <Loader2 className="h-4 w-4 animate-spin inline" />
          </div>
        ) : feed.length === 0 ? (
          <p className="py-4 text-sm text-gray-400 italic">{t("nothingYet")}</p>
        ) : (
          <ul className="divide-y divide-border">
            {feed.map((n) => (
              <li
                key={n.id}
                className={`py-3 flex items-start gap-3 ${n.readAt ? "opacity-60" : ""}`}
              >
                <span className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                  {n.type === "bell" ? (
                    <Bell className="h-4 w-4 text-primary" />
                  ) : n.type === "message" ? (
                    <MessagesSquare className="h-4 w-4 text-primary" />
                  ) : (
                    <CalendarClock className="h-4 w-4 text-primary" />
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{n.title}</p>
                  {n.body && <p className="text-xs text-gray-500 truncate">{n.body}</p>}
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {format(new Date(n.createdAt), "d MMM HH:mm", { locale: fr })}
                  </p>
                </div>
                {!n.readAt && <span className="h-2 w-2 rounded-full bg-red-500 mt-1.5" />}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
