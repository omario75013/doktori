import Link from "next/link";
import {
  User,
  Bell,
  Shield,
  Search as SearchIcon,
  Eye,
  Smartphone,
  ChevronRight,
} from "lucide-react";

interface Item {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  sub: string;
}

const GROUPS: Array<{ title: string; items: Item[] }> = [
  {
    title: "Compte",
    items: [
      {
        href: "/parametres/compte",
        icon: User,
        label: "Mon compte",
        sub: "Profil, état civil, contact d'urgence, photos",
      },
      {
        href: "/parametres/securite",
        icon: Shield,
        label: "Sécurité",
        sub: "Mot de passe, téléphone, 2FA, email",
      },
      {
        href: "/parametres/sessions",
        icon: Smartphone,
        label: "Sessions",
        sub: "Appareils connectés à votre compte",
      },
    ],
  },
  {
    title: "Préférences",
    items: [
      {
        href: "/parametres/notifications",
        icon: Bell,
        label: "Notifications & rappels",
        sub: "Canaux et fréquence (RDV, vaccins, traitements)",
      },
      {
        href: "/parametres/recherche-medicale",
        icon: SearchIcon,
        label: "Recherche médicale",
        sub: "Vos préférences pour les recommandations",
      },
      {
        href: "/parametres/confidentialite",
        icon: Eye,
        label: "Confidentialité",
        sub: "Données, partage anonymisé, suppression du compte",
      },
    ],
  },
];

export default function ParametresIndexPage() {
  return (
    <>
      <div className="mb-6">
        <div className="ds-eyebrow">PARAMÈTRES</div>
        <h1 className="ds-page-title">Paramètres</h1>
        <p className="ds-page-sub">
          Toutes les options de votre compte Doktori au même endroit.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {GROUPS.map((g) => (
          <section key={g.title} className="ds-card-patient" style={{ padding: 18 }}>
            <div
              className="text-[11px] font-bold uppercase tracking-wider mb-3"
              style={{ color: "var(--ink-400)" }}
            >
              {g.title}
            </div>
            <div className="flex flex-col">
              {g.items.map((it, idx) => {
                const Icon = it.icon;
                return (
                  <Link
                    key={it.href}
                    href={it.href}
                    className="flex items-center gap-3 py-3"
                    style={{
                      borderBottom:
                        idx === g.items.length - 1
                          ? "none"
                          : "1px solid var(--line-cool)",
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl grid place-items-center shrink-0"
                      style={{
                        background: "var(--primary-50)",
                        color: "var(--primary-600)",
                      }}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div
                        className="font-bold text-[14px]"
                        style={{ color: "var(--ink-900)" }}
                      >
                        {it.label}
                      </div>
                      <div
                        className="text-[12.5px] truncate"
                        style={{ color: "var(--ink-500)" }}
                      >
                        {it.sub}
                      </div>
                    </div>
                    <ChevronRight
                      className="w-4 h-4 shrink-0"
                      style={{ color: "var(--ink-400)" }}
                    />
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
