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
  };
}
