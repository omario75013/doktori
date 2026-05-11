/**
 * Formulaires officiels CNAM Tunisie + liens services en ligne.
 *
 * Pourquoi cette page : la CNAM Tunisie n'a pas d'API publique de
 * télétransmission pour les soft tiers (le projet SEED arrive 2027 selon
 * La Presse 2026-01). En attendant, le médecin doit télécharger / imprimer
 * les formulaires officiels et les déposer manuellement (ou via espace pro
 * en ligne). Cette page centralise tous les liens utiles côté CNAM.
 *
 * Toutes les ressources pointent vers cnam.nat.tn — on n'héberge AUCUN
 * formulaire en local pour éviter le risque de désynchronisation avec les
 * mises à jour officielles + les questions de copyright.
 */

import Link from "next/link";
import {
  FileText,
  ExternalLink,
  Stethoscope,
  CreditCard,
  Users,
  Building2,
  Phone,
  Globe,
  AlertCircle,
} from "lucide-react";

interface FormItem {
  title: string;
  description: string;
  url: string;
  category: "soins" | "affiliation" | "convention" | "remboursement" | "autres";
}

interface ServiceLink {
  title: string;
  description: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
}

const FORMS: FormItem[] = [
  // Bulletins de soins
  {
    title: "Bulletin de Soins (BS1)",
    description:
      "Formulaire de remboursement des frais de soins ambulatoires. Mise à jour 2026 avec matricule fiscale.",
    url: "https://www.cnam.nat.tn/doc/upload/AP2.pdf",
    category: "soins",
  },
  {
    title: "Demande de prise en charge",
    description:
      "Demande préalable pour soins coûteux ou hospitalisation programmée.",
    url: "https://www.cnam.nat.tn/espace_ps.jsp",
    category: "soins",
  },

  // Affiliation
  {
    title: "Demande d'affiliation CNAM",
    description: "Inscription d'un nouvel assuré social au régime CNAM.",
    url: "https://www.cnam.nat.tn/espace_assure.jsp",
    category: "affiliation",
  },
  {
    title: "Demande de Carte Labess",
    description:
      "Carte électronique CNAM (e-carte). Déjà active hôpitaux publics, généralisation privé prévue 2027.",
    url: "https://www.cnam.nat.tn/espace_assure.jsp",
    category: "affiliation",
  },

  // Convention médecin
  {
    title: "Demande de convention médecin",
    description:
      "Pour devenir médecin conventionné CNAM (tiers payant).",
    url: "https://www.cnam.nat.tn/espace_ps.jsp",
    category: "convention",
  },
  {
    title: "Renouvellement convention",
    description: "Renouvellement annuel de la convention médecin / CNAM.",
    url: "https://www.cnam.nat.tn/espace_ps.jsp",
    category: "convention",
  },

  // Remboursement
  {
    title: "Demande de remboursement",
    description:
      "Pour patients hors tiers payant ayant payé directement les soins.",
    url: "https://www.cnam.nat.tn/espace_assure.jsp",
    category: "remboursement",
  },

  // Autres
  {
    title: "Tous les formulaires officiels",
    description:
      "Catalogue complet des formulaires CNAM mis à jour. À consulter pour cas spécifiques.",
    url: "https://www.cnam.nat.tn/espace_ps.jsp",
    category: "autres",
  },
];

const SERVICES: ServiceLink[] = [
  {
    title: "Espace Professionnel CNAM",
    description:
      "Portail officiel pour médecins conventionnés : suivi des bulletins, télétransmission via Espace Pro, états de paiement.",
    url: "https://www.cnam.nat.tn/espace_ps.jsp",
    icon: Stethoscope,
  },
  {
    title: "Espace Assuré Social",
    description:
      "Pour orienter vos patients : suivi remboursements, modification informations, demande Carte Labess.",
    url: "https://www.cnam.nat.tn/espace_assure.jsp",
    icon: Users,
  },
  {
    title: "Site institutionnel CNAM",
    description: "Actualités, communiqués officiels, contacts régionaux.",
    url: "https://www.cnam.nat.tn",
    icon: Globe,
  },
  {
    title: "Service téléphonique 1800",
    description:
      "Renseignements et orientation. Lundi au vendredi 8h30 - 16h30.",
    url: "tel:1800",
    icon: Phone,
  },
];

const CATEGORIES: Array<{ id: FormItem["category"]; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: "soins", label: "Bulletins de soins", icon: FileText },
  { id: "affiliation", label: "Affiliation et carte", icon: CreditCard },
  { id: "convention", label: "Convention médecin", icon: Stethoscope },
  { id: "remboursement", label: "Remboursement", icon: Building2 },
  { id: "autres", label: "Autres", icon: FileText },
];

export const metadata = {
  title: "Formulaires CNAM | Doktori",
  description: "Tous les formulaires officiels CNAM Tunisie pour les médecins conventionnés.",
};

export default function CnamFormsPage() {
  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/cnam" className="hover:text-foreground">CNAM</Link>
          <span>/</span>
          <span>Formulaires officiels</span>
        </div>
        <h1 className="mt-2 text-3xl font-bold">Formulaires CNAM officiels</h1>
        <p className="mt-2 text-muted-foreground">
          En attendant l&apos;ouverture de l&apos;API SEED CNAM (prévue 2027), tous les formulaires
          ci-dessous sont à télécharger directement depuis le site officiel CNAM. Doktori ne
          réhéberge pas ces documents pour rester en synchro avec les mises à jour CNAM.
        </p>
      </div>

      {/* Notice */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900 dark:text-amber-200">
            <p className="font-semibold">Bon à savoir</p>
            <p className="mt-1">
              Doktori intègre déjà un{" "}
              <Link href="/cnam" className="underline font-semibold">
                générateur automatique de Bulletin de Soins
              </Link>{" "}
              pré-rempli après chaque consultation. Pour les autres démarches, utilisez les
              formulaires officiels ci-dessous.
            </p>
          </div>
        </div>
      </div>

      {/* Formulaires par catégorie */}
      <section className="space-y-6">
        <h2 className="text-xl font-bold">Formulaires officiels</h2>
        {CATEGORIES.map((cat) => {
          const items = FORMS.filter((f) => f.category === cat.id);
          if (items.length === 0) return null;
          const Icon = cat.icon;
          return (
            <div key={cat.id}>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                <Icon className="h-4 w-4" />
                {cat.label}
              </h3>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {items.map((f) => (
                  <a
                    key={f.title}
                    href={f.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group ds-card p-4 transition hover:border-primary hover:shadow-sm dark:bg-gray-900"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="font-semibold text-foreground group-hover:text-primary">
                          {f.title}
                        </h4>
                        <p className="mt-1 text-sm text-muted-foreground">{f.description}</p>
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1 group-hover:text-primary" />
                    </div>
                  </a>
                ))}
              </div>
            </div>
          );
        })}
      </section>

      {/* Services en ligne */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold">Services CNAM en ligne</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {SERVICES.map((s) => {
            const Icon = s.icon;
            return (
              <a
                key={s.title}
                href={s.url}
                target={s.url.startsWith("tel:") ? undefined : "_blank"}
                rel={s.url.startsWith("tel:") ? undefined : "noopener noreferrer"}
                className="group flex items-start gap-3 ds-card p-4 transition hover:border-primary hover:shadow-sm dark:bg-gray-900"
              >
                <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-foreground group-hover:text-primary">
                    {s.title}
                  </h4>
                  <p className="mt-1 text-sm text-muted-foreground">{s.description}</p>
                </div>
                {!s.url.startsWith("tel:") && (
                  <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1 group-hover:text-primary" />
                )}
              </a>
            );
          })}
        </div>
      </section>

      {/* Actualités */}
      <section className="rounded-2xl border border-border bg-secondary/30 p-6 dark:bg-gray-800">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          Actualités CNAM
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          La CNAM Tunisie ne publie pas de flux RSS officiel pour le moment. Pour rester
          informé des mises à jour réglementaires, des nouveaux formulaires ou des
          changements de procédure, consultez régulièrement les sources suivantes :
        </p>
        <ul className="mt-3 space-y-2 text-sm">
          <li>
            <a
              href="https://www.cnam.nat.tn"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              <ExternalLink className="h-3 w-3" />
              Site institutionnel CNAM (rubrique Actualités)
            </a>
          </li>
          <li>
            <a
              href="https://www.lapresse.tn/?s=CNAM"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              <ExternalLink className="h-3 w-3" />
              La Presse de Tunisie — articles CNAM
            </a>
          </li>
          <li>
            <a
              href="https://www.cnam.nat.tn/espace_ps.jsp"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              <ExternalLink className="h-3 w-3" />
              Espace Pro CNAM (notifications conventions)
            </a>
          </li>
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">
          Doktori prévoit d&apos;ajouter un fil d&apos;actualités automatique dès qu&apos;une
          source officielle structurée (RSS/API) sera disponible côté CNAM.
        </p>
      </section>

      {/* Liens vers le dashboard claims */}
      <section className="rounded-2xl border border-primary/30 bg-primary/5 p-6">
        <h2 className="text-lg font-bold">Workflows Doktori</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <Link
            href="/cnam"
            className="rounded-xl border border-border bg-white p-4 hover:border-primary dark:bg-gray-900"
          >
            <h4 className="font-semibold">Dashboard CNAM</h4>
            <p className="mt-1 text-sm text-muted-foreground">
              Suivi des bulletins de soins envoyés, états remboursés / rejetés.
            </p>
          </Link>
          <Link
            href="/rendez-vous"
            className="rounded-xl border border-border bg-white p-4 hover:border-primary dark:bg-gray-900"
          >
            <h4 className="font-semibold">Mes rendez-vous</h4>
            <p className="mt-1 text-sm text-muted-foreground">
              Générer un Bulletin de Soins pré-rempli depuis la fiche d&apos;une consultation.
            </p>
          </Link>
        </div>
      </section>
    </div>
  );
}
