"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { User as UserIcon, Settings, LogOut, ChevronDown, Repeat } from "lucide-react";
import { useTranslations } from "next-intl";
import { signOut } from "next-auth/react";

type Role = "doctor" | "admin" | "clinic" | "secretary" | "patient";

type Props = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role: Role;
};

function profileHrefFor(role: Role): string {
  switch (role) {
    case "doctor":
      return "/profil";
    case "admin":
      return "/admin/profil";
    case "clinic":
      return "/clinique/profil";
    case "secretary":
      return "/secretaire/profil";
    default:
      return "/mon-espace";
  }
}

function settingsHrefFor(role: Role): string {
  switch (role) {
    case "doctor":
      return "/profil";
    case "admin":
      return "/admin/systeme";
    case "clinic":
      return "/clinique/parametres";
    case "secretary":
      return "/secretaire/profil";
    default:
      return "/mon-espace";
  }
}

export function ProfileMenu({ name, email, image, role }: Props) {
  const [open, setOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const t = useTranslations("common");

  useEffect(() => {
    try {
      // Persist the desktop flag on first visit if URL says so
      const params = new URLSearchParams(window.location.search);
      if (params.get("app") === "desktop") {
        localStorage.setItem("doktori.app", "desktop");
      }
      setIsDesktop(localStorage.getItem("doktori.app") === "desktop");
    } catch {
      /* storage disabled */
    }
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const initials =
    (name ?? email ?? "?")
      .split(/\s+/)
      .map((p) => p[0]?.toUpperCase())
      .slice(0, 2)
      .join("") || "?";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Ouvrir le menu profil"
        className="inline-flex items-center gap-2 rounded-full px-1 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        {image ? (
          <Image
            src={image}
            alt={name ?? "avatar"}
            width={36}
            height={36}
            className="h-9 w-9 rounded-full object-cover ring-2 ring-white dark:ring-gray-800"
          />
        ) : (
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-teal-600 text-white text-sm font-bold">
            {initials}
          </span>
        )}
        <ChevronDown className="h-4 w-4 text-gray-500" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute end-0 top-12 z-50 w-60 rounded-2xl bg-white dark:bg-gray-900 shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                {name ?? email ?? t("utilisateur")}
              </p>
              {email && (
                <p className="text-xs text-gray-500 truncate">{email}</p>
              )}
            </div>
            <div className="py-1">
              <Link
                href={profileHrefFor(role)}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <UserIcon className="h-4 w-4" />
                {t("profil")}
              </Link>
              <Link
                href={settingsHrefFor(role)}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <Settings className="h-4 w-4" />
                {t("parametres")}
              </Link>
            </div>
            {isDesktop && (
              <div className="py-1 border-t border-gray-100 dark:border-gray-800">
                <Link
                  href="/app-picker?picker=1"
                  onClick={() => {
                    try {
                      localStorage.removeItem("doktori.role");
                    } catch {
                      /* ignore */
                    }
                    setOpen(false);
                  }}
                  className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <Repeat className="h-4 w-4" />
                  {t("changerRole")}
                </Link>
              </div>
            )}
            <div className="py-1 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  signOut({ callbackUrl: isDesktop ? "/app-picker" : "/connexion" });
                }}
                className="flex w-full items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <LogOut className="h-4 w-4" />
                {t("deconnexion")}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
