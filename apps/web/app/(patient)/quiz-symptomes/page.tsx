import type { Metadata } from "next";
import QuizSymptomesPage from "./quiz-symptomes-client";

export const metadata: Metadata = {
  title: "Quiz symptômes — Trouvez le bon spécialiste | Doktori",
  description:
    "Répondez à quelques questions sur vos symptômes et obtenez une suggestion de spécialiste à consulter. Outil d'orientation, ne remplace pas un avis médical.",
  alternates: {
    canonical: "https://doktori.tn/quiz-symptomes",
    languages: {
      fr: "https://doktori.tn/quiz-symptomes",
      ar: "https://doktori.tn/quiz-symptomes",
      "x-default": "https://doktori.tn/quiz-symptomes",
    },
  },
  openGraph: {
    title: "Quiz symptômes — Trouvez le bon spécialiste",
    description:
      "Répondez à quelques questions sur vos symptômes et obtenez une suggestion de spécialiste à consulter.",
    url: "https://doktori.tn/quiz-symptomes",
    siteName: "Doktori",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Quiz symptômes — Trouvez le bon spécialiste",
    description:
      "Répondez à quelques questions sur vos symptômes et obtenez une suggestion de spécialiste.",
  },
};

export default function Page() {
  return <QuizSymptomesPage />;
}
