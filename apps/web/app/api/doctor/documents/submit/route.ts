import { NextRequest, NextResponse } from "next/server";
import { db, doctors, doctorDocuments } from "@doktori/db";
import { requireDoctor } from "@/lib/doctor-auth";
import { eq, count } from "drizzle-orm";
import { createAdminNotification } from "@/lib/admin-notifications";

// Required document types for a complete submission
const REQUIRED_TYPES = ["diplome", "carte_cnom", "cin"] as const;

export async function POST(_req: NextRequest) {
  const doctor = await requireDoctor();
  if (doctor instanceof NextResponse) return doctor;

  // Check current verification status
  const [doctorRow] = await db
    .select({ verificationStatus: doctors.verificationStatus, name: doctors.name })
    .from(doctors)
    .where(eq(doctors.id, doctor.id))
    .limit(1);

  if (!doctorRow) {
    return NextResponse.json({ error: "Médecin introuvable" }, { status: 404 });
  }

  if (doctorRow.verificationStatus === "approved") {
    return NextResponse.json(
      { error: "Votre compte est déjà vérifié" },
      { status: 400 }
    );
  }

  if (doctorRow.verificationStatus === "documents_submitted") {
    return NextResponse.json(
      { error: "Vos documents sont déjà en cours de vérification" },
      { status: 400 }
    );
  }

  // Verify required documents have been uploaded
  const uploadedDocs = await db
    .select({ type: doctorDocuments.type })
    .from(doctorDocuments)
    .where(eq(doctorDocuments.doctorId, doctor.id));

  const uploadedTypes = new Set(uploadedDocs.map((d) => d.type));
  const missingTypes = REQUIRED_TYPES.filter((t) => !uploadedTypes.has(t));

  if (missingTypes.length > 0) {
    const labels: Record<string, string> = {
      diplome: "Diplôme de médecine",
      carte_cnom: "Carte CNOM",
      cin: "CIN ou passeport",
    };
    return NextResponse.json(
      {
        error: "Documents manquants",
        missing: missingTypes.map((t) => labels[t] ?? t),
      },
      { status: 400 }
    );
  }

  await db
    .update(doctors)
    .set({ verificationStatus: "documents_submitted", updatedAt: new Date() })
    .where(eq(doctors.id, doctor.id));

  // Notify admin (fire-and-forget)
  createAdminNotification({
    type: "verification_submitted",
    title: "Documents soumis pour vérification",
    message: doctorRow.name,
    link: "/admin/validation",
  }).catch(console.error);

  return NextResponse.json({ ok: true });
}
