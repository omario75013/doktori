import postgres from "postgres";

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://doktori:doktori_dev@localhost:5433/doktori";

const sql = postgres(DATABASE_URL);

// ───────────────────────────── DATA POOLS ─────────────────────────────────────

const FMT = "Faculté de Médecine de Tunis";
const FMS = "Faculté de Médecine de Sousse";
const FMSx = "Faculté de Médecine de Sfax";
const FMM = "Faculté de Médecine de Monastir";
const PARIS = "Université Paris Descartes (France)";
const MONTPELLIER = "Université de Montpellier (France)";
const LYON = "Université Claude Bernard Lyon 1 (France)";

const HOSPITALS_TN = [
  "CHU La Rabta, Tunis",
  "CHU Charles Nicolle, Tunis",
  "CHU Habib Thameur, Tunis",
  "Hôpital Aziza Othmana, Tunis",
  "CHU Sahloul, Sousse",
  "CHU Farhat Hached, Sousse",
  "CHU Hédi Chaker, Sfax",
  "CHU Fattouma Bourguiba, Monastir",
  "Hôpital Militaire Principal d'Instruction, Tunis",
];

const PRIVATE_CLINICS_TN = [
  "Polyclinique Les Berges du Lac",
  "Clinique Taoufik, Tunis",
  "Clinique El Manar",
  "Clinique Ennasr",
  "Clinique Pasteur, Tunis",
  "Clinique Avicenne, Tunis",
  "Polyclinique Alyssa, Ariana",
  "Clinique Amen, La Marsa",
];

const FOREIGN_STAGES = [
  "Stage CHU Pitié-Salpêtrière, Paris",
  "Stage Hôpital Necker-Enfants Malades, Paris",
  "Stage CHU Montpellier",
  "Stage Hôpital Européen Georges-Pompidou, Paris",
  "Stage CHU Lyon Sud",
];

const EXPERTISE_BY_SPECIALTY: Record<string, string[]> = {
  generaliste: [
    "Médecine préventive",
    "Suivi des maladies chroniques (HTA, diabète)",
    "Vaccinations adulte et enfant",
    "Certificats médicaux",
    "Petite chirurgie ambulatoire",
  ],
  dermatologue: [
    "Acné et cicatrices",
    "Dermatologie esthétique",
    "Dépistage mélanome",
    "Laser et photoprotection",
    "Pelade et psoriasis",
    "Dermatologie pédiatrique",
  ],
  ophtalmologue: [
    "Chirurgie de la cataracte",
    "Glaucome",
    "Strabisme infantile",
    "Adaptation lentilles",
    "DMLA",
    "Ophtalmologie pédiatrique",
  ],
  gynecologue: [
    "Suivi de grossesse",
    "Échographie obstétricale",
    "Contraception",
    "Ménopause",
    "Endométriose",
    "Fertilité",
  ],
  pediatre: [
    "Suivi du nourrisson",
    "Vaccinations enfant",
    "Allergies pédiatriques",
    "Asthme et bronchiolite",
    "Troubles du développement",
    "Pédiatrie préventive",
  ],
  dentiste: [
    "Soins conservateurs",
    "Prothèse dentaire",
    "Orthodontie",
    "Blanchiment",
    "Implantologie",
    "Parodontie",
  ],
  orl: [
    "Otites à répétition",
    "Rhinites chroniques",
    "Audition et surdité",
    "Amygdalectomie",
    "Vertiges",
    "Troubles du sommeil",
  ],
  cardiologue: [
    "HTA et insuffisance cardiaque",
    "ECG d'effort",
    "Échocardiographie",
    "Holter tensionnel",
    "Prévention cardiovasculaire",
    "Arythmies",
  ],
  orthopediste: [
    "Traumatologie sportive",
    "Arthroscopie du genou",
    "Prothèses de hanche et genou",
    "Chirurgie de la main",
    "Scoliose",
    "Rééducation post-opératoire",
  ],
  gastrologue: [
    "Fibroscopie et coloscopie",
    "Maladies inflammatoires (MICI)",
    "Reflux gastro-œsophagien",
    "Hépatites virales",
    "Troubles fonctionnels digestifs",
    "Helicobacter pylori",
  ],
};

const LANGUAGES_POOL: Array<{ name: string; weight: number }> = [
  { name: "Français", weight: 1 },
  { name: "Arabe", weight: 1 },
  { name: "Anglais", weight: 0.8 },
  { name: "Italien", weight: 0.15 },
  { name: "Allemand", weight: 0.1 },
  { name: "Espagnol", weight: 0.1 },
];

// ───────────────────────────── REVIEW POOLS ───────────────────────────────────

const REVIEW_COMMENTS_POSITIVE = [
  "Médecin à l'écoute, explications claires. Je recommande vivement.",
  "Très professionnel, prise en charge rapide et efficace.",
  "Cabinet propre, accueil chaleureux, consultation approfondie.",
  "Excellent médecin, m'a rassuré et bien conseillé.",
  "Ponctuel, pédagogue. Je reviendrai sans hésiter.",
  "Consultation de qualité, a pris le temps de bien expliquer.",
  "Docteur très humain, merci pour votre patience.",
  "Prise en charge impeccable du début à la fin.",
  "Très compétent et à l'écoute. Bravo pour votre sérieux.",
  "Rien à redire, parfait. Le meilleur de sa spécialité à mon avis.",
  "Secrétariat réactif, rendez-vous obtenu rapidement via Doktori.",
  "Diagnostic précis, traitement efficace. Merci docteur.",
  "Très bon contact avec les enfants, mes enfants adorent y aller.",
  "Professionnel et bienveillant, consultation sans précipitation.",
  "Cabinet moderne, matériel récent. Je recommande à 100%.",
];

const REVIEW_COMMENTS_MIXED = [
  "Bon médecin mais un peu d'attente pour le rendez-vous.",
  "Consultation correcte, rien de spécial à signaler.",
  "Salle d'attente un peu petite mais médecin compétent.",
  "Un peu rapide mais efficace.",
  "Médecin sérieux, parking difficile à trouver.",
];

const PATIENT_FIRST_NAMES = [
  "Ahmed", "Mohamed", "Ali", "Youssef", "Karim", "Sami", "Hichem", "Nizar",
  "Leila", "Sonia", "Amira", "Mariem", "Nadia", "Ines", "Sarra", "Rim",
  "Salma", "Yosra", "Mehdi", "Bilel", "Anas", "Adam", "Lina", "Emna",
];
const PATIENT_LAST_NAMES = [
  "Ben Salah", "Trabelsi", "Khelifi", "Gharbi", "Mansour", "Ben Ali",
  "Belhaj", "Chaouch", "Bouzid", "Hamdi", "Jemli", "Karray", "Zouari",
];

// ───────────────────────────── UTILITIES ──────────────────────────────────────

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  for (let i = 0; i < n && copy.length > 0; i++) {
    const idx = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}

function pickLanguages(): string[] {
  const out: string[] = ["Français", "Arabe"];
  if (Math.random() < 0.8) out.push("Anglais");
  for (const lang of LANGUAGES_POOL) {
    if (out.includes(lang.name)) continue;
    if (Math.random() < lang.weight * 0.3) out.push(lang.name);
  }
  return out;
}

function buildParcours(specialty: string, yearsExp: number) {
  const currentYear = 2026;
  const gradYear = currentYear - yearsExp;
  const bachelorYear = gradYear - 7;
  const facs = [FMT, FMS, FMSx, FMM];

  const educations = [
    {
      degree: "Doctorat en médecine",
      institution: pick(facs),
      year: gradYear,
    },
    {
      degree: `Spécialisation en ${specialty.charAt(0).toUpperCase() + specialty.slice(1)}`,
      institution: pick(facs),
      year: gradYear + (Math.random() < 0.5 ? 4 : 5),
    },
  ];
  if (Math.random() < 0.4) {
    educations.push({
      degree: "DIU (Diplôme Inter-Universitaire)",
      institution: pick([PARIS, MONTPELLIER, LYON]),
      year: gradYear + 6,
    });
  }

  const experiences: Array<{
    role: string;
    place: string;
    startYear: number;
    endYear: number | null;
  }> = [];

  // Residency
  experiences.push({
    role: "Interne en médecine",
    place: pick(HOSPITALS_TN),
    startYear: gradYear,
    endYear: gradYear + 4,
  });

  // Optional fellowship abroad
  if (Math.random() < 0.35) {
    experiences.push({
      role: "Fellow en mobilité internationale",
      place: pick(FOREIGN_STAGES),
      startYear: gradYear + 4,
      endYear: gradYear + 5,
    });
  }

  // Current practice
  const currentStart = gradYear + Math.min(6, yearsExp - 2);
  experiences.push({
    role: `${specialty.charAt(0).toUpperCase() + specialty.slice(1)} en exercice libéral`,
    place: pick(PRIVATE_CLINICS_TN),
    startYear: currentStart,
    endYear: null,
  });

  const expertise = pickN(
    EXPERTISE_BY_SPECIALTY[specialty] || EXPERTISE_BY_SPECIALTY.generaliste,
    3 + Math.floor(Math.random() * 3)
  );

  return { educations, experiences, expertise };
}

function buildReviewComment(): { comment: string; rating: number } {
  const roll = Math.random();
  if (roll < 0.8) {
    return { comment: pick(REVIEW_COMMENTS_POSITIVE), rating: 5 };
  }
  if (roll < 0.95) {
    return { comment: pick(REVIEW_COMMENTS_POSITIVE), rating: 4 };
  }
  return { comment: pick(REVIEW_COMMENTS_MIXED), rating: 3 };
}

// ─────────────────────────────── MAIN ─────────────────────────────────────────

async function main() {
  console.log("🌱 Loading doctors...");
  const allDoctors = await sql<Array<{ id: string; specialty: string }>>`
    SELECT id, specialty FROM doctors
  `;
  console.log(`   Found ${allDoctors.length} doctors`);

  console.log("📚 Generating parcours...");
  for (const doc of allDoctors) {
    const yearsExp = 8 + Math.floor(Math.random() * 22);
    const { educations, experiences, expertise } = buildParcours(
      doc.specialty,
      yearsExp
    );
    const languages = pickLanguages();

    await sql`
      UPDATE doctors SET
        educations = ${JSON.stringify(educations)}::jsonb,
        experiences = ${JSON.stringify(experiences)}::jsonb,
        languages = ${JSON.stringify(languages)}::jsonb,
        expertise = ${JSON.stringify(expertise)}::jsonb,
        years_of_experience = ${yearsExp}
      WHERE id = ${doc.id}
    `;
  }
  console.log(`   ✓ Parcours set for ${allDoctors.length} doctors`);

  // ── Reviews ────────────────────────────────────────────────────────────────
  console.log("⭐ Seeding reviews...");

  const existingPatients = await sql<Array<{ id: string }>>`SELECT id FROM patients`;
  const patientPool: Array<{ id: string }> = [...existingPatients];
  const needed = 30 - patientPool.length;
  for (let i = 0; i < needed; i++) {
    const name = `${pick(PATIENT_FIRST_NAMES)} ${pick(PATIENT_LAST_NAMES)}`;
    const phone = `+216${50000000 + Math.floor(Math.random() * 49999999)}`;
    try {
      const [inserted] = await sql<Array<{ id: string }>>`
        INSERT INTO patients (name, phone) VALUES (${name}, ${phone})
        RETURNING id
      `;
      patientPool.push(inserted);
    } catch {
      // phone collision
    }
  }
  console.log(`   Using ${patientPool.length} patients for reviews`);

  await sql`DELETE FROM reviews WHERE comment = ANY(${[
    ...REVIEW_COMMENTS_POSITIVE,
    ...REVIEW_COMMENTS_MIXED,
  ]})`;

  let reviewCount = 0;
  for (const doc of allDoctors) {
    const n = 8 + Math.floor(Math.random() * 13);
    for (let i = 0; i < n; i++) {
      const patient = pick(patientPool);
      const daysAgo = 1 + Math.floor(Math.random() * 180);
      const startsAt = new Date();
      startsAt.setDate(startsAt.getDate() - daysAgo);
      const endsAt = new Date(startsAt.getTime() + 20 * 60 * 1000);

      const [appt] = await sql<Array<{ id: string }>>`
        INSERT INTO appointments (doctor_id, patient_id, starts_at, ends_at, status, type, reason)
        VALUES (${doc.id}, ${patient.id}, ${startsAt}, ${endsAt}, 'completed', 'cabinet', 'Consultation (seed)')
        RETURNING id
      `;

      const { comment, rating } = buildReviewComment();
      await sql`
        INSERT INTO reviews (doctor_id, patient_id, appointment_id, rating, comment, verified)
        VALUES (${doc.id}, ${patient.id}, ${appt.id}, ${rating}, ${comment}, true)
      `;
      reviewCount++;
    }
  }
  console.log(`   ✓ ${reviewCount} reviews seeded`);

  console.log("✅ Done");
  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
