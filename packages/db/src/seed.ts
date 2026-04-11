import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import postgres from "postgres";
import bcrypt from "bcryptjs";
import { generateSlug } from "@doktori/shared";
import { doctors, doctorSchedules } from "./schema";

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://doktori:doktori_dev@localhost:5433/doktori";

const client = postgres(DATABASE_URL);
const db = drizzle(client);

// ─── Doctor definitions ───────────────────────────────────────────────────────

const SEED_DOCTORS = [
  {
    name: "Dr. Karim Ben Ali",
    email: "karim.benali@doktori.tn",
    phone: "+21620000001",
    specialty: "generaliste",
    city: "la-marsa",
    address: "12 Avenue Habib Bourguiba, La Marsa",
    bio: "Médecin généraliste avec 15 ans d'expérience, spécialisé en médecine familiale.",
    consultationFee: 40000, // 40 DT in millimes
    latitude: "36.8878",
    longitude: "10.3249",
  },
  {
    name: "Dr. Sonia Trabelsi",
    email: "sonia.trabelsi@doktori.tn",
    phone: "+21620000002",
    specialty: "dermatologue",
    city: "tunis",
    address: "45 Rue de la Liberté, Tunis Centre",
    bio: "Dermatologue certifiée, experte en dermatologie esthétique et médicale.",
    consultationFee: 80000, // 80 DT in millimes
    latitude: "36.8065",
    longitude: "10.1815",
  },
  {
    name: "Dr. Mohamed Gharbi",
    email: "mohamed.gharbi@doktori.tn",
    phone: "+21620000003",
    specialty: "pediatre",
    city: "ariana",
    address: "7 Rue de l'Indépendance, Ariana",
    bio: "Pédiatre passionné, dédié à la santé et au bien-être des enfants de 0 à 18 ans.",
    consultationFee: 60000, // 60 DT in millimes
    latitude: "36.8625",
    longitude: "10.1956",
  },
  {
    name: "Dr. Amira Jlassi",
    email: "amira.jlassi@doktori.tn",
    phone: "+21620000004",
    specialty: "gynecologue",
    city: "lac-2",
    address: "22 Rue du Lac Léman, Les Berges du Lac 2",
    bio: "Gynécologue-obstétricienne, accompagne les femmes à chaque étape de leur vie.",
    consultationFee: 90000, // 90 DT in millimes
    latitude: "36.8358",
    longitude: "10.2330",
  },
  {
    name: "Dr. Youssef Hamdi",
    email: "youssef.hamdi@doktori.tn",
    phone: "+21620000005",
    specialty: "dentiste",
    city: "la-marsa",
    address: "3 Rue Sidi Bou Saïd, La Marsa",
    bio: "Chirurgien-dentiste, spécialisé en implantologie et esthétique dentaire.",
    consultationFee: 70000, // 70 DT in millimes
    latitude: "36.8767",
    longitude: "10.3245",
  },
];

// ─── Schedule builder ─────────────────────────────────────────────────────────
// Mon–Fri (1–5): 08:00–12:00 + 14:00–18:00
// Sat (6):       08:00–12:00

function buildSchedules(doctorId: string) {
  const schedules: Array<{
    doctorId: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    slotDuration: number;
    isActive: boolean;
  }> = [];

  // Monday–Friday: morning + afternoon blocks
  for (let day = 1; day <= 5; day++) {
    schedules.push(
      { doctorId, dayOfWeek: day, startTime: "08:00", endTime: "12:00", slotDuration: 20, isActive: true },
      { doctorId, dayOfWeek: day, startTime: "14:00", endTime: "18:00", slotDuration: 20, isActive: true }
    );
  }

  // Saturday: morning only
  schedules.push({
    doctorId,
    dayOfWeek: 6,
    startTime: "08:00",
    endTime: "12:00",
    slotDuration: 20,
    isActive: true,
  });

  return schedules;
}

// ─── Main seed ────────────────────────────────────────────────────────────────

async function seed() {
  console.log("Seeding doctors...");

  const passwordHash = await bcrypt.hash("password123", 10);

  for (const data of SEED_DOCTORS) {
    const slug = generateSlug(data.name, data.specialty, data.city);

    // Upsert doctor by email — idempotent on re-run
    const [doctor] = await db
      .insert(doctors)
      .values({
        name: data.name,
        slug,
        email: data.email,
        passwordHash,
        phone: data.phone,
        specialty: data.specialty,
        city: data.city,
        address: data.address,
        bio: data.bio,
        consultationFee: data.consultationFee,
        latitude: data.latitude,
        longitude: data.longitude,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: doctors.email,
        set: { name: data.name, updatedAt: new Date() },
      })
      .returning({ id: doctors.id, name: doctors.name });

    console.log(`  Created: ${doctor.name} (${doctor.id})`);

    // Delete existing schedules for this doctor then re-insert (idempotent)
    await db.delete(doctorSchedules).where(eq(doctorSchedules.doctorId, doctor.id));

    const scheduleRows = buildSchedules(doctor.id);
    await db.insert(doctorSchedules).values(scheduleRows);
    console.log(`    -> ${scheduleRows.length} schedule blocks inserted`);
  }

  console.log("\nSeed complete. 5 doctors created with schedules.");
  await client.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
