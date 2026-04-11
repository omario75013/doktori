import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { FaqClient } from "./faq-client";
import { FAQ_ITEMS, FAQ_CATEGORIES } from "./faq-data";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "faq" });

  const title = t("metaTitle");
  const description = t("metaDescription");
  const keywords = t("metaKeywords");
  const canonical = "https://doktori.tn/faq";

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical,
      languages: {
        fr: canonical,
        ar: canonical,
        "x-default": canonical,
      },
    },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: "Doktori",
      locale: locale === "ar" ? "ar_TN" : "fr_TN",
      alternateLocale: locale === "ar" ? "fr_TN" : "ar_TN",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

function buildJsonLd(lang: "fr" | "ar") {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: lang === "fr" ? "fr-TN" : "ar-TN",
    mainEntity: FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.question[lang],
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer[lang],
      },
    })),
  };
}

export default async function FaqPage() {
  const locale = (await getLocale()) as "fr" | "ar";
  const t = await getTranslations({ locale, namespace: "faq" });

  // Emit BOTH language FAQPage blocks so search engines crawling either
  // locale (cookie-based, no URL prefix) still get rich results.
  const jsonLdFr = buildJsonLd("fr");
  const jsonLdAr = buildJsonLd("ar");

  const heading = t("heroTitle");
  const subheading = t("heroSubtitle");
  const searchPlaceholder = t("searchPlaceholder");
  const allLabel = t("allCategories");
  const resultsCount = t("resultsCount");
  const emptyTitle = t("emptyTitle");
  const emptyDesc = t("emptyDesc");
  const stillHaveTitle = t("stillHaveTitle");
  const stillHaveDesc = t("stillHaveDesc");
  const whatsappCta = t("whatsappCta");
  const searchDoctorCta = t("searchDoctorCta");

  const categories = FAQ_CATEGORIES.map((c) => ({
    id: c.id,
    label: locale === "ar" ? c.ar : c.fr,
    color: c.color,
    count: FAQ_ITEMS.filter((i) => i.category === c.id).length,
  }));

  const items = FAQ_ITEMS.map((i) => ({
    id: i.id,
    category: i.category,
    question: i.question[locale],
    answer: i.answer[locale],
  }));

  return (
    <>
      {/* Dual-locale FAQPage schema — Google, Bing & DuckDuckGo all accept
          multiple FAQPage blocks on the same URL. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFr) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdAr) }}
      />

      <FaqClient
        locale={locale}
        heading={heading}
        subheading={subheading}
        searchPlaceholder={searchPlaceholder}
        allLabel={allLabel}
        resultsCountTemplate={resultsCount}
        emptyTitle={emptyTitle}
        emptyDesc={emptyDesc}
        stillHaveTitle={stillHaveTitle}
        stillHaveDesc={stillHaveDesc}
        whatsappCta={whatsappCta}
        searchDoctorCta={searchDoctorCta}
        categories={categories}
        items={items}
      />
    </>
  );
}
