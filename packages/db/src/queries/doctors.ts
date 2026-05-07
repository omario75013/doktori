import { db } from "../client";
import { doctors, doctorSchedules, appointmentTypes } from "../schema";
import { and, asc, eq } from "drizzle-orm";

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
      consultationMode: doctors.consultationMode,
      teleconsultFee: doctors.teleconsultFee,
      educations: doctors.educations,
      experiences: doctors.experiences,
      languages: doctors.languages,
      expertise: doctors.expertise,
      yearsOfExperience: doctors.yearsOfExperience,
      lastActiveAt: doctors.lastActiveAt,
      cabinetGalleryUrls: doctors.cabinetGalleryUrls,
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

export async function getDoctorAppointmentTypes(doctorId: string) {
  return db
    .select({
      id: appointmentTypes.id,
      name: appointmentTypes.name,
      durationMinutes: appointmentTypes.durationMinutes,
      fee: appointmentTypes.fee,
      color: appointmentTypes.color,
      isDefault: appointmentTypes.isDefault,
    })
    .from(appointmentTypes)
    .where(and(eq(appointmentTypes.doctorId, doctorId), eq(appointmentTypes.isActive, true)))
    .orderBy(asc(appointmentTypes.name));
}
