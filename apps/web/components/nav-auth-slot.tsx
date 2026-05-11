"use client";

/**
 * Single client-resolved slot for the patient/doctor auth controls in the
 * global Navbar. Always renders a skeleton on first paint (server + client
 * markup match), then asynchronously resolves to either the avatar dropdown
 * (patient cookie present) or the "Mon compte" + "Espace médecin" buttons
 * (no patient session).
 *
 * This avoids hydration mismatches: the SSR HTML is deterministic and never
 * depends on whether the cookie was readable at request time.
 */

import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Calendar,
  FileText,
  MessageCircle,
  HeartHandshake,
  Sparkles,
  Settings,
  LogOut,
  ChevronDown,
  UserRound,
} from "lucide-react";

type Me = { id: string; name?: string; phone?: string; photoUrl?: string | null } | null;

interface Props {
  myAccountLabel: string;
  doctorAreaLabel: string;
}

export function NavAuthSlot({ myAccountLabel, doctorAreaLabel }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [me, setMe] = useState<Me>(null);
  const [resolved, setResolved] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // One-time migration: a previous build wrote the patient JWT into
    // localStorage. Move it to the cookie via /api/patients/me, then strip
    // it so the JWT no longer sits in XSS-readable storage.
    let legacyJwt: string | null = null;
    try { legacyJwt = localStorage.getItem("doktori_patient_token"); } catch { /* ignore */ }

    fetch("/api/patients/me", { credentials: "include" })
      .then(async (r) => {
        if (r.ok) return r.json();
        if (!legacyJwt) return null;
        const r2 = await fetch("/api/patients/me", {
          credentials: "include",
          headers: { Authorization: `Bearer ${legacyJwt}` },
        });
        return r2.ok ? r2.json() : null;
      })
      .then((data) => {
        if (cancelled) return;
        if (data) {
          setMe({ id: data.id, name: data.name, phone: data.phone, photoUrl: data.photoUrl });
          try { localStorage.removeItem("doktori_patient_token"); } catch { /* ignore */ }
          try { sessionStorage.setItem("doktori_patient_session", "1"); } catch { /* ignore */ }
        } else {
          setMe(null);
          try { localStorage.removeItem("doktori_patient_token"); } catch { /* ignore */ }
          try { sessionStorage.removeItem("doktori_patient_session"); } catch { /* ignore */ }
        }
        setResolved(true);
      })
      .catch(() => {
        if (cancelled) return;
        setMe(null);
        setResolved(true);
      });
    return () => { cancelled = true; };
  }, [pathname]);

  function logout() {
    try { localStorage.removeItem("doktori_patient_token"); } catch { /* ignore */ }
    try { sessionStorage.removeItem("doktori_patient_session"); } catch { /* ignore */ }
    fetch("/api/auth/patient-logout", { method: "POST", credentials: "include" })
      .catch(() => {})
      .finally(() => {
        setMe(null);
        setOpen(false);
        router.push("/connexion-patient");
        router.refresh();
      });
  }

  // 1. Loading skeleton — single avatar circle, deterministic across SSR/CSR.
  if (!resolved) {
    return (
      <span aria-hidden className="inline-flex items-center gap-1 p-1">
        <span className="h-8 w-8 rounded-full bg-gray-200 animate-pulse dark:bg-gray-700" />
      </span>
    );
  }

  // 2. Unauthenticated — show "Mon compte" + "Espace médecin".
  if (!me) {
    return (
      <>
        <Link
          href="/connexion-patient"
          className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-primary sm:inline-flex"
        >
          <UserRound className="h-4 w-4" strokeWidth={2.5} />
          {myAccountLabel}
        </Link>
        <Link
          href="/connexion"
          aria-label={doctorAreaLabel}
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border-2 border-primary bg-white px-2 sm:px-4 text-sm font-bold text-primary transition-all hover:bg-primary hover:text-white"
        >
          <UserRound className="h-4 w-4" strokeWidth={2.5} />
          <span className="hidden sm:inline">{doctorAreaLabel}</span>
        </Link>
      </>
    );
  }

  // 3. Authenticated patient — avatar dropdown only.
  const initials = me.name
    ? me.name.split(/\s+/).map((p) => p[0]?.toUpperCase()).slice(0, 2).join("")
    : "?";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 rounded-full p-1 hover:bg-gray-100 dark:hover:bg-gray-800"
        aria-label="Menu patient"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {me.photoUrl ? (
          <Image
            src={me.photoUrl}
            alt={me.name ?? "Patient"}
            width={32}
            height={32}
            className="h-8 w-8 rounded-full object-cover"
          />
        ) : (
          <span className="h-8 w-8 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">
            {initials}
          </span>
        )}
        <ChevronDown className="h-3 w-3 text-gray-500" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <button
              type="button"
              aria-hidden
              tabIndex={-1}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 cursor-default bg-transparent"
            />
            <motion.div
              role="menu"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.12 }}
              className="absolute right-0 top-12 z-50 w-60 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900"
            >
              <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
                <p className="truncate text-sm font-semibold text-foreground dark:text-white">
                  {me.name ?? "Mon espace"}
                </p>
                {me.phone && (
                  <p className="truncate text-xs text-gray-500 dark:text-gray-400">{me.phone}</p>
                )}
              </div>
              <MenuLink href="/mon-espace" icon={User} onClick={() => setOpen(false)}>
                Mon espace
              </MenuLink>
              <MenuLink href="/mes-rdv" icon={Calendar} onClick={() => setOpen(false)}>
                Mes rendez-vous
              </MenuLink>
              <MenuLink href="/dossier-medical" icon={FileText} onClick={() => setOpen(false)}>
                Mon dossier médical
              </MenuLink>
              <MenuLink href="/mes-documents" icon={MessageCircle} onClick={() => setOpen(false)}>
                Mes documents
              </MenuLink>
              <MenuLink href="/coach-ia" icon={Sparkles} onClick={() => setOpen(false)}>
                Coach IA
              </MenuLink>
              <MenuLink href="/mon-parrainage" icon={HeartHandshake} onClick={() => setOpen(false)}>
                Parrainage
              </MenuLink>
              <MenuLink href="/parametres/notifications" icon={Settings} onClick={() => setOpen(false)}>
                Paramètres
              </MenuLink>
              <button
                type="button"
                role="menuitem"
                onClick={logout}
                className="flex w-full items-center gap-3 border-t border-gray-100 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:border-gray-800 dark:hover:bg-red-900/20"
              >
                <LogOut className="h-4 w-4" strokeWidth={2.5} />
                Se déconnecter
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function MenuLink({
  href,
  icon: Icon,
  onClick,
  children,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-2 text-sm text-foreground transition-colors hover:bg-secondary dark:text-gray-200 dark:hover:bg-gray-800"
    >
      <Icon className="h-4 w-4 text-gray-500" strokeWidth={2.5} />
      {children}
    </Link>
  );
}
