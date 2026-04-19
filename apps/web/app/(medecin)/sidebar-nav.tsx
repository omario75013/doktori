"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { Menu, X, Bell } from "lucide-react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

type NotificationItem = {
  id: string;
  startsAt: string;
  createdAt: string;
  patientName: string;
};

const LAST_SEEN_KEY = "doktori_notif_last_seen";
const POLL_INTERVAL_MS = 30_000;

export function SidebarNav({
  userName,
  verificationStatus,
}: {
  userName?: string | null;
  verificationStatus?: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [bellOpen, setBellOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const bellRef = useRef<HTMLDivElement>(null);
  const t = useTranslations("medecin.nav");

  const showVerificationDot =
    verificationStatus === "pending" || verificationStatus === "rejected";

  const links = [
    { href: "/dashboard", label: t("dashboard") },
    { href: "/verification", label: "Vérification", dot: showVerificationDot },
    { href: "/calendrier", label: t("calendrier") },
    { href: "/agenda", label: t("agenda") },
    { href: "/rendez-vous", label: t("rendezVous") },
    { href: "/patients", label: t("patients") },
    { href: "/motifs", label: t("motifs") },
    { href: "/cabinets", label: t("cabinets") },
    { href: "/domicile", label: t("domicile") },
    { href: "/conventions", label: t("conventions") },
    { href: "/cnam", label: t("cnam") },
    { href: "/sos-medecin", label: t("sos") },
    { href: "/stats", label: t("stats") },
    { href: "/secretaires", label: t("secretaires") },
    { href: "/parrainage", label: t("parrainage") },
    { href: "/abonnement", label: t("abonnement") },
    { href: "/teleconsultation", label: t("teleconsultation") },
    { href: "/messages", label: t("messages") },
    { href: "/messagerie", label: t("messagerie") },
    { href: "/wallet", label: t("wallet") },
    { href: "/factures", label: t("factures") },
    { href: "/profil", label: t("profil") },
  ];

  // Fetch message unread count
  useEffect(() => {
    async function fetchUnread() {
      try {
        const r = await fetch("/api/messages/unread");
        if (r.ok) {
          const data = await r.json();
          setUnreadCount(data.count ?? 0);
        }
      } catch {
        // ignore
      }
    }
    fetchUnread();
  }, []);

  // Fetch booking notifications and compute unread count using localStorage lastSeenAt
  const fetchNotifications = async () => {
    try {
      const r = await fetch("/api/doctor/notifications/unread");
      if (!r.ok) return;
      const data: { count: number; latest: NotificationItem[] } = await r.json();
      setNotifications(data.latest);

      const lastSeenRaw = localStorage.getItem(LAST_SEEN_KEY);
      const lastSeen = lastSeenRaw ? new Date(lastSeenRaw) : null;

      if (!lastSeen) {
        setUnreadNotifCount(data.count);
      } else {
        const unseen = data.latest.filter(
          (n) => new Date(n.createdAt) > lastSeen
        ).length;
        setUnreadNotifCount(unseen);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  // Close bell dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Mark notifications as seen when bell opens or navigating to /rendez-vous
  const markSeen = () => {
    localStorage.setItem(LAST_SEEN_KEY, new Date().toISOString());
    setUnreadNotifCount(0);
  };

  const handleBellClick = () => {
    setBellOpen((prev) => !prev);
    markSeen();
  };

  // Also mark seen when visiting /rendez-vous
  useEffect(() => {
    if (pathname === "/rendez-vous" || pathname.startsWith("/rendez-vous/")) {
      markSeen();
    }
  }, [pathname]);

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setOpen(!open)}
        className="md:hidden fixed top-4 left-4 z-50 bg-gray-900 text-white p-2 rounded-lg"
        aria-label={open ? t("closeMenu") : t("openMenu")}
      >
        {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Sidebar */}
      <aside
        data-tour="sidebar-nav"
        className={`
          fixed md:static inset-y-0 left-0 z-40
          w-56 bg-gray-900 text-white p-4 flex flex-col
          transform transition-transform duration-200
          ${open ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        {/* Header with bell */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold">Doktori</h2>
          <div ref={bellRef} className="relative">
            <button
              onClick={handleBellClick}
              aria-label="Notifications nouvelles réservations"
              className="relative flex h-8 w-8 items-center justify-center rounded-lg text-teal-300 hover:bg-gray-800 transition-colors"
            >
              <Bell className="h-4 w-4" strokeWidth={2} />
              {unreadNotifCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white leading-none">
                  {unreadNotifCount > 9 ? "9+" : unreadNotifCount}
                </span>
              )}
            </button>

            <AnimatePresence>
              {bellOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-0 top-10 z-50 w-72 rounded-2xl bg-white shadow-xl border border-gray-100 overflow-hidden"
                >
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                      Nouvelles réservations (24h)
                    </p>
                  </div>
                  {notifications.length === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-gray-400">
                      Aucune nouvelle réservation
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-50">
                      {notifications.map((n) => (
                        <Link
                          key={n.id}
                          href="/rendez-vous"
                          onClick={() => {
                            setBellOpen(false);
                            markSeen();
                          }}
                          className="flex flex-col gap-0.5 px-4 py-3 hover:bg-gray-50 transition-colors"
                        >
                          <span className="text-sm font-semibold text-gray-900">
                            Nouveau RDV : {n.patientName}
                          </span>
                          <span className="text-xs text-gray-500">
                            {format(new Date(n.startsAt), "EEE d MMM, HH:mm", { locale: fr })}
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                  <div className="px-4 py-2 border-t border-gray-100">
                    <Link
                      href="/rendez-vous"
                      onClick={() => {
                        setBellOpen(false);
                        markSeen();
                      }}
                      className="block text-center text-xs font-semibold text-teal-600 hover:text-teal-700 py-1"
                    >
                      Voir tous les rendez-vous
                    </Link>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <nav className="space-y-0.5 flex-1 overflow-y-auto">
          {links.map((l) => {
            const active =
              pathname === l.href || pathname.startsWith(l.href + "/");
            const showBadge = l.href === "/messages" && unreadCount > 0;
            return (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={`flex items-center justify-between px-3 py-2 rounded text-sm transition-colors ${
                  active
                    ? "bg-teal-600 text-white font-medium"
                    : "text-slate-300 hover:bg-gray-800"
                }`}
              >
                <span>{l.label}</span>
                {showBadge && (
                  <span className="ml-2 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
                {"dot" in l && l.dot && !showBadge && (
                  <span className="ml-2 w-2 h-2 rounded-full bg-red-500 shrink-0" />
                )}
              </Link>
            );
          })}
        </nav>
        {userName && (
          <p className="text-xs text-gray-500 mt-auto pt-4 truncate">
            {userName}
          </p>
        )}
      </aside>

      {/* Backdrop on mobile */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}
    </>
  );
}
