import Link from "next/link";
import { Mail, Stethoscope } from "lucide-react";
import { NewsletterSignup } from "./newsletter-signup";

const FOOTER_LINKS = {
  platform: {
    title: "Plateforme",
    links: [
      { label: "À propos", href: "/a-propos" },
      { label: "Blog", href: "/blog" },
      { label: "FAQ", href: "/faq" },
      { label: "SOS Médecin", href: "/sos-medecin" },
    ],
  },
  legal: {
    title: "Légal",
    links: [
      { label: "Mentions légales", href: "/legal/mentions" },
      { label: "CGU", href: "/legal/cgu" },
      { label: "Politique de confidentialité", href: "/legal/confidentialite" },
    ],
  },
};

export function Footer() {
  return (
    <footer className="w-full border-t-2 border-t-[#0891B2] bg-[#134E4A] text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand column */}
          <div className="sm:col-span-2 lg:col-span-1 space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-white/15 flex items-center justify-center">
                <Stethoscope className="h-5 w-5 text-white" strokeWidth={2} />
              </div>
              <span className="text-xl font-black tracking-tight">Doktori</span>
            </div>
            <p className="text-sm text-white/60 leading-relaxed max-w-xs">
              La prise de rendez-vous médicaux en Tunisie
            </p>
            <a
              href="mailto:contact@doktori.tn"
              className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
            >
              <Mail className="h-4 w-4" />
              contact@doktori.tn
            </a>
          </div>

          {/* Platform links */}
          <div className="space-y-4">
            <p className="text-xs font-bold uppercase tracking-widest text-white/40">
              {FOOTER_LINKS.platform.title}
            </p>
            <ul className="space-y-2.5">
              {FOOTER_LINKS.platform.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/70 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal links */}
          <div className="space-y-4">
            <p className="text-xs font-bold uppercase tracking-widest text-white/40">
              {FOOTER_LINKS.legal.title}
            </p>
            <ul className="space-y-2.5">
              {FOOTER_LINKS.legal.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/70 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Doctor CTA */}
          <div className="space-y-4">
            <p className="text-xs font-bold uppercase tracking-widest text-white/40">
              Espace médecin
            </p>
            <p className="text-sm text-white/70 leading-relaxed">
              Vous êtes médecin et souhaitez rejoindre Doktori ?
            </p>
            <Link
              href="/connexion"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0891B2] hover:bg-[#0891B2]/80 text-white text-sm font-semibold transition-colors"
            >
              <Stethoscope className="h-4 w-4" />
              Espace médecin
            </Link>
          </div>
        </div>

        {/* Newsletter signup band */}
        <div className="mt-12 pt-8 border-t border-white/10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-2">Newsletter santé</p>
              <p className="text-sm text-white/70">
                Recevez chaque mois nos meilleurs conseils santé et nouveautés Doktori.
              </p>
            </div>
            <div className="bg-white rounded-xl p-3">
              <NewsletterSignup variant="compact" source="footer" language="fr" />
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 pt-6 border-t border-white/10">
          <p className="text-xs text-white/40 text-center">
            © 2025-2026 Random Walkers SUARL · Doktori.tn
          </p>
        </div>
      </div>
    </footer>
  );
}
