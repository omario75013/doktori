import { NextResponse } from "next/server";
import { db, clinics, clinicDoctors, doctors } from "@doktori/db";
import { eq } from "drizzle-orm";
import { getAvailableSlots } from "@/lib/queries/appointments";
import { SPECIALTIES } from "@doktori/shared";

interface SlotResult {
  doctorId: string;
  doctorName: string;
  doctorSlug: string;
  specialty: string;
  date: string;
  startTime: string;
  endTime: string;
}

async function findNextSlotForDoctor(
  doctor: { id: string; name: string; slug: string; specialty: string | null },
  daysAhead = 7,
): Promise<SlotResult | null> {
  for (let d = 0; d < daysAhead; d++) {
    const date = new Date();
    date.setDate(date.getDate() + d);
    const dateStr = date.toISOString().slice(0, 10);

    const slots = await getAvailableSlots(doctor.id, dateStr);
    const first = slots.find((s) => s.available);
    if (first) {
      return {
        doctorId: doctor.id,
        doctorName: doctor.name,
        doctorSlug: doctor.slug,
        specialty: SPECIALTIES.find((s) => s.id === doctor.specialty)?.label ?? (doctor.specialty ?? ""),
        date: dateStr,
        startTime: first.startTime,
        endTime: first.endTime,
      };
    }
  }
  return null;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const [clinic] = await db
    .select({ id: clinics.id, slug: clinics.slug })
    .from(clinics)
    .where(eq(clinics.slug, slug))
    .limit(1);

  if (!clinic) {
    return NextResponse.json({ error: "Centre médical introuvable" }, { status: 404 });
  }

  const clinicDoctorRows = await db
    .select({ doctorId: clinicDoctors.doctorId })
    .from(clinicDoctors)
    .where(eq(clinicDoctors.clinicId, clinic.id));

  if (clinicDoctorRows.length === 0) {
    return NextResponse.json({ nextSlot: null, alternatives: [] });
  }

  const doctorIds = clinicDoctorRows.map((r) => r.doctorId);

  const doctorRows = await db
    .select({
      id: doctors.id,
      name: doctors.name,
      slug: doctors.slug,
      specialty: doctors.specialty,
    })
    .from(doctors)
    .where(eq(doctors.isActive, true));

  const clinicDoctorDetails = doctorRows.filter((d) => doctorIds.includes(d.id));

  // Search for available slots for all doctors in parallel
  const results = await Promise.all(
    clinicDoctorDetails.map((doc) => findNextSlotForDoctor(doc)),
  );

  const available = results
    .filter((r): r is SlotResult => r !== null)
    .sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.startTime.localeCompare(b.startTime);
    });

  const [nextSlot, ...alternatives] = available;

  return NextResponse.json({
    nextSlot: nextSlot ?? null,
    alternatives: alternatives.slice(0, 4),
  });
}
