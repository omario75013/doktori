import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Doktori — Réservez votre médecin en ligne en Tunisie",
  description:
    "Trouvez un médecin en Tunisie et prenez rendez-vous en ligne en 2 clics. Gratuit pour les patients. Doktori, le Doctolib tunisien.",
  openGraph: {
    title: "Doktori — Réservez votre médecin en ligne",
    description:
      "Le Doctolib tunisien. Trouvez un médecin, consultez ses disponibilités, réservez en 2 clics.",
    url: "https://doktori.tn",
    siteName: "Doktori",
    locale: "fr_TN",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Navbar />
        {children}
      </body>
    </html>
  );
}
