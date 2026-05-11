"use client";

import Link from "next/link";
import { useLocale } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { useEffect, useState } from "react";
import { GlobalSearch } from "@/components/patient/global-search";

export function PatientTopbar() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Poll unread notifications every 30s so the bell badge stays current
  // without a websocket. Aligned with the existing 15s waiting-room polling.
  useEffect(() => {
    let alive = true;
    async function fetchUnread() {
      try {
        const r = await fetch("/api/me/notifications?unread=1&limit=20", {
          credentials: "include",
        });
        if (!r.ok) return;
        const data = await r.json();
        if (alive) setUnread(Array.isArray(data.items) ? data.items.length : 0);
      } catch {
        /* ignore */
      }
    }
    void fetchUnread();
    const iv = setInterval(fetchUnread, 30_000);
    const onFocus = () => void fetchUnread();
    window.addEventListener("focus", onFocus);
    return () => {
      alive = false;
      clearInterval(iv);
      window.removeEventListener("focus", onFocus);
    };
  }, [pathname]);

  function setLocale(next: "fr" | "ar") {
    if (next === locale) return;
    const url = new URL(window.location.href);
    url.searchParams.set("lang", next);
    document.cookie = `NEXT_LOCALE=${next}; path=/; max-age=${60 * 60 * 24 * 365}`;
    router.refresh();
  }

  return (
    <div className={`tb ${scrolled ? "is-scrolled" : ""}`}>
      <GlobalSearch
        placeholder={
          locale === "ar"
            ? "ابحث في كل الوحدات…"
            : "Rechercher médecins, RDV, documents, proches…"
        }
      />
      <div className="tb-spacer" />
      <div className="tb-lang" role="group" aria-label="Language">
        <button
          type="button"
          className={locale === "fr" ? "on" : ""}
          onClick={() => setLocale("fr")}
        >
          FR
        </button>
        <button
          type="button"
          className={locale === "ar" ? "on" : ""}
          onClick={() => setLocale("ar")}
        >
          AR
        </button>
      </div>
      <Link
        href="/mes-notifications"
        className="tb-icon-btn relative"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" strokeWidth={1.8} />
        {unread > 0 && (
          <span
            className="absolute -top-0.5 -end-0.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center"
            style={{
              background: "#EF4444",
              color: "#fff",
              border: "2px solid var(--bg, #fff)",
              lineHeight: 1,
            }}
            aria-label={`${unread} notifications non lues`}
          >
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </Link>
    </div>
  );
}
