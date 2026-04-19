import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db, doctors, doctorDocuments } from "@doktori/db";
import { eq } from "drizzle-orm";
import { VerificationClient } from "./verification-client";

export const dynamic = "force-dynamic";

export default async function VerificationPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");

  const doctorId = session.user.id;

  const [doctor] = await db
    .select({
      verificationStatus: doctors.verificationStatus,
      verificationNote: doctors.verificationNote,
    })
    .from(doctors)
    .where(eq(doctors.id, doctorId))
    .limit(1);

  if (!doctor) redirect("/connexion");

  const uploadedDocs = await db
    .select()
    .from(doctorDocuments)
    .where(eq(doctorDocuments.doctorId, doctorId))
    .orderBy(doctorDocuments.uploadedAt);

  return (
    <VerificationClient
      verificationStatus={doctor.verificationStatus}
      verificationNote={doctor.verificationNote}
      uploadedDocuments={uploadedDocs.map((d) => ({
        id: d.id,
        type: d.type,
        fileName: d.fileName,
        fileUrl: d.fileUrl,
        uploadedAt: d.uploadedAt.toISOString(),
      }))}
    />
  );
}
