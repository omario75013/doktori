import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import RecherchePage from "./recherche-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("search.meta");
  const title = t("title");
  const description = t("description");
  return {
    title,
    description,
    alternates: {
      canonical: "https://doktori.tn/recherche",
      languages: {
        fr: "https://doktori.tn/recherche",
        ar: "https://doktori.tn/recherche",
        "x-default": "https://doktori.tn/recherche",
      },
    },
    openGraph: {
      title,
      description,
      url: "https://doktori.tn/recherche",
      siteName: "Doktori",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function Page() {
  const t = await getTranslations("search.meta");
  return (
    <>
      {/* SEO H1 — visually hidden, read by screen readers and crawlers */}
      <h1 className="sr-only">{t("h1")}</h1>
      <RecherchePage />
    </>
  );
}
