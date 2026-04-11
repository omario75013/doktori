import { NextResponse } from "next/server";
import { db, doctors } from "@doktori/db";
import { eq } from "drizzle-orm";
import { meili, DOCTORS_INDEX } from "@/lib/meilisearch";
import { SPECIALTIES, CITIES } from "@doktori/shared";

export async function POST(req: Request) {
  // Protected: only callable with CRON_SECRET
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const allDoctors = await db.select().from(doctors).where(eq(doctors.isActive, true));

  const documents = allDoctors.map((d) => ({
    id: d.id,
    name: d.name,
    slug: d.slug,
    specialty: d.specialty,
    specialtyLabel: SPECIALTIES.find((s) => s.id === d.specialty)?.label || d.specialty,
    city: d.city,
    cityLabel: CITIES.find((c) => c.id === d.city)?.label || d.city,
    address: d.address,
    bio: d.bio,
    consultationFee: d.consultationFee,
    photoUrl: d.photoUrl,
  }));

  const index = meili.index(DOCTORS_INDEX);
  await index.addDocuments(documents, { primaryKey: "id" });

  await index.updateSettings({
    searchableAttributes: ["name", "specialtyLabel", "cityLabel", "address", "bio"],
    filterableAttributes: ["specialty", "city"],
    sortableAttributes: ["name"],
  });

  return NextResponse.json({ synced: documents.length });
}
