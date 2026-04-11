import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { Stethoscope, Search, UserRound, Siren } from "lucide-react";
import { LanguageSwitcher } from "./language-switcher";

export async function Navbar() {
  const t = await getTranslations("nav");
  const locale = await getLocale();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-100/80 bg-white/80 backdrop-blur-md supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="group flex items-center gap-2 text-xl font-extrabold tracking-tight text-gray-900"
        >
          <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-sm ring-1 ring-blue-600/20 transition-all group-hover:shadow-md group-hover:ring-blue-600/40">
            <Stethoscope className="h-5 w-5" strokeWidth={2.5} />
            <span className="absolute -right-0.5 -top-0.5 flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
            </span>
          </span>
          <span>
            Doktori<span className="text-blue-600">.tn</span>
          </span>
        </Link>
        <nav className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/recherche"
            className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 sm:inline-flex"
          >
            <Search className="h-4 w-4" />
            {t("search")}
          </Link>
          <Link
            href="/sos"
            className="group hidden items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-600 transition-all hover:bg-red-100 md:inline-flex"
          >
            <Siren className="h-4 w-4" />
            SOS
          </Link>
          <LanguageSwitcher currentLocale={locale} />
          <Link
            href="/connexion"
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-800 shadow-sm transition-all hover:border-gray-300 hover:shadow-md sm:px-4"
          >
            <UserRound className="h-4 w-4" />
            <span className="hidden sm:inline">{t("doctorArea")}</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
