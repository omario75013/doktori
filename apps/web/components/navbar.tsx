import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { Stethoscope, Search, UserRound, Siren, HelpCircle } from "lucide-react";
import { LanguageSwitcher } from "./language-switcher";

export async function Navbar() {
  const t = await getTranslations("nav");
  const locale = await getLocale();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#E6F4F1] bg-white/90 backdrop-blur-md supports-[backdrop-filter]:bg-white/75">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="group flex items-center gap-2 font-heading text-xl font-black tracking-tight text-[#134E4A]"
        >
          <span className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-[#0891B2] text-white shadow-sm ring-1 ring-[#0891B2]/20 transition-all group-hover:bg-[#0E7490]">
            <Stethoscope className="h-5 w-5" strokeWidth={2.5} />
            <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#22C55E] opacity-75"></span>
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#22C55E] ring-2 ring-white"></span>
            </span>
          </span>
          <span>
            Doktori<span className="text-[#0891B2]">.tn</span>
          </span>
        </Link>
        <nav className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/recherche"
            className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-[#5E7574] transition-colors hover:bg-[#F0FDFA] hover:text-[#0891B2] sm:inline-flex"
          >
            <Search className="h-4 w-4" strokeWidth={2.5} />
            {t("search")}
          </Link>
          <Link
            href="/faq"
            className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-[#5E7574] transition-colors hover:bg-[#F0FDFA] hover:text-[#0891B2] md:inline-flex"
          >
            <HelpCircle className="h-4 w-4" strokeWidth={2.5} />
            {t("faq")}
          </Link>
          <Link
            href="/sos"
            className="group hidden items-center gap-1.5 rounded-lg bg-[#DC2626] px-4 py-2 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#B91C1C] md:inline-flex"
          >
            <Siren className="h-4 w-4" strokeWidth={2.5} />
            {t("sos")}
          </Link>
          <LanguageSwitcher currentLocale={locale} />
          <Link
            href="/connexion"
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border-2 border-[#0891B2] bg-white px-4 text-sm font-bold text-[#0891B2] transition-all hover:bg-[#0891B2] hover:text-white"
          >
            <UserRound className="h-4 w-4" strokeWidth={2.5} />
            <span className="hidden sm:inline">{t("doctorArea")}</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
