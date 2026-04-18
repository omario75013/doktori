"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { useTranslations } from "next-intl";

export function SidebarNav({ userName }: { userName?: string | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const t = useTranslations("medecin.nav");

  const links = [
    { href: "/dashboard", label: t("dashboard") },
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
    { href: "/profil", label: t("profil") },
  ];

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
        <h2 className="text-lg font-bold mb-6">Doktori</h2>
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
