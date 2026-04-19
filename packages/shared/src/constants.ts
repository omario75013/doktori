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
  { id: "pneumologue", label: "Pneumologue", labelAr: "طبيب رئة" },
  { id: "neurologue", label: "Neurologue", labelAr: "طبيب أعصاب" },
  { id: "rhumatologue", label: "Rhumatologue", labelAr: "طبيب روماتيزم" },
  { id: "urologue", label: "Urologue", labelAr: "طبيب مسالك بولية" },
  { id: "endocrinologue", label: "Endocrinologue", labelAr: "طبيب غدد" },
  { id: "nephrologue", label: "Néphrologue", labelAr: "طبيب كلى" },
  { id: "psychiatre", label: "Psychiatre", labelAr: "طبيب نفسي" },
  { id: "radiologue", label: "Radiologue", labelAr: "طبيب أشعة" },
  { id: "chirurgien", label: "Chirurgien Général", labelAr: "جراح عام" },
  { id: "allergologue", label: "Allergologue", labelAr: "طبيب حساسية" },
] as const;

export const CITIES = [
  { id: "tunis", label: "Tunis", labelAr: "تونس", governorate: "Tunis" },
  { id: "la-marsa", label: "La Marsa", labelAr: "المرسى", governorate: "Tunis" },
  { id: "lac-1", label: "Lac 1", labelAr: "البحيرة 1", governorate: "Tunis" },
  { id: "lac-2", label: "Lac 2", labelAr: "البحيرة 2", governorate: "Tunis" },
  { id: "ariana", label: "Ariana", labelAr: "أريانة", governorate: "Ariana" },
  { id: "la-soukra", label: "La Soukra", labelAr: "السكرة", governorate: "Ariana" },
  { id: "raoued", label: "Raoued", labelAr: "رواد", governorate: "Ariana" },
  { id: "manouba", label: "Manouba", labelAr: "منوبة", governorate: "Manouba" },
  { id: "sfax", label: "Sfax", labelAr: "صفاقس", governorate: "Sfax" },
  { id: "sousse", label: "Sousse", labelAr: "سوسة", governorate: "Sousse" },
  { id: "monastir", label: "Monastir", labelAr: "المنستير", governorate: "Monastir" },
  { id: "bizerte", label: "Bizerte", labelAr: "بنزرت", governorate: "Bizerte" },
  { id: "nabeul", label: "Nabeul", labelAr: "نابل", governorate: "Nabeul" },
  { id: "hammamet", label: "Hammamet", labelAr: "الحمامات", governorate: "Nabeul" },
  { id: "kairouan", label: "Kairouan", labelAr: "القيروان", governorate: "Kairouan" },
  { id: "gabes", label: "Gabès", labelAr: "قابس", governorate: "Gabès" },
  { id: "medenine", label: "Médenine", labelAr: "مدنين", governorate: "Médenine" },
  { id: "djerba", label: "Djerba", labelAr: "جربة", governorate: "Médenine" },
  { id: "beja", label: "Béja", labelAr: "باجة", governorate: "Béja" },
  { id: "jendouba", label: "Jendouba", labelAr: "جندوبة", governorate: "Jendouba" },
  { id: "ben-arous", label: "Ben Arous", labelAr: "بن عروس", governorate: "Ben Arous" },
  { id: "ezzahra", label: "Ezzahra", labelAr: "الزهراء", governorate: "Ben Arous" },
  { id: "hammam-lif", label: "Hammam-Lif", labelAr: "حمام الأنف", governorate: "Ben Arous" },
] as const;

export const APPOINTMENT_STATUSES = [
  "pending", "confirmed", "cancelled", "completed", "no_show",
] as const;

export const APPOINTMENT_TYPES = ["cabinet", "home_visit", "sos", "teleconsult"] as const;

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
// InsuranceId type is exported from ./types.ts
