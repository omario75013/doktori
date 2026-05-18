"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { fr, arSA } from "date-fns/locale";
import { useTranslations, useLocale } from "next-intl";

type Notification = {
  id: string;
  title: string;
  body: string | null;
  createdAt: string;
  readAt: string | null;
  href?: string;
};

type Role = "doctor" | "secretary" | "admin" | "clinic" | "patient";

export function NotificationsBell({ role }: { role?: Role }) {
  const t = useTranslations("medecin.notifications");
  const locale = useLocale();
  const dateLocale = locale === "ar" ? arSA : fr;
  const [count, setCount] = useState(0);
  const [items, setItems] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      if (role === "admin") {
        const res = await fetch("/api/admin/notifications?limit=15", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        type AdminNotif = {
          id: string;
          type: string;
          title: string;
          message: string | null;
          link: string | null;
          isRead: boolean;
          createdAt: string;
        };
        const feed: Notification[] = ((data.notifications ?? []) as AdminNotif[]).map((n) => ({
          id: n.id,
          title: n.title,
          body: n.message,
          createdAt: n.createdAt,
          readAt: n.isRead ? n.createdAt : null,
          href: n.link ?? "/admin",
        }));
        setItems(feed);
        setCount(Number(data.unreadCount ?? 0));
      } else if (role === "clinic") {
        const res = await fetch("/api/clinique/notifications", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        type ClinicNotif = {
          id: string;
          title: string;
          body: string | null;
          createdAt: string;
          readAt: string | null;
          href?: string;
        };
        const feed: Notification[] = ((data.items ?? []) as ClinicNotif[]).map((n) => ({
          id: n.id,
          title: n.title,
          body: n.body,
          createdAt: n.createdAt,
          readAt: n.readAt,
          href: n.href ?? "/clinique/rdv-requests",
        }));
        setItems(feed);
        setCount(Number(data.unreadCount ?? 0));
      } else if (role === "secretary") {
        const res = await fetch("/api/secretary/notifications", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const feed: Notification[] = (data.feed ?? []).map((n: {
          id: string;
          title: string;
          body: string | null;
          createdAt: string;
          readAt: string | null;
          type: string;
        }) => ({
          id: n.id,
          title: n.title,
          body: n.body,
          createdAt: n.createdAt,
          readAt: n.readAt,
          href:
            n.type === "message"
              ? "/secretaire/messagerie"
              : n.type === "bell"
                ? "/secretaire/notifications"
                : "/secretaire/notifications",
        }));
        setItems(feed.slice(0, 10));
        setCount(Number(data.unreadCount ?? 0));
      } else {
        const res = await fetch("/api/doctor/notifications/unread", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        type FeedEntry = {
          id: string;
          kind?: "booking" | "doctor_event";
          type?: string;
          patientName?: string | null;
          requesterName?: string | null;
          startsAt?: string | null;
          createdAt?: string;
          href?: string;
        };
        const all: FeedEntry[] = data.latest ?? [];
        const lastSeen = localStorage.getItem("doktori_notif_last_seen");
        const mapped: Notification[] = all.map((n) => {
          const name = n.requesterName?.replace(/^Dr\.?\s*/i, "") ?? "";
          let title = "";
          if (n.kind === "doctor_event") {
            switch (n.type) {
              case "connection_request":
                title = name
                  ? t("connectionRequest", { name })
                  : t("connectionRequestAnon");
                break;
              case "connection_accepted":
                title = name
                  ? t("connectionAccepted", { name })
                  : t("connectionAcceptedAnon");
                break;
              case "peer_message":
                title = name
                  ? t("peerMessage", { name })
                  : t("peerMessageAnon");
                break;
              case "appointment_cancelled_by_patient":
                title = n.patientName
                  ? t("appointmentCancelled", { patient: n.patientName })
                  : t("appointmentCancelledAnon");
                break;
              case "appointment_rescheduled_by_patient":
                title = n.patientName
                  ? t("appointmentRescheduled", { patient: n.patientName })
                  : t("appointmentRescheduledAnon");
                break;
              case "referral_received":
                title = name
                  ? t("referralReceived", { name })
                  : t("referralReceivedAnon");
                break;
              case "referral_accepted":
                title = name
                  ? t("referralAccepted", { name })
                  : t("referralAcceptedAnon");
                break;
              case "referral_declined":
                title = name
                  ? t("referralDeclined", { name })
                  : t("referralDeclinedAnon");
                break;
              case "referral_completed":
                title = name
                  ? t("referralCompleted", { name })
                  : t("referralCompletedAnon");
                break;
              default:
                title = t("fallback");
            }
          } else {
            title = n.patientName
              ? t("appointmentBooking", { patient: n.patientName })
              : t("fallback");
          }
          return {
            id: n.id,
            title,
            body: null,
            createdAt: n.createdAt ?? n.startsAt ?? new Date().toISOString(),
            readAt: null,
            href: n.href ?? "/rendez-vous",
          };
        });
        setItems(mapped);
        const unread = lastSeen
          ? all.filter((n) => {
              const ts = new Date(n.createdAt ?? n.startsAt ?? 0).getTime();
              return ts > new Date(lastSeen).getTime();
            })
          : all;
        setCount(Number(data.count ?? unread.length));
      }
    } catch {
      /* silent */
    }
  }, [role]);

  useEffect(() => {
    load();
    const id = setInterval(load, 15_000);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  async function markSeen() {
    if (role === "secretary") {
      await fetch("/api/secretary/notifications", { method: "PATCH" }).catch(() => {});
    } else if (role === "admin") {
      await fetch("/api/admin/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      }).catch(() => {});
    } else {
      localStorage.setItem("doktori_notif_last_seen", new Date().toISOString());
    }
    setCount(0);
    load();
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <Bell className="h-5 w-5 text-gray-700 dark:text-gray-200" strokeWidth={2} />
        {count > 0 && (
          <span className="absolute -top-0.5 -end-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white leading-none">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute end-0 top-12 z-50 w-80 rounded-2xl bg-white dark:bg-gray-900 shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                {t("title")}
              </p>
              {count > 0 && (
                <button
                  type="button"
                  onClick={markSeen}
                  className="text-[10px] font-semibold text-primary hover:underline"
                >
                  {t("markAllRead")}
                </button>
              )}
            </div>
            {items.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-gray-400">
                {t("nothingYet")}
              </div>
            ) : (
              <div className="divide-y divide-gray-50 dark:divide-gray-800 max-h-80 overflow-y-auto">
                {items.map((n) => (
                  <Link
                    key={n.id}
                    href={n.href ?? "#"}
                    onClick={() => setOpen(false)}
                    className={`flex flex-col gap-0.5 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                      n.readAt ? "opacity-60" : ""
                    }`}
                  >
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                      {n.title}
                    </span>
                    {n.body && (
                      <span className="text-xs text-gray-500 truncate">{n.body}</span>
                    )}
                    <span className="text-[10px] text-gray-400">
                      {format(new Date(n.createdAt), "d MMM HH:mm", { locale: dateLocale })}
                    </span>
                  </Link>
                ))}
              </div>
            )}
            <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-800">
              <Link
                href={
                  role === "secretary"
                    ? "/secretaire/notifications"
                    : role === "clinic"
                      ? "/clinique/rdv-requests"
                      : role === "admin"
                        ? "/admin"
                        : "/rendez-vous"
                }
                onClick={() => setOpen(false)}
                className="block text-center text-xs font-semibold text-teal-600 hover:text-teal-700 py-1"
              >
                {t("viewAll")}
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
