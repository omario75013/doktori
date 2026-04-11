export const SPECIALTIES = [
  { id: "generaliste", label: "Médecin Généraliste", labelAr: "طبيب عام" },
  { id: "dermatologue", label: "Dermatologue", labelAr: "طبيب جلد" },
  { id: "ophtalmologue", label: "Ophtalmologue", labelAr: "طبيب عيون" },
  { id: "gynecologue", label: "Gynécologue", labelAr: "طبيب نساء" },
  { id: "pediatre", label: "Pédiatre", labelAr: "طبيب أطفال" },
  { id: "dentiste", label: "Dentiste", labelAr: "طبيب أسنان" },
  { id: "orl", label: "ORL", labelAr: "طبيب أنف وأذن" },
  { id: "cardiologue", label: "Cardiologue", labelAr: "طبيب قلب" },
  { id: "orthopediste", label: "Orthopédiste", labelAr: "طبيب عظام" },
  { id: "gastrologue", label: "Gastro-entérologue", labelAr: "طبيب جهاز هضمي" },
] as const;

export const CITIES = [
  { id: "tunis", label: "Tunis", governorate: "Tunis" },
  { id: "la-marsa", label: "La Marsa", governorate: "Tunis" },
  { id: "lac-1", label: "Lac 1", governorate: "Tunis" },
  { id: "lac-2", label: "Lac 2", governorate: "Tunis" },
  { id: "ariana", label: "Ariana", governorate: "Ariana" },
  { id: "la-soukra", label: "La Soukra", governorate: "Ariana" },
  { id: "raoued", label: "Raoued", governorate: "Ariana" },
  { id: "manouba", label: "Manouba", governorate: "Manouba" },
] as const;

export const APPOINTMENT_STATUSES = [
  "pending", "confirmed", "cancelled", "completed", "no_show",
] as const;

export const APPOINTMENT_TYPES = ["cabinet", "home_visit", "sos"] as const;

export const SLOT_DURATIONS = [10, 15, 20, 30, 45, 60] as const;

export const INSURANCES = [
  { id: "cnam", label: "CNAM", labelAr: "الصندوق الوطني للتأمين على المرض" },
  { id: "cnrps", label: "CNRPS", labelAr: "الصندوق الوطني للتقاعد والحيطة الاجتماعية" },
  { id: "star", label: "STAR", labelAr: "STAR" },
  { id: "gat", label: "GAT", labelAr: "GAT" },
  { id: "carte", label: "Assurances Carte", labelAr: "Carte" },
  { id: "maghrebia", label: "Maghrebia", labelAr: "Maghrebia" },
  { id: "comar", label: "COMAR", labelAr: "COMAR" },
  { id: "autres", label: "Autres mutuelles", labelAr: "أخرى" },
] as const;

export type InsuranceId = (typeof INSURANCES)[number]["id"];
