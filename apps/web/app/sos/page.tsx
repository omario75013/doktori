import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import SOSPage from "./sos-client";
import { getSettingOrDefault } from "@/lib/platform-settings";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "sos.meta" });
  const title = t("title");
  const description = t("description");
  const ogDescription = t("ogDescription");

  return {
    title,
    description,
    alternates: {
      canonical: "https://doktori.tn/sos",
      languages: {
        fr: "https://doktori.tn/sos",
        ar: "https://doktori.tn/sos",
        "x-default": "https://doktori.tn/sos",
      },
    },
    openGraph: {
      title,
      description: ogDescription,
      url: "https://doktori.tn/sos",
      siteName: "Doktori",
      locale: locale === "ar" ? "ar_TN" : "fr_TN",
      alternateLocale: locale === "ar" ? "fr_TN" : "ar_TN",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: ogDescription,
    },
  };
}

export default async function Page() {
  const heroImageUrl = await getSettingOrDefault(
    "sos.hero_image_url",
    "/images/defaults/sos-hero.webp"
  );
  return <SOSPage heroImageUrl={heroImageUrl} />;
}
