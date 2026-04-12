import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { Navbar } from "@/components/navbar";
import { Chatbot } from "@/components/chatbot";
import { AppBanner } from "@/components/app-banner";
import { PatientShell } from "@/components/patient-shell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    title: { default: t("title"), template: t("titleTemplate") },
    description: t("description"),
    keywords: t("keywords").split(",").map((k) => k.trim()),
    openGraph: {
      title: t("ogTitle"),
      description: t("ogDescription"),
      url: "https://doktori.tn",
      siteName: "Doktori",
      locale: locale === "ar" ? "ar_TN" : "fr_TN",
      type: "website",
      images: [
        {
          url: "https://doktori.tn/og.png",
          width: 1200,
          height: 630,
          alt: t("ogTitle"),
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: t("twitterTitle"),
      description: t("twitterDescription"),
    },
    alternates: {
      canonical: "https://doktori.tn",
      languages: {
        "fr-TN": "https://doktori.tn",
        "ar-TN": "https://doktori.tn/ar",
        "x-default": "https://doktori.tn",
      },
    },
    robots: { index: true, follow: true },
    manifest: "/manifest.webmanifest",
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: "Doktori",
    },
    icons: {
      icon: [
        { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
        { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      ],
      apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();
  const isRtl = locale === "ar";

  return (
    <html
      lang={locale}
      dir={isRtl ? "rtl" : "ltr"}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <PatientShell>
            <AppBanner />
            <Navbar />
          </PatientShell>
          {children}
          <PatientShell>
            <Chatbot />
          </PatientShell>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
