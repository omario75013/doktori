import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Chatbot } from "@/components/chatbot";
import { AppBanner } from "@/components/app-banner";
import { PatientShell } from "@/components/patient-shell";
import { InstallPrompt } from "@/components/install-prompt";
import { ThemeProvider } from "@/components/theme-provider";
import { MotionProvider } from "@/components/motion-provider";
import { Toaster } from "sonner";
import { KeyboardShortcuts } from "@/components/keyboard-shortcuts";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

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
        "ar-TN": "https://doktori.tn",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased overflow-x-hidden`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col overflow-x-hidden">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "MedicalOrganization",
              name: "Doktori",
              url: "https://doktori.tn",
              logo: "https://doktori.tn/logo.svg",
              description:
                "Plateforme de réservation médicale en ligne en Tunisie",
              address: {
                "@type": "PostalAddress",
                addressCountry: "TN",
              },
              areaServed: {
                "@type": "Country",
                name: "Tunisie",
              },
              availableLanguage: ["fr", "ar"],
            }),
          }}
        />
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <MotionProvider>
          <NextIntlClientProvider locale={locale} messages={messages}>
            <PatientShell>
              <AppBanner />
              <Navbar />
            </PatientShell>
            {children}
            <Footer />
            <Toaster position="bottom-right" richColors toastOptions={{ style: { borderRadius: "16px" } }} />
            <KeyboardShortcuts />
            <PatientShell>
              <Chatbot />
              <InstallPrompt />
            </PatientShell>
          </NextIntlClientProvider>
          </MotionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
