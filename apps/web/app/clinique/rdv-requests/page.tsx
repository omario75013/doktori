import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db, clinicDoctors, doctors } from "@doktori/db";
import { eq } from "drizzle-orm";
import RdvRequestsClient from "./rdv-requests-client";

export default async function ClinicRdvRequestsPage() {
  const session = await auth();
  if (!session?.user?.id || (session.user as { role?: string }).role !== "clinic") {
    redirect("/clinique-login");
  }
  const clinicId = session.user.id;

  const doctorRows = await db
    .select({
      id: doctors.id,
      name: doctors.name,
      specialty: doctors.specialty,
    })
    .from(clinicDoctors)
    .innerJoin(doctors, eq(clinicDoctors.doctorId, doctors.id))
    .where(eq(clinicDoctors.clinicId, clinicId));

  return <RdvRequestsClient clinicDoctors={doctorRows} />;
}
