import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Connexion médecin — Espace professionnel",
  description:
    "Accédez à votre espace médecin Doktori : agenda en ligne, rendez-vous patients, statistiques et rappels SMS automatiques.",
  alternates: {
    canonical: "https://doktori.tn/connexion",
  },
  openGraph: {
    title: "Connexion médecin — Espace professionnel",
    description:
      "Accédez à votre espace médecin Doktori : agenda en ligne, rendez-vous patients et statistiques.",
    url: "https://doktori.tn/connexion",
    siteName: "Doktori",
    type: "website",
  },
};

export default function ConnexionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
