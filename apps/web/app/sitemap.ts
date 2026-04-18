import type { MetadataRoute } from "next";
import { db, doctors, clinics } from "@doktori/db";
import { eq } from "drizzle-orm";
import { SPECIALTIES, CITIES } from "@doktori/shared";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://doktori.tn";

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/recherche`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/inscription`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/faq`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/legal/cgu`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    { url: `${baseUrl}/legal/confidentialite`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    { url: `${baseUrl}/legal/mentions`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
  ];

  // Doctor profile pages (runtime-fetched; sitemap is dynamic)
  let allDoctors: Array<{ slug: string; updatedAt: Date }> = [];
  try {
    allDoctors = await db
      .select({ slug: doctors.slug, updatedAt: doctors.updatedAt })
      .from(doctors)
      .where(eq(doctors.isActive, true));
  } catch {
    // DB unreachable at build or request time — return static pages only
  }

  const doctorPages: MetadataRoute.Sitemap = allDoctors.flatMap((d) => [
    {
      url: `${baseUrl}/medecin/${d.slug}`,
      lastModified: d.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/rdv/${d.slug}`,
      lastModified: d.updatedAt,
      changeFrequency: "daily" as const,
      priority: 0.7,
    },
  ]);

  // Clinic profile pages
  let allClinics: Array<{ slug: string; updatedAt: Date }> = [];
  try {
    allClinics = await db
      .select({ slug: clinics.slug, updatedAt: clinics.createdAt })
      .from(clinics);
  } catch {
    // DB unreachable — skip clinic pages
  }

  const clinicPages: MetadataRoute.Sitemap = allClinics.map((c) => ({
    url: `${baseUrl}/centre-medical/${c.slug}`,
    lastModified: c.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  // SEO listing pages (all city × specialty combinations)
  const listingPages: MetadataRoute.Sitemap = [];
  for (const city of CITIES) {
    for (const spec of SPECIALTIES) {
      listingPages.push({
        url: `${baseUrl}/${city.id}/${spec.id}`,
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
  }

  return [...staticPages, ...doctorPages, ...clinicPages, ...listingPages];
}
