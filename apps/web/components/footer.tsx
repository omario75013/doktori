import Link from "next/link";
import { Mail, Stethoscope } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { NewsletterSignup } from "./newsletter-signup";

export async function Footer() {
  const t = await getTranslations("footer");
  const locale = await getLocale();
  const platformLinks = [
    { key: "about", href: "/a-propos" },
    { key: "blog", href: "/blog" },
    { key: "faq", href: "/faq" },
    { key: "sos", href: "/sos-medecin" },
  ] as const;
  const legalLinks = [
    { key: "terms", href: "/legal/mentions" },
    { key: "cgu", href: "/legal/cgu" },
    { key: "privacy", href: "/legal/confidentialite" },
  ] as const;

  return (
    <footer className="w-full border-t-2 border-t-[#0891B2] bg-[#134E4A] text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          <div className="sm:col-span-2 lg:col-span-1 space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-white/15 flex items-center justify-center">
                <Stethoscope className="h-5 w-5 text-white" strokeWidth={2} />
              </div>
              <span className="text-xl font-black tracking-tight">Doktori</span>
            </div>
            <p className="text-sm text-white/60 leading-relaxed max-w-xs">{t("tagline")}</p>
            <a
              href="mailto:contact@doktori.tn"
              className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
            >
              <Mail className="h-4 w-4" />
              contact@doktori.tn
            </a>
          </div>

          <div className="space-y-4">
            <p className="text-xs font-bold uppercase tracking-widest text-white/40">
              {t("platformTitle")}
            </p>
            <ul className="space-y-2.5">
              {platformLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/70 hover:text-white transition-colors"
                  >
                    {t(`platform.${link.key}` as Parameters<typeof t>[0])}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-4">
            <p className="text-xs font-bold uppercase tracking-widest text-white/40">
              {t("legalTitle")}
            </p>
            <ul className="space-y-2.5">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/70 hover:text-white transition-colors"
                  >
                    {t(`legal.${link.key}` as Parameters<typeof t>[0])}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-4">
            <p className="text-xs font-bold uppercase tracking-widest text-white/40">
              {t("doctorSpaceTitle")}
            </p>
            <p className="text-sm text-white/70 leading-relaxed">{t("doctorSpaceCopy")}</p>
            <Link
              href="/connexion"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0891B2] hover:bg-[#0891B2]/80 text-white text-sm font-semibold transition-colors"
            >
              <Stethoscope className="h-4 w-4" />
              {t("doctorSpaceCta")}
            </Link>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-2">
                {t("newsletterTitle")}
              </p>
              <p className="text-sm text-white/70">{t("newsletterCopy")}</p>
            </div>
            <div className="bg-white rounded-xl p-3">
              <NewsletterSignup variant="compact" source="footer" language={locale === "ar" ? "ar" : "fr"} />
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-white/10">
          <p className="text-xs text-white/40 text-center">
            © 2025-2026 Random Walkers SUARL · Doktori.tn
          </p>
        </div>
      </div>
    </footer>
  );
}
