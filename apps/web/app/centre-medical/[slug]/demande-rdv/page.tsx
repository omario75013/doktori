import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db, clinics } from "@doktori/db";
import { eq } from "drizzle-orm";
import { CITIES } from "@doktori/shared";
import DemandeRdvClient from "./demande-rdv-client";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [clinic] = await db
    .select({ name: clinics.name })
    .from(clinics)
    .where(eq(clinics.slug, slug))
    .limit(1);
  if (!clinic) return { title: "Clinique introuvable" };
  return {
    title: `Demander un RDV — ${clinic.name} | Doktori`,
    description: `Demandez un rendez-vous à ${clinic.name} : choisissez votre disponibilité, la clinique vous propose un médecin.`,
  };
}

export default async function DemandeRdvPage({ params }: Props) {
  const { slug } = await params;
  const [clinic] = await db
    .select({
      id: clinics.id,
      name: clinics.name,
      slug: clinics.slug,
      city: clinics.city,
      address: clinics.address,
      phone: clinics.phone,
    })
    .from(clinics)
    .where(eq(clinics.slug, slug))
    .limit(1);
  if (!clinic) notFound();

  const cityLabel = CITIES.find((c) => c.id === clinic.city)?.label ?? clinic.city;

  return (
    <DemandeRdvClient
      clinic={{
        slug: clinic.slug,
        name: clinic.name,
        cityLabel,
        address: clinic.address,
        phone: clinic.phone,
      }}
    />
  );
}
