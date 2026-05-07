"use client";

/**
 * Patient navigation menu — replaces the static "Mon compte" link in the
 * global Navbar with a context-aware version:
 * - Not logged in: link to /connexion-patient (same as before).
 * - Logged in: avatar + dropdown with all patient destinations.
 *
 * Detected via the same `doktori_patient_token` localStorage key the rest of
 * the app uses (see patient-shell-wrapper.tsx). Polled on pathname change.
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

interface PatientNavMenuProps {
  /** Translated label for the unauthenticated case. Pass from the server. */
  myAccountLabel: string;
}

export function PatientNavMenu({ myAccountLabel }: PatientNavMenuProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [me, setMe] = useState<Me>(null);
  const [open, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    try {
      const token = localStorage.getItem("doktori_patient_token");
      if (!token) {
        setMe(null);
        return;
      }
      fetch("/api/patients/me", { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data) setMe({ id: data.id, name: data.name, phone: data.phone, photoUrl: data.photoUrl });
          else setMe(null);
        })
        .catch(() => setMe(null));
    } catch {
      // localStorage unavailable
    }
  }, [pathname]);

  function logout() {
    try {
      localStorage.removeItem("doktori_patient_token");
    } catch {
      /* ignore */
    }
    setMe(null);
    setOpen(false);
    router.push("/connexion-patient");
  }

  // Before hydration, render the unauthenticated link to keep SSR/CSR markup
  // consistent (avoids a hydration mismatch flash).
  if (!hydrated || !me) {
    return (
      <Link
        href="/connexion-patient"
        className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-primary sm:inline-flex"
      >
        <UserRound className="h-4 w-4" strokeWidth={2.5} />
        {myAccountLabel}
      </Link>
    );
  }

  const initials = me.name
    ? me.name
        .split(/\s+/)
        .map((p) => p[0]?.toUpperCase())
        .slice(0, 2)
        .join("")
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
            {/* Backdrop to close on outside click */}
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
              <MenuLink href="/mes-messages" icon={MessageCircle} onClick={() => setOpen(false)}>
                Mes messages
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
                <LogOut className="h-4 w-4" />
                Déconnexion
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
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      role="menuitem"
      className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"
    >
      <Icon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
      {children}
    </Link>
  );
}
