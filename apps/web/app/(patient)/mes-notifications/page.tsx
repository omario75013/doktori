"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, CheckCheck, Inbox } from "lucide-react";
import { format } from "date-fns";
import { fr, arSA } from "date-fns/locale";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";

// Server-stored titles snapshot the locale at insert time (currently FR).
// When we recognise the notification type we render a translated heading
// instead so Arabic readers don't see a French title above an Arabic
// chrome. The body (which contains doctor name + datetime) stays as
// stored — full body i18n would require restructuring payload columns.
function translatedTitle(
  type: string,
  fallback: string,
  t: (k: string) => string,
): string {
  switch (type) {
    case "rdv_confirmed":
      return t("typeRdvConfirmed");
    case "rdv_cancelled":
      return t("typeRdvCancelled");
    case "rdv_rescheduled":
      return t("typeRdvRescheduled");
    default:
      return fallback;
  }
}

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
  const t = useTranslations("patientNotifications");
  const locale = useLocale();
  const dateLocale = locale === "ar" ? arSA : fr;
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    const stored = sessionStorage.getItem("doktori_patient_session");
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
          sessionStorage.removeItem("doktori_patient_session");
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
    <>
      {/* Header */}
      <div className="mb-6 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="ds-eyebrow">{t("eyebrow")}</div>
          <h1 className="ds-page-title">{t("pageTitle")}</h1>
          <p className="ds-page-sub">
            {unreadCount > 0
              ? t("unread", { count: unreadCount, plural: unreadCount > 1 ? "s" : "" })
              : t("allRead")}
          </p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="ds-btn ds-btn-ghost">
            <CheckCheck className="h-4 w-4" /> {t("markAllRead")}
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="ds-tabs mb-4" style={{ width: "fit-content" }}>
        {(["all", "unread"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`ds-tab ${filter === f ? "on" : ""}`}
          >
            {f === "all" ? t("filterAll") : t("filterUnread")}
          </button>
        ))}
      </div>

      <div className="ds-card-patient p-5">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[color:var(--line-cool)] bg-[color:var(--surface-2)] p-10 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[color:var(--primary-50)] mb-4">
              <Inbox className="h-7 w-7 text-[color:var(--primary-600)]" />
            </div>
            <p className="font-bold text-[color:var(--ink-900)] mb-1">{t("emptyTitle")}</p>
            <p className="text-sm text-[color:var(--ink-500)]">
              {filter === "unread" ? t("emptyAllRead") : t("emptyNoYet")}
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {items.map((n) => (
              <li key={n.id}>
                <button
                  onClick={() => markRead(n.id, n.link)}
                  className={`w-full text-left rounded-xl border border-[color:var(--line-cool)] bg-white p-3.5 hover:border-[color:var(--primary-300)] transition-all flex gap-3 ${
                    !n.readAt ? "ring-2 ring-[color:var(--primary-50)]" : ""
                  }`}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      background: n.readAt ? "var(--surface-2)" : "var(--primary-50)",
                      color: n.readAt ? "var(--ink-500)" : "var(--primary-600)",
                    }}
                  >
                    <Bell className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <p
                        className={`text-sm truncate ${
                          n.readAt
                            ? "text-[color:var(--ink-700)]"
                            : "font-bold text-[color:var(--ink-900)]"
                        }`}
                      >
                        {translatedTitle(n.type, n.title, t)}
                      </p>
                      <span className="text-xs text-[color:var(--ink-500)] shrink-0">
                        {format(new Date(n.createdAt), "d MMM HH:mm", { locale: dateLocale })}
                      </span>
                    </div>
                    {n.body && (
                      <p className="text-xs text-[color:var(--ink-500)] line-clamp-2">{n.body}</p>
                    )}
                  </div>
                  {n.readAt && <Check className="h-4 w-4 text-[color:var(--ink-500)] shrink-0 mt-1" />}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
