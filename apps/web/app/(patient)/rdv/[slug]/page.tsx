import type { Metadata } from "next";
import { db, doctors } from "@doktori/db";
import { eq } from "drizzle-orm";
import { SPECIALTIES } from "@doktori/shared";
import RdvPage from "./rdv-client";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [doctor] = await db.select().from(doctors).where(eq(doctors.slug, slug)).limit(1);
  if (!doctor) {
    return {
      title: "Prendre rendez-vous | Doktori",
      alternates: { canonical: `https://doktori.tn/rdv/${slug}` },
    };
  }
  const spec = SPECIALTIES.find((s) => s.id === doctor.specialty);
  return {
    title: `Prendre RDV avec ${doctor.name} — ${spec?.label ?? "Médecin"} | Doktori`,
    description: `Réservez votre rendez-vous en ligne avec ${doctor.name}, ${spec?.label ?? "médecin"} à ${doctor.city}. Consultez les disponibilités et confirmez en 2 clics.`,
    alternates: { canonical: `https://doktori.tn/rdv/${slug}` },
    openGraph: {
      title: `Prendre RDV avec ${doctor.name} sur Doktori`,
      description: `Réservez en ligne avec ${doctor.name}, ${spec?.label ?? "médecin"} à ${doctor.city}.`,
      url: `https://doktori.tn/rdv/${slug}`,
      siteName: "Doktori",
      type: "website",
    },
  };
}

export default function Page({ params }: Props) {
  return <RdvPage params={params} />;
}
