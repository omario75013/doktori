"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Home,
  Calendar,
  FolderOpen,
  FileText,
  User,
  Search,
  Pill,
  Heart,
  Siren,
  MoreHorizontal,
  Settings,
  Bell,
  Lock,
  LogOut,
  ShieldCheck,
  Microscope,
} from "lucide-react";

type Me = {
  id: string;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  photoUrl?: string | null;
} | null;

const NAV_ITEMS = [
  { href: "/mon-espace", icon: Home, key: "home" },
  { href: "/mes-rdv", icon: Calendar, key: "appointments" },
  { href: "/dossier-medical", icon: FolderOpen, key: "medicalFile" },
  { href: "/mes-documents", icon: FileText, key: "documents" },
  { href: "/parametres/compte", icon: User, key: "profile" },
] as const;

const SHORTCUT_ITEMS = [
  { href: "/recherche", icon: Search, key: "findDoctor" },
  { href: "/dossier-medical/traitements", icon: Pill, key: "treatments" },
  { href: "/ma-famille", icon: Heart, key: "family" },
] as const;

export function PatientSidebar() {
  const t = useTranslations("patient.sidebar");
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<Me>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [favs, setFavs] = useState<
    Array<{ doctorSlug: string; doctorName: string; doctorSpecialty?: string | null; doctorPhotoUrl?: string | null }>
  >([]);
  const [favOpen, setFavOpen] = useState(true);

  useEffect(() => {
    fetch("/api/me/favorites", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => setFavs(Array.isArray(d.items) ? d.items : []))
      .catch(() => {});
  }, [pathname]);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/patients/me", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setMe({
            id: data.id,
            name: data.name,
            phone: data.phone,
            email: data.email,
            photoUrl: data.photoUrl,
          });
        }
      })
      .catch(() => {});
  }, [pathname]);

  // Close menu on outside click + on route change
  useEffect(() => setMenuOpen(false), [pathname]);
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [menuOpen]);

  function logout() {
    try { localStorage.removeItem("doktori_patient_token"); } catch {}
    try { sessionStorage.removeItem("doktori_patient_session"); } catch {}
    fetch("/api/auth/patient-logout", { method: "POST", credentials: "include" })
      .catch(() => {})
      .finally(() => {
        setMenuOpen(false);
        router.push("/connexion-patient");
        router.refresh();
      });
  }

  function isActive(href: string) {
    if (href === "/mon-espace") return pathname === "/mon-espace";
    return pathname === href || pathname.startsWith(href + "/");
  }

  const initials = me?.name
    ? me.name
        .split(/\s+/)
        .map((p) => p[0]?.toUpperCase())
        .slice(0, 2)
        .join("")
    : "?";

  return (
    <aside className="sb">
      <Link href="/mon-espace" className="sb-brand">
        <div className="sb-logo">
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M5 3v6a4 4 0 0 0 8 0V3" />
            <path d="M9 13v3a5 5 0 0 0 10 0v-1" />
            <circle cx="19" cy="13" r="2.5" />
          </svg>
        </div>
        <div className="sb-brand-name">
          Doktori<span className="tld">.tn</span>
        </div>
      </Link>

      <div className="sb-section-label">{t("navigation")}</div>
      <nav className="sb-nav">
        {NAV_ITEMS.map((it) => {
          const Icon = it.icon;
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`sb-item ${isActive(it.href) ? "active" : ""}`}
            >
              <span className="sb-icon">
                <Icon className="w-5 h-5" strokeWidth={1.8} />
              </span>
              {t(`nav.${it.key}` as Parameters<typeof t>[0])}
            </Link>
          );
        })}
      </nav>

      <div className="sb-section-label">{t("shortcuts")}</div>
      <nav className="sb-nav">
        {SHORTCUT_ITEMS.map((it) => {
          const Icon = it.icon;
          return (
            <Link key={it.href} href={it.href} className="sb-item">
              <span className="sb-icon">
                <Icon className="w-5 h-5" strokeWidth={1.8} />
              </span>
              {t(`nav.${it.key}` as Parameters<typeof t>[0])}
            </Link>
          );
        })}
      </nav>

      {/* Favoris — list of starred doctors */}
      <div className="sb-section-label" style={{ marginTop: 8 }}>
        <button
          type="button"
          onClick={() => setFavOpen((v) => !v)}
          className="w-full text-start flex items-center justify-between"
          style={{ background: "transparent", border: 0, padding: 0, color: "inherit", cursor: "pointer", font: "inherit" }}
        >
          <span>{t("favorites")}{favs.length > 0 ? ` (${favs.length})` : ""}</span>
          <span aria-hidden style={{ fontSize: 10, opacity: 0.6 }}>{favOpen ? "▾" : "▸"}</span>
        </button>
      </div>
      {favOpen && (
        <nav className="sb-nav" aria-label={t("favorites")}>
          {favs.length === 0 ? (
            <Link
              href="/recherche"
              className="sb-item"
              style={{ color: "var(--ink-500)", fontStyle: "italic", fontSize: 12.5 }}
            >
              <Heart className="w-4 h-4" />
              {t("noFavoritesExplore")}
            </Link>
          ) : (
            favs.map((f) => {
              const href = `/medecin/${f.doctorSlug}`;
              const active = pathname === href;
              return (
                <Link key={f.doctorSlug} href={href} className={`sb-item ${active ? "is-active" : ""}`}>
                  {f.doctorPhotoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={f.doctorPhotoUrl}
                      alt={f.doctorName}
                      width={20}
                      height={20}
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        objectFit: "cover",
                        flexShrink: 0,
                      }}
                    />
                  ) : (
                    <Heart className="w-4 h-4" />
                  )}
                  <span className="truncate">{f.doctorName.replace(/^Dr\.?\s*/i, "")}</span>
                </Link>
              );
            })
          )}
          {favs.length > 0 && (
            <Link
              href="/favoris"
              className="sb-item"
              style={{ color: "var(--primary-600)", fontWeight: 700, fontSize: 12.5 }}
            >
              {t("viewAll")}
            </Link>
          )}
        </nav>
      )}

      <div className="sb-spacer" />

      <Link href="/sos" className="sb-sos">
        <span className="sos-pulse" />
        <Siren className="w-4 h-4" strokeWidth={2} />
        {t("emergencyCta")}
        <span style={{ marginInlineStart: "auto", opacity: 0.85, fontWeight: 600, fontSize: 12 }}>
          24/7
        </span>
      </Link>

      <div ref={menuRef} className="sb-user-wrap">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="sb-user"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
        >
          <div className="sb-avatar">
            {me?.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={me.photoUrl} alt={me.name ?? t("account")} />
            ) : (
              initials
            )}
          </div>
          <div className="sb-user-meta">
            <div className="sb-user-name">{me?.name ?? t("account")}</div>
            <div className="sb-user-sub">{me?.email ?? me?.phone ?? ""}</div>
          </div>
          <MoreHorizontal className="w-4 h-4 shrink-0" style={{ color: "var(--ink-400)" }} />
        </button>
        {menuOpen && (
          <div className="sb-user-menu" role="menu">
            <div className="sb-menu-section">{t("settings")}</div>
            <Link href="/parametres" className="sb-menu-item" role="menuitem">
              {t("allSettings")}
            </Link>
            <Link href="/parametres/compte" className="sb-menu-item" role="menuitem">
              <User className="w-4 h-4" />
              {t("myAccount")}
            </Link>
            <Link href="/parametres/notifications" className="sb-menu-item" role="menuitem">
              <Bell className="w-4 h-4" />
              {t("notifications")}
            </Link>
            <Link href="/parametres/securite" className="sb-menu-item" role="menuitem">
              <Lock className="w-4 h-4" />
              {t("security")}
            </Link>
            <Link href="/parametres/sessions" className="sb-menu-item" role="menuitem">
              <ShieldCheck className="w-4 h-4" />
              {t("sessions")}
            </Link>
            <Link href="/parametres/confidentialite" className="sb-menu-item" role="menuitem">
              <Settings className="w-4 h-4" />
              {t("privacy")}
            </Link>
            <Link href="/parametres/recherche-medicale" className="sb-menu-item" role="menuitem">
              <Microscope className="w-4 h-4" />
              {t("medicalResearch")}
            </Link>
            <div className="sb-menu-sep" />
            <button
              type="button"
              onClick={logout}
              className="sb-menu-item sb-menu-danger"
              role="menuitem"
            >
              <LogOut className="w-4 h-4" />
              {t("logout")}
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
