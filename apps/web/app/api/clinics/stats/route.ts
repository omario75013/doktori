import { NextRequest, NextResponse } from "next/server";
import { db, clinics, clinicDoctors, doctors, appointments } from "@doktori/db";
import { eq, and, gte, lte, count, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const role = (session.user as any).role;
  const { searchParams } = new URL(req.url);

  // Clinic users use their own ID; admins pass ?id= param
  let clinicId: string;
  if (role === "clinic") {
    clinicId = session.user.id;
  } else if (role === "admin") {
    clinicId = searchParams.get("id") ?? "";
  } else {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  if (!clinicId) {
    return NextResponse.json(
      { error: "clinicId requis (param ?id= ou header x-clinic-id)" },
      { status: 400 }
    );
  }

  // Verify clinic exists
  const [clinic] = await db
    .select({
      id: clinics.id,
      name: clinics.name,
      slug: clinics.slug,
      city: clinics.city,
      plan: clinics.plan,
    })
    .from(clinics)
    .where(eq(clinics.id, clinicId))
    .limit(1);

  if (!clinic) {
    return NextResponse.json({ error: "Clinique introuvable" }, { status: 404 });
  }

  // Doctors linked to this clinic
  const clinicDoctorRows = await db
    .select({ doctorId: clinicDoctors.doctorId, role: clinicDoctors.role })
    .from(clinicDoctors)
    .where(eq(clinicDoctors.clinicId, clinicId));

  const doctorIds = clinicDoctorRows.map((r) => r.doctorId);

  if (doctorIds.length === 0) {
    return NextResponse.json({
      clinic,
      totalDoctors: 0,
      totalAppointmentsThisMonth: 0,
      perDoctor: [],
    });
  }

  // Month boundaries (current calendar month)
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  // Doctor details
  const doctorRows = await db
    .select({ id: doctors.id, name: doctors.name, specialty: doctors.specialty })
    .from(doctors)
    .where(inArray(doctors.id, doctorIds));

  // Appointments this month grouped by doctor_id
  const apptCounts = await db
    .select({
      doctorId: appointments.doctorId,
      total: count(appointments.id),
    })
    .from(appointments)
    .where(
      and(
        inArray(appointments.doctorId, doctorIds),
        gte(appointments.startsAt, monthStart),
        lte(appointments.startsAt, monthEnd),
      )
    )
    .groupBy(appointments.doctorId);

  const apptCountMap = new Map(apptCounts.map((r) => [r.doctorId, Number(r.total)]));

  const perDoctor = doctorRows.map((doc) => ({
    doctorId: doc.id,
    name: doc.name,
    specialty: doc.specialty,
    role: clinicDoctorRows.find((r) => r.doctorId === doc.id)?.role ?? "member",
    appointmentsThisMonth: apptCountMap.get(doc.id) ?? 0,
  }));

  const totalAppointmentsThisMonth = perDoctor.reduce(
    (sum, d) => sum + d.appointmentsThisMonth,
    0
  );

  return NextResponse.json({
    clinic,
    totalDoctors: doctorIds.length,
    totalAppointmentsThisMonth,
    perDoctor,
  });
}
