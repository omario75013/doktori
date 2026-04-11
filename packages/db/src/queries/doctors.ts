import { db } from "../client";
import { doctors, doctorSchedules } from "../schema";
import { eq } from "drizzle-orm";

export async function getDoctorBySlug(slug: string) {
  const [doctor] = await db
    .select({
      id: doctors.id,
      name: doctors.name,
      slug: doctors.slug,
      specialty: doctors.specialty,
      city: doctors.city,
      address: doctors.address,
      // phone deliberately excluded from public API (security)
      photoUrl: doctors.photoUrl,
      bio: doctors.bio,
      consultationFee: doctors.consultationFee,
    })
    .from(doctors)
    .where(eq(doctors.slug, slug))
    .limit(1);

  return doctor || null;
}

export async function getDoctorSchedule(doctorId: string) {
  return db
    .select()
    .from(doctorSchedules)
    .where(eq(doctorSchedules.doctorId, doctorId))
    .orderBy(doctorSchedules.dayOfWeek);
}

export async function getAllDoctorSlugs() {
  return db.select({ slug: doctors.slug }).from(doctors).where(eq(doctors.isActive, true));
}
