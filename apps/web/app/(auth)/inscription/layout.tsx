import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Créer un compte médecin — Programme fondateur",
  description:
    "Inscrivez-vous sur Doktori et rejoignez le programme fondateur : agenda en ligne gratuit, vitrine référencée Google, rappels SMS et support dédié.",
  alternates: {
    canonical: "https://doktori.tn/inscription",
  },
  openGraph: {
    title: "Créer un compte médecin — Programme fondateur",
    description:
      "Inscrivez-vous sur Doktori et bénéficiez d'un agenda en ligne gratuit, vitrine Google et rappels SMS.",
    url: "https://doktori.tn/inscription",
    siteName: "Doktori",
    type: "website",
  },
};

export default function InscriptionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
