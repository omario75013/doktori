import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { Stethoscope, Search, UserRound, Siren, HelpCircle, BookOpen } from "lucide-react";
import { LanguageSwitcher } from "./language-switcher";
import { ThemeToggle } from "./theme-toggle";
import { PatientNavMenu } from "./patient-nav-menu";

export async function Navbar() {
  const t = await getTranslations("nav");
  const locale = await getLocale();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border dark:border-gray-700 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md supports-[backdrop-filter]:bg-white/75 dark:supports-[backdrop-filter]:bg-gray-900/75">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="group flex items-center gap-2 font-heading text-xl font-black tracking-tight text-foreground dark:text-white"
        >
          <span className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white shadow-sm ring-1 ring-primary/20 transition-all group-hover:bg-doktori-teal-dark">
            <Stethoscope className="h-5 w-5" strokeWidth={2.5} />
            <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75"></span>
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent ring-2 ring-white"></span>
            </span>
          </span>
          <span>
            Doktori<span className="text-primary">.tn</span>
          </span>
        </Link>
        <nav className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/recherche"
            className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-primary sm:inline-flex"
          >
            <Search className="h-4 w-4" strokeWidth={2.5} />
            {t("search")}
          </Link>
          <Link
            href="/blog"
            className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-primary md:inline-flex"
          >
            <BookOpen className="h-4 w-4" strokeWidth={2.5} />
            {t("blog")}
          </Link>
          <Link
            href="/faq"
            className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-primary md:inline-flex"
          >
            <HelpCircle className="h-4 w-4" strokeWidth={2.5} />
            {t("faq")}
          </Link>
          <Link
            href="/sos"
            className="group hidden items-center gap-1.5 rounded-lg bg-destructive px-4 py-2 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#B91C1C] md:inline-flex"
          >
            <Siren className="h-4 w-4" strokeWidth={2.5} />
            {t("sos")}
          </Link>
          <ThemeToggle />
          <LanguageSwitcher currentLocale={locale} />
          <PatientNavMenu myAccountLabel={t("myAccount")} />
          <Link
            href="/connexion"
            aria-label={t("doctorArea")}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border-2 border-primary bg-white px-2 sm:px-4 text-sm font-bold text-primary transition-all hover:bg-primary hover:text-white"
          >
            <UserRound className="h-4 w-4" strokeWidth={2.5} />
            <span className="hidden sm:inline">{t("doctorArea")}</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
