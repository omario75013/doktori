import { notFound } from "next/navigation";
import { db, doctors, cnamActs } from "@doktori/db";
import { eq } from "drizzle-orm";
import { SPECIALTIES } from "@doktori/shared";
import DevisClient from "./devis-client";

export const dynamic = "force-dynamic";

/**
 * Map a doctor specialty to the closest CNAM consultation act code.
 * Used to look up the actual CNAM reimbursement rate (item #29).
 */
function specialtyToCnamCode(specialty: string): string {
  const s = specialty.toLowerCase();
  if (s === "medecine-generale" || s === "generaliste") return "CONS_GEN";
  if (s === "dentiste" || s.includes("dent")) return "CONS_DENT";
  if (s === "gynecologue" || s.includes("gyneco")) return "CONS_GYN";
  if (s === "pediatre" || s.includes("pediatr")) return "CONS_PED";
  return "CONS_SPE";
}

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

  // Look up the CNAM act for this specialty to feed accurate reimbursement rates.
  const cnamCode = specialtyToCnamCode(doctor.specialty);
  const [cnamRow] = await db
    .select({
      code: cnamActs.code,
      nameFr: cnamActs.nameFr,
      reimbursementPct: cnamActs.reimbursementPct,
      baseFeeTnd: cnamActs.baseFeeTnd,
    })
    .from(cnamActs)
    .where(eq(cnamActs.code, cnamCode))
    .limit(1);

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
      cnamAct={
        cnamRow
          ? {
              code: cnamRow.code,
              nameFr: cnamRow.nameFr,
              reimbursementPct: Number(cnamRow.reimbursementPct),
              baseFeeTnd: Number(cnamRow.baseFeeTnd),
            }
          : null
      }
    />
  );
}
