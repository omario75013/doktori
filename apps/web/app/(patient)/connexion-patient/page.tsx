import { redirect } from "next/navigation";
import { getPatientFromCookies } from "@/lib/patient-auth";
import { ConnexionPatientClient } from "./connexion-client";

export default async function ConnexionPatientPage() {
  const patient = await getPatientFromCookies();
  if (patient) redirect("/mon-espace");
  return <ConnexionPatientClient />;
}
