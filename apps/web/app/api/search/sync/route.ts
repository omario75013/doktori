import { NextResponse } from "next/server";
import { db, doctors } from "@doktori/db";
import { eq } from "drizzle-orm";
import { meili, DOCTORS_INDEX } from "@/lib/meilisearch";
import { SPECIALTIES, CITIES } from "@doktori/shared";

// City centroids (WGS84) — used for geo-ranking when geolocation is absent
const CITY_CENTROIDS: Record<string, { lat: number; lng: number }> = {
  tunis: { lat: 36.8065, lng: 10.1815 },
  "la-marsa": { lat: 36.878, lng: 10.3246 },
  "lac-1": { lat: 36.8395, lng: 10.238 },
  "lac-2": { lat: 36.846, lng: 10.2423 },
  ariana: { lat: 36.862, lng: 10.196 },
  "la-soukra": { lat: 36.887, lng: 10.255 },
  raoued: { lat: 36.9, lng: 10.22 },
  manouba: { lat: 36.81, lng: 10.1 },
};

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const allDoctors = await db
    .select()
    .from(doctors)
    .where(eq(doctors.isActive, true));

  const documents = allDoctors.map((d) => {
    const spec = SPECIALTIES.find((s) => s.id === d.specialty);
    const city = CITIES.find((c) => c.id === d.city);

    // Use doctor's own lat/lng if available, otherwise fall back to city centroid
    const lat = d.latitude ? Number(d.latitude) : CITY_CENTROIDS[d.city]?.lat;
    const lng = d.longitude ? Number(d.longitude) : CITY_CENTROIDS[d.city]?.lng;

    return {
      id: d.id,
      name: d.name,
      slug: d.slug,
      specialty: d.specialty,
      specialtyLabel: spec?.label || d.specialty,
      city: d.city,
      cityLabel: city?.label || d.city,
      address: d.address,
      bio: d.bio,
      consultationFee: d.consultationFee,
      photoUrl: d.photoUrl,
      consultation_mode: d.consultationMode,
      teleconsult_fee: d.teleconsultFee,
      average_rating: d.averageRating ?? 0,
      review_count: d.reviewCount ?? 0,
      searchContent: [
        d.name,
        spec?.label,
        d.specialty,
        city?.label,
        d.city,
        d.address,
        d.bio,
      ]
        .filter(Boolean)
        .join(" "),
      // Meilisearch geo attribute — enables ST_Distance-like sorting
      _geo: lat && lng ? { lat, lng } : undefined,
    };
  });

  const index = meili.index(DOCTORS_INDEX);
  await index.addDocuments(documents, { primaryKey: "id" });

  await index.updateSearchableAttributes([
    "name",
    "specialtyLabel",
    "cityLabel",
    "specialty",
    "city",
    "searchContent",
    "address",
    "bio",
  ]);

  await index.updateFilterableAttributes([
    "specialty",
    "city",
    "consultationFee",
    "consultation_mode",
    "average_rating",
    "_geo", // Enable geo filtering & sorting
  ]);

  await index.updateSortableAttributes(["name", "consultationFee", "average_rating", "_geo"]);

  // Ranking with geo priority when available
  await index.updateRankingRules([
    "words",
    "typo",
    "proximity",
    "attribute",
    "exactness",
    "sort",
  ]);

  // Synonyms for specialties + cities
  await index.updateSynonyms({
    dermato: ["dermatologue"],
    dermatologie: ["dermatologue"],
    peau: ["dermatologue"],
    ophtalmo: ["ophtalmologue"],
    ophtalmologie: ["ophtalmologue"],
    yeux: ["ophtalmologue"],
    vue: ["ophtalmologue"],
    gyneco: ["gynecologue"],
    gynéco: ["gynecologue"],
    gynécologie: ["gynecologue"],
    femme: ["gynecologue"],
    pediatre: ["pediatre"],
    pédiatre: ["pediatre"],
    pédiatrie: ["pediatre"],
    enfant: ["pediatre"],
    bebe: ["pediatre"],
    bébé: ["pediatre"],
    dentaire: ["dentiste"],
    dent: ["dentiste"],
    dents: ["dentiste"],
    orl: ["orl"],
    oto: ["orl"],
    gorge: ["orl"],
    oreille: ["orl"],
    cardio: ["cardiologue"],
    cardiologie: ["cardiologue"],
    coeur: ["cardiologue"],
    cœur: ["cardiologue"],
    ortho: ["orthopediste"],
    orthopedie: ["orthopediste"],
    orthopédie: ["orthopediste"],
    os: ["orthopediste"],
    gastro: ["gastrologue"],
    gastroenterologie: ["gastrologue"],
    ventre: ["gastrologue"],
    digestion: ["gastrologue"],
    generaliste: ["generaliste"],
    généraliste: ["generaliste"],
    mg: ["generaliste"],
    docteur: ["generaliste"],
    medecin: ["generaliste"],
    médecin: ["generaliste"],
    toubib: ["generaliste"],
    tbib: ["generaliste"],
    lamarsa: ["la-marsa"],
    marsa: ["la-marsa"],
    "la marsa": ["la-marsa"],
    lac: ["lac-1", "lac-2"],
    "lac 1": ["lac-1"],
    "lac 2": ["lac-2"],
    lac1: ["lac-1"],
    lac2: ["lac-2"],
    "berges du lac": ["lac-1", "lac-2"],
    soukra: ["la-soukra"],
    lasoukra: ["la-soukra"],
    "la soukra": ["la-soukra"],
  });

  await index.updateStopWords([
    "le", "la", "les", "un", "une", "des", "de", "du", "au", "aux",
    "et", "ou", "pour", "dans", "sur", "avec", "sans", "par",
    "je", "tu", "il", "elle", "nous", "vous", "ils", "elles",
    "cherche", "trouve", "besoin", "voudrais", "veux",
  ]);

  await index.updateTypoTolerance({
    enabled: true,
    minWordSizeForTypos: {
      oneTypo: 4,
      twoTypos: 7,
    },
  });

  await index.updatePagination({ maxTotalHits: 500 });

  return NextResponse.json({
    synced: documents.length,
    configured: true,
  });
}
