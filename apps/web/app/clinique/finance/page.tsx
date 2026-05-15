import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db, doctors, clinicDoctors } from "@doktori/db";
import { eq } from "drizzle-orm";
import { FinanceDashboard } from "./finance-client";

interface PageProps {
  searchParams: Promise<{ print?: string }>;
}

export default async function CliniqueFinancePage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session || (session.user as { role?: string }).role !== "clinic") {
    redirect("/clinique-login");
  }

  const clinicId = session.user.id!;
  const sp = await searchParams;
  const isPrint = sp.print === "1";

  // Load clinic doctors for filter bar
  const clinicDoctorRows = await db
    .select({ doctorId: clinicDoctors.doctorId })
    .from(clinicDoctors)
    .where(eq(clinicDoctors.clinicId, clinicId));

  const allDoctorIds = clinicDoctorRows.map((r) => r.doctorId);

  let doctorList: { id: string; name: string }[] = [];
  if (allDoctorIds.length > 0) {
    const { inArray } = await import("drizzle-orm");
    doctorList = await db
      .select({ id: doctors.id, name: doctors.name })
      .from(doctors)
      .where(inArray(doctors.id, allDoctorIds));
  }

  return (
    <div className={isPrint ? "print-mode" : ""}>
      <FinanceDashboard doctors={doctorList} isPrint={isPrint} />
    </div>
  );
}
