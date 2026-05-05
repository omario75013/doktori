import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import dynamic from "next/dynamic";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { AppBanner } from "@/components/app-banner";
import { PatientShell } from "@/components/patient-shell";
import { DesktopBackBar } from "@/components/desktop-back-bar";
import { ThemeProvider } from "@/components/theme-provider";
import { MotionProvider } from "@/components/motion-provider";
import { Toaster } from "sonner";

// Below-the-fold + non-critical: lazy-load to keep the homepage LCP path light.
// These components self-mount client-side after hydration; they have no SSR impact.
const Chatbot = dynamic(() => import("@/components/chatbot").then((m) => ({ default: m.Chatbot })));
const InstallPrompt = dynamic(() => import("@/components/install-prompt").then((m) => ({ default: m.InstallPrompt })));
const KeyboardShortcuts = dynamic(() => import("@/components/keyboard-shortcuts").then((m) => ({ default: m.KeyboardShortcuts })));
const CookieBanner = dynamic(() => import("@/components/cookie-banner").then((m) => ({ default: m.CookieBanner })));
const ServiceWorkerRegister = dynamic(() => import("@/components/sw-register").then((m) => ({ default: m.ServiceWorkerRegister })));
const SupportButton = dynamic(() => import("@/components/support-button").then((m) => ({ default: m.SupportButton })));

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  preload: true,
  fallback: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica", "Arial", "sans-serif"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: false, // mono is not used above-the-fold, defer
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
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
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <MotionProvider>
          <NextIntlClientProvider locale={locale} messages={messages}>
            <DesktopBackBar />
            <PatientShell>
              <AppBanner />
              <Navbar />
            </PatientShell>
            <main id="main">{children}</main>
            <PatientShell>
              <Footer />
            </PatientShell>
            <Toaster position="bottom-right" richColors toastOptions={{ style: { borderRadius: "16px" } }} />
            <KeyboardShortcuts />
            <ServiceWorkerRegister />
            <PatientShell>
              <Chatbot />
              <InstallPrompt />
              <SupportButton />
            </PatientShell>
            <CookieBanner />
          </NextIntlClientProvider>
          </MotionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
