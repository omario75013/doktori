import { redirect } from "next/navigation";
import { getPatientFromCookies } from "@/lib/patient-auth";
import { InscriptionPatientClient } from "./inscription-client";

export default async function InscriptionPatientPage() {
  const patient = await getPatientFromCookies();
  if (patient) redirect("/mon-espace");
  return <InscriptionPatientClient />;
}
