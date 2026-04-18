import type { Metadata } from "next";
import RecherchePage from "./recherche-client";

export const metadata: Metadata = {
  title: "Rechercher un médecin en Tunisie — RDV en ligne",
  description:
    "Trouvez un médecin par spécialité, ville ou nom et prenez rendez-vous en ligne. Généralistes, dentistes, dermatologues à Tunis, Ariana, La Marsa.",
  alternates: {
    canonical: "https://doktori.tn/recherche",
    languages: {
      fr: "https://doktori.tn/recherche",
      ar: "https://doktori.tn/recherche",
      "x-default": "https://doktori.tn/recherche",
    },
  },
  openGraph: {
    title: "Rechercher un médecin en Tunisie — RDV en ligne",
    description:
      "Trouvez un médecin par spécialité, ville ou nom et prenez rendez-vous en ligne. Généralistes, dentistes, dermatologues à Tunis, Ariana, La Marsa.",
    url: "https://doktori.tn/recherche",
    siteName: "Doktori",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Rechercher un médecin en Tunisie — RDV en ligne",
    description:
      "Trouvez un médecin par spécialité, ville ou nom et prenez rendez-vous en ligne.",
  },
};

export default function Page() {
  return (
    <>
      {/* SEO H1 — visually hidden, read by screen readers and crawlers */}
      <h1 className="sr-only">Rechercher un médecin en Tunisie</h1>
      <RecherchePage />
    </>
  );
}
