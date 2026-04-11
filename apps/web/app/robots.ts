import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard", "/agenda", "/rendez-vous", "/profil", "/api", "/secretaires", "/patients", "/stats", "/motifs", "/parrainage", "/conventions", "/abonnement", "/domicile", "/sos"],
      },
    ],
    sitemap: "https://doktori.tn/sitemap.xml",
  };
}
