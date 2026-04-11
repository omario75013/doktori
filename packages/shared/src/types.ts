import type { SPECIALTIES, CITIES, APPOINTMENT_STATUSES, APPOINTMENT_TYPES, INSURANCES } from "./constants";

export type SpecialtyId = (typeof SPECIALTIES)[number]["id"];
export type CityId = (typeof CITIES)[number]["id"];
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];
export type AppointmentType = (typeof APPOINTMENT_TYPES)[number];
export type InsuranceId = (typeof INSURANCES)[number]["id"];

export interface DoctorPublic {
  id: string;
  name: string;
  slug: string;
  specialty: SpecialtyId;
  city: CityId;
  address: string;
  phone: string;
  photoUrl: string | null;
  consultationFee: number | null;
  bio: string | null;
}

export interface TimeSlot {
  startTime: string;
  endTime: string;
  available: boolean;
}

export interface AppointmentPublic {
  id: string;
  doctorName: string;
  doctorSpecialty: SpecialtyId;
  startsAt: string;
  endsAt: string;
  status: AppointmentStatus;
  type: AppointmentType;
}
