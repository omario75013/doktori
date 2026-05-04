import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Doktori — Réservez votre médecin en Tunisie",
    short_name: "Doktori",
    description:
      "Trouvez un médecin en Tunisie et prenez rendez-vous en ligne en 2 clics. Gratuit pour les patients.",
    start_url: "/",
    display: "standalone",
    background_color: "#FFFFFF",
    theme_color: "#0891B2",
    orientation: "portrait",
    categories: ["medical", "health"],
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Rechercher un médecin",
        short_name: "Recherche",
        description: "Trouvez un médecin par spécialité ou ville",
        url: "/recherche",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Mes rendez-vous",
        short_name: "Mes RDV",
        description: "Consultez vos rendez-vous à venir",
        url: "/mes-rdv",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "SOS Médecin",
        short_name: "SOS",
        description: "Trouvez un médecin disponible immédiatement",
        url: "/sos",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
    ],
    screenshots: [
      {
        src: "/screenshots/home.png",
        sizes: "1080x1920",
        type: "image/png",
        form_factor: "narrow",
        label: "Page d'accueil Doktori",
      },
      {
        src: "/screenshots/search.png",
        sizes: "1080x1920",
        type: "image/png",
        form_factor: "narrow",
        label: "Recherche de médecin",
      },
    ],
  };
}
