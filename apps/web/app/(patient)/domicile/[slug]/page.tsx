import type { Metadata } from "next";
import { db, doctors } from "@doktori/db";
import { eq } from "drizzle-orm";
import { SPECIALTIES } from "@doktori/shared";
import HomeVisitRequestPage from "./domicile-client";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [doctor] = await db.select().from(doctors).where(eq(doctors.slug, slug)).limit(1);
  if (!doctor) {
    return {
      title: "Visite à domicile | Doktori",
      alternates: { canonical: `https://doktori.tn/domicile/${slug}` },
    };
  }
  const spec = SPECIALTIES.find((s) => s.id === doctor.specialty);
  return {
    title: `Visite à domicile avec ${doctor.name} — ${spec?.label ?? "Médecin"} | Doktori`,
    description: `Demandez une consultation à domicile avec ${doctor.name}, ${spec?.label ?? "médecin"} à ${doctor.city}. Réservation en ligne sur Doktori.`,
    alternates: { canonical: `https://doktori.tn/domicile/${slug}` },
    openGraph: {
      title: `Visite à domicile avec ${doctor.name}`,
      description: `Consultation à domicile avec ${doctor.name}, ${spec?.label ?? "médecin"} à ${doctor.city}.`,
      url: `https://doktori.tn/domicile/${slug}`,
      siteName: "Doktori",
      type: "website",
    },
  };
}

export default function Page({ params }: Props) {
  return <HomeVisitRequestPage params={params} />;
}
