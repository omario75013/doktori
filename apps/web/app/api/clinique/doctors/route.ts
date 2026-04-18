import { NextResponse } from "next/server";
import { db, clinics, clinicDoctors, doctors } from "@doktori/db";
import { eq, and } from "drizzle-orm";
import { requireClinic } from "@/lib/clinic-auth";

export async function GET() {
  const clinic = await requireClinic();
  if (clinic instanceof NextResponse) return clinic;

  const rows = await db
    .select({
      id: doctors.id,
      name: doctors.name,
      specialty: doctors.specialty,
      email: doctors.email,
      photoUrl: doctors.photoUrl,
      role: clinicDoctors.role,
      joinedAt: clinicDoctors.createdAt,
    })
    .from(clinicDoctors)
    .innerJoin(doctors, eq(clinicDoctors.doctorId, doctors.id))
    .where(eq(clinicDoctors.clinicId, clinic.id));

  return NextResponse.json({ doctors: rows });
}

// TODO: implement invitation flow — currently doctors are added directly without consent
// A clinic_invitations table + acceptance flow should be added before scaling
export async function POST(req: Request) {
  const clinic = await requireClinic();
  if (clinic instanceof NextResponse) return clinic;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const { email, role } = body as { email?: string; role?: string };

  if (!email) {
    return NextResponse.json({ error: "Email requis" }, { status: 400 });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const assignedRole = role === "admin" ? "admin" : "member";

  // Find doctor by email
  const [doctor] = await db
    .select({ id: doctors.id, name: doctors.name })
    .from(doctors)
    .where(eq(doctors.email, normalizedEmail))
    .limit(1);

  if (!doctor) {
    return NextResponse.json(
      { error: "Aucun médecin trouvé avec cet email" },
      { status: 404 }
    );
  }

  // Check if already in clinic
  const [existing] = await db
    .select({ id: clinicDoctors.id })
    .from(clinicDoctors)
    .where(
      and(
        eq(clinicDoctors.clinicId, clinic.id),
        eq(clinicDoctors.doctorId, doctor.id)
      )
    )
    .limit(1);

  if (existing) {
    return NextResponse.json(
      { error: "Ce médecin fait déjà partie de la clinique" },
      { status: 409 }
    );
  }

  await db.insert(clinicDoctors).values({
    clinicId: clinic.id,
    doctorId: doctor.id,
    role: assignedRole,
  });

  return NextResponse.json({ success: true, doctor: { id: doctor.id, name: doctor.name } });
}
