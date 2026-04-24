"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { User, Settings, LogOut, ChevronDown } from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { PatientBottomNav } from "@/components/patient-bottom-nav";

const PUBLIC_PREFIXES = [
  "/recherche",
  "/rdv",
  "/connexion-patient",
  "/inscription-patient",
  "/avis",
  "/medecin",
  "/domicile",
  "/teleconsult",
];

type Me = { id: string; name?: string; phone: string; photoUrl?: string | null } | null;

export function PatientShellWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<Me>(null);
  const [locale, setLocale] = useState("fr");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const match = document.cookie.match(/NEXT_LOCALE=([^;]+)/);
    if (match) setLocale(match[1]);
    try {
      const token = localStorage.getItem("doktori_patient_token");
      if (!token) return;
      // Ping /api/patients/me if exists, else decode minimally from token payload
      fetch("/api/patients/me", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data) setMe({ id: data.id, name: data.name, phone: data.phone, photoUrl: data.photoUrl });
        })
        .catch(() => {});
    } catch {
      /* localStorage unavailable */
    }
  }, [pathname]);

  const isPublic = PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
  const showShell = !!me && !isPublic;

  function logout() {
    try {
      localStorage.removeItem("doktori_patient_token");
    } catch {
      /* ignore */
    }
    setMe(null);
    router.push("/connexion-patient");
  }

  const initials = me?.name
    ? me.name
        .split(/\s+/)
        .map((p) => p[0]?.toUpperCase())
        .slice(0, 2)
        .join("")
    : "?";

  return (
    <div className={showShell ? "min-h-screen flex flex-col pb-16 md:pb-0" : undefined}>
      {showShell && (
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-gray-200 bg-white/90 backdrop-blur px-4">
          <Link href="/mon-espace" className="flex items-center gap-2 font-semibold text-foreground">
            <span className="text-base">Doktori</span>
            <span className="text-primary">.tn</span>
          </Link>
          <div className="flex items-center gap-2">
            <LanguageSwitcher currentLocale={locale} />
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="inline-flex items-center gap-1 rounded-full p-1 hover:bg-gray-100"
                aria-label="Menu"
              >
                {me?.photoUrl ? (
                  <Image
                    src={me.photoUrl}
                    alt={me.name ?? "Patient"}
                    width={32}
                    height={32}
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <span className="h-8 w-8 rounded-full bg-teal-600 text-white text-xs font-bold flex items-center justify-center">
                    {initials}
                  </span>
                )}
                <ChevronDown className="h-3 w-3 text-gray-500" />
              </button>

              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.12 }}
                    className="absolute right-0 top-11 z-40 w-56 rounded-2xl bg-white shadow-xl border border-gray-100 overflow-hidden"
                  >
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {me?.name ?? "Mon espace"}
                      </p>
                      {me?.phone && <p className="text-xs text-gray-500 truncate">{me.phone}</p>}
                    </div>
                    <Link
                      href="/mon-espace"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <User className="h-4 w-4" />
                      Mon espace
                    </Link>
                    <Link
                      href="/mon-espace"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Settings className="h-4 w-4" />
                      Paramètres
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 border-t border-gray-100"
                    >
                      <LogOut className="h-4 w-4" />
                      Déconnexion
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>
      )}

      <div className="flex-1">{children}</div>

      {showShell && <PatientBottomNav />}
    </div>
  );
}
