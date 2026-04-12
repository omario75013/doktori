import { NextResponse } from "next/server";
import {
  db,
  doctors,
  patients,
  patientMedicalProfile,
  patientDependents,
  appointments,
  appointmentTypes,
  doctorSchedules,
  doctorPractices,
} from "@doktori/db";
import { eq, and, or, ilike, desc, gte, lte, not, inArray, sql } from "drizzle-orm";
import { SPECIALTIES, CITIES, formatPhone } from "@doktori/shared";
import { getAvailableSlots, createAppointment } from "@/lib/queries/appointments";
import { sendSMS } from "@/lib/sms";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ──────────────────────────────────────────────────────────────────────────────
// System prompts — FR + AR
// ──────────────────────────────────────────────────────────────────────────────
const SYSTEM_PROMPT_FR = `Tu es **Dokti**, l'assistant virtuel de Doktori.tn, la plateforme tunisienne de prise de rendez-vous médicaux.

## Ton rôle PRINCIPAL
Tu es une **réceptionniste virtuelle**. Ton objectif #1 est de **réserver un rendez-vous** pour le patient. Chaque conversation devrait se terminer par un RDV pris, sauf si le patient veut juste une information.

## Flux conversationnel idéal
1. Accueil → demander ce que le patient recherche (spécialité ou symptômes)
2. Si symptômes → suggest_specialty → recommander une spécialité
3. Demander la ville → search_doctors → proposer 3-5 médecins
4. Patient choisit un médecin → get_doctor_appointment_types → proposer les motifs
5. Si le médecin a plusieurs cabinets → get_doctor_practices → demander lequel
6. check_doctor_calendar pour voir la disponibilité de la semaine → proposer les meilleurs jours
7. Patient choisit un jour → get_available_slots → proposer les créneaux
8. Patient choisit un créneau → demander nom + téléphone (si pas encore identifié)
9. Confirmer le résumé : "Dr. X, le [date] à [heure], motif [Y], cabinet [Z]. Je confirme ?"
10. Patient confirme → book_appointment → message de succès avec détails

## Identification du patient
Dès que le patient donne son numéro ou email, appelle identify_patient. Si le patient est connu :
- Salue-le par son prénom : "Rebonjour [prénom] !"
- Si le patient revient pour le même médecin, saute la recherche et propose directement les créneaux

## Réservation pour un proche
Si le patient dit "pour mon fils" / "pour ma mère" → demander le nom du bénéficiaire et la relation. Passer beneficiaryName + beneficiaryRelation à book_appointment.

## Annulation
Si le patient demande d'annuler → identifier le patient → get_patient_history → montrer les RDV à venir → demander lequel annuler → confirmer → cancel_appointment.

## Règles ABSOLUES
- **Tu ne donnes JAMAIS de conseil médical, diagnostic, ou traitement.** Si le patient décrit des symptômes graves : "Pour une urgence vitale, composez immédiatement le **190 (SAMU)**. Pour une consultation urgente non-vitale, utilisez **SOS Docteur** sur doktori.tn/sos."
- Si le patient décrit des symptômes légers, tu peux **suggérer une spécialité** sans diagnostiquer.
- **Langue** : réponds toujours en **français** (sauf si le patient écrit en arabe).
- Ne JAMAIS révéler le détail du dossier médical — utilise uniquement des formulations génériques.
- Ne JAMAIS appeler book_appointment sans confirmation explicite du patient.

## Ton
- Chaleureux, professionnel, concis (2-3 phrases max sauf si liste)
- Utilise "vous"
- Utilise des puces pour les listes
- Termine souvent par une question de clarification

## Escalade
- "Je voudrais parler à quelqu'un" → "Vous pouvez nous contacter par email à contact@doktori.tn."
- Problème technique → "Je m'excuse pour le désagrément. Essayez de recharger la page ou contactez-nous."

## Informations sur Doktori
- **Gratuit** pour les patients
- **SOS Docteur** : trouve un médecin disponible en urgence non-vitale
- **Visite à domicile** : certains médecins se déplacent
- **Annulation** : possible jusqu'à 2h avant le rendez-vous via /mes-rdv
- **Rappel SMS** : envoyé automatiquement la veille du rendez-vous
- **Couverture actuelle** : Grand Tunis (Tunis, Ariana, Manouba, Lac, La Marsa, Soukra)
- **Paiement** : consultation payée directement au cabinet (espèces, carte, CNAM)`;

const SYSTEM_PROMPT_AR = `أنت **دكتري**، المساعد الافتراضي لمنصة Doktori.tn، المنصة التونسية لحجز المواعيد الطبية.

## دورك الرئيسي
أنت **موظف استقبال افتراضي**. هدفك الأول هو **حجز موعد** للمريض. كل محادثة يجب أن تنتهي بحجز موعد، إلا إذا أراد المريض معلومة فقط.

## التدفق المثالي للمحادثة
1. ترحيب ← اسأل ماذا يبحث المريض (تخصص أو أعراض)
2. إذا أعراض ← suggest_specialty ← اقتراح تخصص
3. اسأل عن المدينة ← search_doctors ← اقتراح 3-5 أطباء
4. المريض يختار طبيب ← get_doctor_appointment_types ← عرض الأنواع
5. إذا عدة عيادات ← get_doctor_practices ← سأل أيها يفضل
6. check_doctor_calendar ← عرض التوفر الأسبوعي
7. المريض يختار يوم ← get_available_slots ← عرض المواعيد
8. المريض يختار وقت ← اسأل الاسم + الهاتف
9. تأكيد الملخص
10. المريض يؤكد ← book_appointment ← رسالة نجاح

## قواعد مطلقة
- **لا تقدم أبداً نصيحة طبية أو تشخيصاً أو علاجاً.**
- إذا أعراض خطيرة: "في حالة الطوارئ الحيوية، اتصل بـ **190 (SAMU)**."
- **اللغة**: أجب بالعربية. أسماء الأطباء والعناوين بالفرنسية.
- لا تكشف أبداً تفاصيل الملف الطبي.
- لا تحجز أبداً بدون تأكيد صريح من المريض.

## الأسلوب
- ودّي، مهني، مختصر
- استخدم صيغة المخاطب المؤدبة
- اختم بسؤال توضيحي أو اقتراح

## معلومات عن دكتري
- **مجاني** للمرضى
- **SOS Docteur** : طبيب متاح للحالات العاجلة
- **زيارة منزلية** : بعض الأطباء يتنقلون
- **الإلغاء** : ممكن حتى ساعتين قبل الموعد
- **تذكير SMS** : تلقائياً عشية الموعد
- **التغطية** : تونس الكبرى`;

function getSystemPrompt(locale: string): string {
  return locale === "ar" ? SYSTEM_PROMPT_AR : SYSTEM_PROMPT_FR;
}

// ──────────────────────────────────────────────────────────────────────────────
// OpenAI-compatible tool definitions
// ──────────────────────────────────────────────────────────────────────────────
interface OpenAITool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

function getTools(locale: string): OpenAITool[] {
  const isAr = locale === "ar";
  return [
    {
      type: "function",
      function: {
        name: "search_doctors",
        description: isAr
          ? "البحث عن أطباء حسب التخصص و/أو المدينة. يُرجع حتى 5 أطباء."
          : "Recherche les médecins par spécialité et/ou ville. Retourne jusqu'à 5 médecins avec profil + booking URLs.",
        parameters: {
          type: "object",
          properties: {
            specialty: {
              type: "string",
              description: "ID: generaliste, dermatologue, ophtalmologue, gynecologue, pediatre, dentiste, orl, cardiologue, orthopediste, gastrologue",
            },
            city: {
              type: "string",
              description: "ID: tunis, la-marsa, lac-1, lac-2, ariana, la-soukra, raoued, manouba",
            },
            query: { type: "string", description: isAr ? "كلمة بحث حرة" : "Mot-clé libre (nom, bio)" },
          },
        },
      },
    },
    {
      type: "function",
      function: {
        name: "suggest_specialty",
        description: isAr
          ? "اقتراح تخصص طبي بناءً على الأعراض. للتوجيه فقط."
          : "Suggère une spécialité en fonction de symptômes. Orienter, jamais diagnostiquer.",
        parameters: {
          type: "object",
          properties: {
            symptoms: { type: "string", description: isAr ? "وصف الأعراض" : "Description des symptômes" },
          },
          required: ["symptoms"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "identify_patient",
        description: isAr
          ? "التعرف على مريض بالهاتف أو الإيميل. يرجع الملف الشخصي والمواعيد الأخيرة."
          : "Identifie un patient par téléphone ou email. Retourne profil, dépendants, et 5 derniers RDV.",
        parameters: {
          type: "object",
          properties: {
            phone: { type: "string", description: isAr ? "رقم الهاتف +216..." : "Téléphone (+216...)" },
            email: { type: "string", description: isAr ? "البريد الإلكتروني" : "Email (alternatif)" },
          },
        },
      },
    },
    {
      type: "function",
      function: {
        name: "get_doctor_appointment_types",
        description: isAr
          ? "أنواع الاستشارة لطبيب مع المدة والسعر."
          : "Retourne les motifs de consultation d'un médecin avec durée et tarif.",
        parameters: {
          type: "object",
          properties: {
            doctorId: { type: "string", description: "UUID du médecin" },
          },
          required: ["doctorId"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "get_available_slots",
        description: isAr
          ? "المواعيد المتاحة لطبيب في تاريخ معين."
          : "Créneaux disponibles pour un médecin à une date donnée.",
        parameters: {
          type: "object",
          properties: {
            doctorId: { type: "string", description: "UUID du médecin" },
            date: { type: "string", description: "YYYY-MM-DD" },
            appointmentTypeId: { type: "string", description: "UUID motif (optionnel)" },
          },
          required: ["doctorId", "date"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "get_doctor_practices",
        description: isAr
          ? "عيادات الطبيب (العناوين). بعض الأطباء لديهم عدة عيادات."
          : "Retourne les cabinets d'un médecin. Demander lequel si plusieurs.",
        parameters: {
          type: "object",
          properties: {
            doctorId: { type: "string", description: "UUID du médecin" },
          },
          required: ["doctorId"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "check_doctor_calendar",
        description: isAr
          ? "تقويم الطبيب لـ 7 أيام القادمة: عدد المواعيد المتاحة لكل يوم."
          : "Calendrier 7 jours d'un médecin : créneaux libres par jour, premier créneau, horaires.",
        parameters: {
          type: "object",
          properties: {
            doctorId: { type: "string", description: "UUID du médecin" },
            appointmentTypeId: { type: "string", description: "UUID motif (optionnel)" },
          },
          required: ["doctorId"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "book_appointment",
        description: isAr
          ? "حجز موعد. فقط بعد تأكيد: الطبيب، التاريخ، الوقت، اسم وهاتف المريض."
          : "Crée un RDV. UNIQUEMENT après confirmation du médecin, date+heure, nom et téléphone. Ne JAMAIS appeler sans confirmation explicite.",
        parameters: {
          type: "object",
          properties: {
            doctorId: { type: "string", description: "UUID du médecin" },
            patientName: { type: "string", description: "Nom complet du patient" },
            patientPhone: { type: "string", description: "Numéro du patient" },
            date: { type: "string", description: "YYYY-MM-DD" },
            startTime: { type: "string", description: "HH:MM" },
            appointmentTypeId: { type: "string", description: "UUID motif (optionnel)" },
            reason: { type: "string", description: "Motif libre (optionnel)" },
            beneficiaryName: { type: "string", description: "Nom du proche (optionnel)" },
            beneficiaryRelation: { type: "string", description: "child|parent|spouse|other (optionnel)" },
          },
          required: ["doctorId", "patientName", "patientPhone", "date", "startTime"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "cancel_appointment",
        description: isAr
          ? "إلغاء موعد. اطلب تأكيد المريض قبل الإلغاء."
          : "Annule un RDV. Demander confirmation avant.",
        parameters: {
          type: "object",
          properties: {
            appointmentId: { type: "string", description: "UUID du rendez-vous" },
            patientPhone: { type: "string", description: "Numéro du patient (vérification)" },
          },
          required: ["appointmentId", "patientPhone"],
        },
      },
    },
  ];
}

// ──────────────────────────────────────────────────────────────────────────────
// Tool execution
// ──────────────────────────────────────────────────────────────────────────────
async function runTool(
  name: string,
  input: Record<string, unknown>,
): Promise<string> {
  try {
    switch (name) {
      case "search_doctors":
        return await toolSearchDoctors(input);
      case "suggest_specialty":
        return toolSuggestSpecialty(input);
      case "identify_patient":
        return await toolIdentifyPatient(input);
      case "get_doctor_appointment_types":
        return await toolGetDoctorTypes(input);
      case "get_available_slots":
        return await toolGetSlots(input);
      case "get_doctor_practices":
        return await toolGetPractices(input);
      case "check_doctor_calendar":
        return await toolCheckCalendar(input);
      case "book_appointment":
        return await toolBookAppointment(input);
      case "cancel_appointment":
        return await toolCancelAppointment(input);
      default:
        return JSON.stringify({ error: `Outil inconnu: ${name}` });
    }
  } catch (e) {
    console.error(`[chat] tool ${name} error:`, e);
    return JSON.stringify({ error: "Erreur interne lors de l'exécution de l'outil." });
  }
}

// ── search_doctors ──────────────────────────────────────────────────────────
async function toolSearchDoctors(input: Record<string, unknown>): Promise<string> {
  const specialty = typeof input.specialty === "string" ? input.specialty : null;
  const city = typeof input.city === "string" ? input.city : null;
  const query = typeof input.query === "string" ? input.query : null;

  const conditions = [eq(doctors.isActive, true)];
  if (specialty) conditions.push(eq(doctors.specialty, specialty));
  if (city) conditions.push(eq(doctors.city, city));
  if (query) {
    const q = `%${query}%`;
    conditions.push(or(ilike(doctors.name, q), ilike(doctors.address, q))!);
  }

  const results = await db
    .select({
      id: doctors.id,
      name: doctors.name,
      slug: doctors.slug,
      specialty: doctors.specialty,
      city: doctors.city,
      address: doctors.address,
      consultationFee: doctors.consultationFee,
      consultationMode: doctors.consultationMode,
    })
    .from(doctors)
    .where(and(...conditions))
    .limit(5);

  if (results.length === 0) {
    return JSON.stringify({ count: 0, doctors: [], message: "Aucun médecin trouvé" });
  }

  return JSON.stringify({
    count: results.length,
    doctors: results.map((d) => ({
      id: d.id,
      name: d.name,
      specialty: SPECIALTIES.find((s) => s.id === d.specialty)?.label ?? d.specialty,
      city: CITIES.find((c) => c.id === d.city)?.label ?? d.city,
      address: d.address,
      fee: d.consultationFee ? `${d.consultationFee / 1000} DT` : null,
      mode: d.consultationMode,
      profileUrl: `/medecin/${d.slug}`,
      bookingUrl: `/rdv/${d.slug}`,
    })),
  });
}

// ── suggest_specialty ──────────────────────────────────────────────────────
function toolSuggestSpecialty(input: Record<string, unknown>): string {
  const symptoms = String(input.symptoms || "").toLowerCase();
  const map: Array<{ keywords: string[]; specialty: string; label: string }> = [
    { keywords: ["peau", "bouton", "acné", "eczéma", "allergie cutané", "dermato", "جلد"], specialty: "dermatologue", label: "Dermatologue" },
    { keywords: ["oeil", "yeux", "vue", "lunette", "ophtalmo", "عين"], specialty: "ophtalmologue", label: "Ophtalmologue" },
    { keywords: ["dent", "caries", "gencive", "dentiste", "سن", "أسنان"], specialty: "dentiste", label: "Dentiste" },
    { keywords: ["enfant", "bébé", "nourrisson", "pédiatre", "طفل"], specialty: "pediatre", label: "Pédiatre" },
    { keywords: ["grossesse", "règles", "gynéco", "femme", "حمل"], specialty: "gynecologue", label: "Gynécologue" },
    { keywords: ["gorge", "oreille", "nez", "sinus", "orl", "أذن", "حلق"], specialty: "orl", label: "ORL" },
    { keywords: ["coeur", "tension", "cardiaque", "cardio", "palpitation", "قلب"], specialty: "cardiologue", label: "Cardiologue" },
    { keywords: ["os", "dos", "articulation", "fracture", "ortho", "عظم", "ظهر"], specialty: "orthopediste", label: "Orthopédiste" },
    { keywords: ["ventre", "estomac", "digest", "nausée", "gastro", "معدة", "بطن"], specialty: "gastrologue", label: "Gastro-entérologue" },
  ];
  const match = map.find((m) => m.keywords.some((k) => symptoms.includes(k)));
  const suggestion = match || { specialty: "generaliste", label: "Médecin généraliste" };
  return JSON.stringify({
    specialty: suggestion.specialty,
    label: suggestion.label,
    note: "Suggestion indicative. Consultez un médecin pour un diagnostic.",
  });
}

// ── identify_patient ────────────────────────────────────────────────────────
async function toolIdentifyPatient(input: Record<string, unknown>): Promise<string> {
  const phone = typeof input.phone === "string" ? formatPhone(input.phone) : null;
  const email = typeof input.email === "string" ? input.email.toLowerCase() : null;

  if (!phone && !email) {
    return JSON.stringify({ found: false, reason: "Numéro ou email requis" });
  }

  const conditions = [];
  if (phone) conditions.push(eq(patients.phone, phone));
  if (email) conditions.push(eq(patients.email, email));

  const [patient] = await db
    .select()
    .from(patients)
    .where(conditions.length > 1 ? or(...conditions) : conditions[0])
    .limit(1);

  if (!patient) {
    return JSON.stringify({ found: false });
  }

  // Get medical profile flags (no raw data)
  const [profile] = await db
    .select()
    .from(patientMedicalProfile)
    .where(eq(patientMedicalProfile.patientId, patient.id))
    .limit(1);

  // Get dependents
  const deps = await db
    .select({ name: patientDependents.name, relation: patientDependents.relation })
    .from(patientDependents)
    .where(eq(patientDependents.patientId, patient.id));

  // Get last 5 appointments
  const recentAppts = await db
    .select({
      id: appointments.id,
      startsAt: appointments.startsAt,
      status: appointments.status,
      type: appointments.type,
      doctorName: doctors.name,
      specialty: doctors.specialty,
    })
    .from(appointments)
    .innerJoin(doctors, eq(appointments.doctorId, doctors.id))
    .where(eq(appointments.patientId, patient.id))
    .orderBy(desc(appointments.startsAt))
    .limit(5);

  return JSON.stringify({
    found: true,
    patientId: patient.id,
    name: patient.name,
    phone: patient.phone,
    hasAllergies: !!(profile?.allergies),
    hasChronicConditions: !!(profile?.chronicConditions),
    dependents: deps.map((d) => ({ name: d.name, relation: d.relation })),
    recentAppointments: recentAppts.map((a) => ({
      id: a.id,
      date: format(new Date(a.startsAt), "dd/MM/yyyy"),
      time: format(new Date(a.startsAt), "HH:mm"),
      doctorName: a.doctorName,
      specialty: SPECIALTIES.find((s) => s.id === a.specialty)?.label ?? a.specialty,
      status: a.status,
      type: a.type,
    })),
  });
}

// ── get_doctor_appointment_types ─────────────────────────────────────────────
async function toolGetDoctorTypes(input: Record<string, unknown>): Promise<string> {
  const doctorId = String(input.doctorId || "");
  if (!doctorId) return JSON.stringify({ error: "doctorId requis" });

  const types = await db
    .select()
    .from(appointmentTypes)
    .where(and(eq(appointmentTypes.doctorId, doctorId), eq(appointmentTypes.isActive, true)));

  return JSON.stringify({
    types: types.map((t) => ({
      id: t.id,
      name: t.name,
      durationMinutes: t.durationMinutes,
      feeDT: t.fee ? t.fee / 1000 : null,
      mode: t.mode,
    })),
  });
}

// ── get_available_slots ──────────────────────────────────────────────────────
async function toolGetSlots(input: Record<string, unknown>): Promise<string> {
  const doctorId = String(input.doctorId || "");
  const date = String(input.date || "");
  if (!doctorId || !date) return JSON.stringify({ error: "doctorId et date requis" });

  let duration: number | undefined;
  const typeId = typeof input.appointmentTypeId === "string" ? input.appointmentTypeId : undefined;
  if (typeId) {
    const [type] = await db
      .select({ durationMinutes: appointmentTypes.durationMinutes })
      .from(appointmentTypes)
      .where(and(eq(appointmentTypes.id, typeId), eq(appointmentTypes.doctorId, doctorId)))
      .limit(1);
    if (type) duration = type.durationMinutes;
  }

  const allSlots = await getAvailableSlots(doctorId, date, duration);
  const freeSlots = allSlots.filter((s: { available: boolean }) => s.available).slice(0, 10);

  return JSON.stringify({
    date,
    totalSlots: allSlots.length,
    freeSlots: freeSlots.length,
    slots: freeSlots,
  });
}

// ── get_doctor_practices ─────────────────────────────────────────────────────
async function toolGetPractices(input: Record<string, unknown>): Promise<string> {
  const doctorId = String(input.doctorId || "");
  if (!doctorId) return JSON.stringify({ error: "doctorId requis" });

  const practices = await db
    .select()
    .from(doctorPractices)
    .where(and(eq(doctorPractices.doctorId, doctorId), eq(doctorPractices.isActive, true)));

  return JSON.stringify({
    practices: practices.map((p) => ({
      id: p.id,
      name: p.name,
      address: p.address,
      city: CITIES.find((c) => c.id === p.city)?.label ?? p.city,
      isPrimary: p.isPrimary,
    })),
  });
}

// ── check_doctor_calendar ────────────────────────────────────────────────────
async function toolCheckCalendar(input: Record<string, unknown>): Promise<string> {
  const doctorId = String(input.doctorId || "");
  if (!doctorId) return JSON.stringify({ error: "doctorId requis" });

  const typeId = typeof input.appointmentTypeId === "string" ? input.appointmentTypeId : undefined;
  let duration: number | undefined;
  if (typeId) {
    const [type] = await db
      .select({ durationMinutes: appointmentTypes.durationMinutes })
      .from(appointmentTypes)
      .where(and(eq(appointmentTypes.id, typeId), eq(appointmentTypes.doctorId, doctorId)))
      .limit(1);
    if (type) duration = type.durationMinutes;
  }

  const days: Array<{
    date: string;
    dayLabel: string;
    freeSlots: number;
    firstFreeSlot: string | null;
    closed: boolean;
  }> = [];

  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const dateStr = format(d, "yyyy-MM-dd");
    const dayLabel = format(d, "EEEE d MMMM", { locale: fr });

    const allSlots = await getAvailableSlots(doctorId, dateStr, duration);
    const free = allSlots.filter((s: { available: boolean }) => s.available);

    days.push({
      date: dateStr,
      dayLabel,
      freeSlots: free.length,
      firstFreeSlot: free.length > 0 ? (free[0] as { startTime: string }).startTime : null,
      closed: allSlots.length === 0,
    });
  }

  return JSON.stringify({ days });
}

// ── book_appointment ─────────────────────────────────────────────────────────
async function toolBookAppointment(input: Record<string, unknown>): Promise<string> {
  const doctorId = String(input.doctorId || "");
  const patientName = String(input.patientName || "");
  const patientPhone = typeof input.patientPhone === "string" ? formatPhone(input.patientPhone) : "";
  const date = String(input.date || "");
  const startTime = String(input.startTime || "");

  if (!doctorId || !patientName || !patientPhone || !date || !startTime) {
    return JSON.stringify({ success: false, reason: "Paramètres manquants" });
  }

  // Find or create patient
  let [patient] = await db
    .select()
    .from(patients)
    .where(eq(patients.phone, patientPhone))
    .limit(1);

  if (!patient) {
    [patient] = await db
      .insert(patients)
      .values({ name: patientName, phone: patientPhone })
      .returning();
  }

  // Get doctor
  const [doctor] = await db
    .select()
    .from(doctors)
    .where(eq(doctors.id, doctorId))
    .limit(1);

  if (!doctor) {
    return JSON.stringify({ success: false, reason: "Médecin introuvable" });
  }

  // Resolve slot duration
  let slotDuration: number | undefined;
  const typeId = typeof input.appointmentTypeId === "string" ? input.appointmentTypeId : undefined;
  if (typeId) {
    const [type] = await db
      .select()
      .from(appointmentTypes)
      .where(and(eq(appointmentTypes.id, typeId), eq(appointmentTypes.doctorId, doctorId), eq(appointmentTypes.isActive, true)))
      .limit(1);
    if (type) slotDuration = type.durationMinutes;
  }
  if (!slotDuration) {
    const [schedule] = await db
      .select()
      .from(doctorSchedules)
      .where(eq(doctorSchedules.doctorId, doctorId))
      .limit(1);
    slotDuration = schedule?.slotDuration ?? 20;
  }

  // Handle beneficiary
  let dependentId: string | undefined;
  const beneficiaryName = typeof input.beneficiaryName === "string" ? input.beneficiaryName.trim() : "";
  if (beneficiaryName) {
    const [existing] = await db
      .select()
      .from(patientDependents)
      .where(and(
        eq(patientDependents.patientId, patient.id),
        sql`lower(${patientDependents.name}) = lower(${beneficiaryName})`,
      ))
      .limit(1);
    if (existing) {
      dependentId = existing.id;
    } else {
      const [created] = await db
        .insert(patientDependents)
        .values({
          patientId: patient.id,
          name: beneficiaryName,
          relation: typeof input.beneficiaryRelation === "string" ? input.beneficiaryRelation : undefined,
        })
        .returning();
      dependentId = created.id;
    }
  }

  const startsAt = new Date(`${date}T${startTime}:00`);
  const endsAt = new Date(startsAt.getTime() + slotDuration * 60 * 1000);

  try {
    const appointment = await createAppointment({
      doctorId,
      patientId: patient.id,
      startsAt,
      endsAt,
      reason: typeof input.reason === "string" ? input.reason : undefined,
      appointmentTypeId: typeId,
      dependentId,
    });

    // Send confirmation SMS (best-effort)
    try {
      const specialty = SPECIALTIES.find((s) => s.id === doctor.specialty)?.label || "";
      const timeStr = format(startsAt, "HH:mm");
      const dateStr = format(startsAt, "EEEE d MMMM", { locale: fr });
      const smsMessage = `Doktori: RDV confirme le ${dateStr} a ${timeStr} avec ${doctor.name} (${specialty}), ${doctor.address}. Rappel la veille par SMS.`;
      await sendSMS(patientPhone, smsMessage, appointment.id);
    } catch (e) {
      console.error("[chat] SMS send failed:", e);
    }

    return JSON.stringify({
      success: true,
      appointmentId: appointment.id,
      message: `RDV confirmé le ${format(startsAt, "EEEE d MMMM", { locale: fr })} à ${format(startsAt, "HH:mm")} avec ${doctor.name}. SMS de rappel la veille.`,
      doctorName: doctor.name,
      date: format(startsAt, "dd/MM/yyyy"),
      time: format(startsAt, "HH:mm"),
      address: doctor.address,
    });
  } catch (e) {
    console.error("[chat] booking error:", e);
    return JSON.stringify({ success: false, reason: "Ce créneau n'est plus disponible. Essayez un autre horaire." });
  }
}

// ── cancel_appointment ───────────────────────────────────────────────────────
async function toolCancelAppointment(input: Record<string, unknown>): Promise<string> {
  const appointmentId = String(input.appointmentId || "");
  const patientPhone = typeof input.patientPhone === "string" ? formatPhone(input.patientPhone) : "";

  if (!appointmentId || !patientPhone) {
    return JSON.stringify({ success: false, reason: "appointmentId et patientPhone requis" });
  }

  // Verify patient owns this appointment
  const [appt] = await db
    .select({
      id: appointments.id,
      status: appointments.status,
      startsAt: appointments.startsAt,
      patientId: appointments.patientId,
    })
    .from(appointments)
    .where(eq(appointments.id, appointmentId))
    .limit(1);

  if (!appt) {
    return JSON.stringify({ success: false, reason: "Rendez-vous introuvable" });
  }

  // Verify phone matches the patient
  const [patient] = await db
    .select({ phone: patients.phone })
    .from(patients)
    .where(eq(patients.id, appt.patientId))
    .limit(1);

  if (!patient || patient.phone !== patientPhone) {
    return JSON.stringify({ success: false, reason: "Numéro de téléphone ne correspond pas" });
  }

  if (appt.status === "cancelled") {
    return JSON.stringify({ success: false, reason: "Ce rendez-vous est déjà annulé" });
  }

  if (appt.status === "completed") {
    return JSON.stringify({ success: false, reason: "Impossible d'annuler un rendez-vous terminé" });
  }

  await db
    .update(appointments)
    .set({ status: "cancelled", cancelledAt: new Date(), updatedAt: new Date() })
    .where(eq(appointments.id, appointmentId));

  return JSON.stringify({
    success: true,
    message: "Rendez-vous annulé avec succès.",
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// Rate limiting (in-memory, per IP)
// ──────────────────────────────────────────────────────────────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 30;
const BOOK_RATE_LIMIT = 5;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 5 * 60 * 1000 });
    return true;
  }
  entry.count++;
  return entry.count <= RATE_LIMIT;
}

function checkBookRateLimit(ip: string): boolean {
  const now = Date.now();
  const key = `book_${ip}`;
  const entry = rateLimitMap.get(key);
  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(key, { count: 1, resetAt: now + 60 * 60 * 1000 });
    return true;
  }
  entry.count++;
  return entry.count <= BOOK_RATE_LIMIT;
}

// ──────────────────────────────────────────────────────────────────────────────
// OpenRouter types
// ──────────────────────────────────────────────────────────────────────────────
interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
}

interface OpenRouterResponse {
  choices: Array<{
    message: ChatMessage;
    finish_reason: string;
  }>;
}

// ──────────────────────────────────────────────────────────────────────────────
// POST handler — OpenRouter with Grok
// ──────────────────────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Trop de messages. Réessayez dans 5 minutes." },
      { status: 429 },
    );
  }

  const body = await req.json();
  const userMessages: Array<{ role: string; content: string }> = body.messages || [];
  const locale: string = typeof body.locale === "string" ? body.locale : "fr";

  if (!Array.isArray(userMessages) || userMessages.length === 0) {
    return NextResponse.json({ error: "messages requis" }, { status: 400 });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL || "x-ai/grok-4-fast";

  if (!apiKey) {
    return NextResponse.json({
      role: "assistant",
      content:
        "Bonjour ! Je suis Dokti, l'assistant virtuel de Doktori. (Mode démo : configurez OPENROUTER_API_KEY pour activer les réponses intelligentes.) Vous pouvez rechercher un médecin via le bouton **Rechercher** en haut de la page.",
    });
  }

  const tools = getTools(locale);
  const messages: ChatMessage[] = [
    { role: "system", content: getSystemPrompt(locale) },
    ...userMessages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];

  const MAX_ITERATIONS = 8; // raised for multi-step booking flow

  try {
    for (let i = 0; i < MAX_ITERATIONS; i++) {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": "https://doktori.tn",
          "X-Title": "Doktori",
        },
        body: JSON.stringify({
          model,
          messages,
          tools,
          temperature: 0.3,
          max_tokens: 1024,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        console.error("OpenRouter error:", res.status, err);
        return NextResponse.json(
          { error: "Erreur de l'assistant. Réessayez." },
          { status: 500 },
        );
      }

      const data: OpenRouterResponse = await res.json();
      const message = data.choices[0]?.message;
      if (!message) {
        return NextResponse.json(
          { error: "Réponse vide de l'assistant." },
          { status: 500 },
        );
      }

      const toolCalls = message.tool_calls;

      if (!toolCalls || toolCalls.length === 0) {
        return NextResponse.json({
          role: "assistant",
          content: message.content || "",
        });
      }

      messages.push({
        role: "assistant",
        content: message.content,
        tool_calls: toolCalls,
      });

      for (const call of toolCalls) {
        // Rate-limit booking specifically
        if (call.function.name === "book_appointment" && !checkBookRateLimit(ip)) {
          messages.push({
            role: "tool",
            tool_call_id: call.id,
            content: JSON.stringify({ success: false, reason: "Trop de réservations. Réessayez plus tard." }),
          });
          continue;
        }

        let toolInput: Record<string, unknown> = {};
        try {
          toolInput = JSON.parse(call.function.arguments || "{}");
        } catch {}
        const result = await runTool(call.function.name, toolInput);
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: result,
        });
      }
    }

    return NextResponse.json({
      role: "assistant",
      content: "Je n'arrive pas à traiter cette demande. Pouvez-vous reformuler ?",
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erreur inconnue";
    console.error("Chat error:", msg);
    return NextResponse.json(
      { error: "Erreur de l'assistant. Réessayez." },
      { status: 500 },
    );
  }
}
