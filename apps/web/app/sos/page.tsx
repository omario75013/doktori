import type { Metadata } from "next";
import SOSPage from "./sos-client";

export const metadata: Metadata = {
  title: "SOS Médecin — Urgence médicale à domicile en Tunisie",
  description:
    "Trouvez un médecin disponible près de chez vous en quelques minutes. Fièvre, douleur aiguë, enfant malade — urgences non-vitales uniquement, réponse rapide.",
  alternates: {
    canonical: "https://doktori.tn/sos",
    languages: {
      fr: "https://doktori.tn/sos",
      ar: "https://doktori.tn/sos",
      "x-default": "https://doktori.tn/sos",
    },
  },
  openGraph: {
    title: "SOS Médecin — Urgence médicale à domicile en Tunisie",
    description:
      "Trouvez un médecin disponible près de chez vous en quelques minutes pour une urgence non-vitale.",
    url: "https://doktori.tn/sos",
    siteName: "Doktori",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SOS Médecin — Urgence médicale à domicile en Tunisie",
    description:
      "Trouvez un médecin disponible près de chez vous en quelques minutes pour une urgence non-vitale.",
  },
};

export default function Page() {
  return <SOSPage />;
}
