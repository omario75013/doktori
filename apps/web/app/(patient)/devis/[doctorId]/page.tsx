import { notFound } from "next/navigation";
import { db, doctors } from "@doktori/db";
import { eq } from "drizzle-orm";
import { SPECIALTIES } from "@doktori/shared";
import DevisClient from "./devis-client";

export const dynamic = "force-dynamic";

export default async function DevisPage({
  params,
}: {
  params: Promise<{ doctorId: string }>;
}) {
  const { doctorId } = await params;

  const [doctor] = await db
    .select({
      id: doctors.id,
      slug: doctors.slug,
      name: doctors.name,
      specialty: doctors.specialty,
      photoUrl: doctors.photoUrl,
      consultationFee: doctors.consultationFee,
      teleconsultFee: doctors.teleconsultFee,
    })
    .from(doctors)
    .where(eq(doctors.id, doctorId))
    .limit(1);

  if (!doctor) notFound();

  const specialtyLabel =
    SPECIALTIES.find((s) => s.id === doctor.specialty)?.label ?? doctor.specialty;
  const isGeneraliste = doctor.specialty === "medecine-generale" || doctor.specialty === "generaliste";

  return (
    <DevisClient
      doctor={{
        id: doctor.id,
        slug: doctor.slug,
        name: doctor.name,
        specialty: doctor.specialty,
        specialtyLabel,
        isGeneraliste,
        photoUrl: doctor.photoUrl,
        consultationFee: doctor.consultationFee,
        teleconsultFee: doctor.teleconsultFee,
      }}
    />
  );
}
