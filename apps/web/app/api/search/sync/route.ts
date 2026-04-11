import { NextResponse } from "next/server";
import { db, doctors } from "@doktori/db";
import { eq } from "drizzle-orm";
import { meili, DOCTORS_INDEX } from "@/lib/meilisearch";
import { SPECIALTIES, CITIES } from "@doktori/shared";

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const allDoctors = await db
    .select()
    .from(doctors)
    .where(eq(doctors.isActive, true));

  // Build rich search document — include all aliases + denormalized fields
  const documents = allDoctors.map((d) => {
    const spec = SPECIALTIES.find((s) => s.id === d.specialty);
    const city = CITIES.find((c) => c.id === d.city);
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
      // Flattened searchable content — all keywords in one field for broad matching
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
    };
  });

  const index = meili.index(DOCTORS_INDEX);
  await index.addDocuments(documents, { primaryKey: "id" });

  // ═════════════════════════ SEARCH CONFIGURATION ═════════════════════════

  // Searchable attributes — order matters for ranking (first = most important)
  await index.updateSearchableAttributes([
    "name", // Doctor name has highest priority
    "specialtyLabel", // Then specialty
    "cityLabel", // Then city
    "specialty", // ID variant (e.g. "dermatologue")
    "city", // ID variant (e.g. "la-marsa")
    "searchContent", // Flat content fallback
    "address",
    "bio",
  ]);

  await index.updateFilterableAttributes(["specialty", "city"]);
  await index.updateSortableAttributes(["name"]);

  // Ranking rules — custom order for medical search
  await index.updateRankingRules([
    "words", // Number of matched query words (higher first)
    "typo", // Fewer typos first
    "proximity", // Words closer together first
    "attribute", // Matches in higher-priority attributes first
    "exactness", // Exact matches first
    "sort", // User sort
  ]);

  // ═════════════════════════ SYNONYMS ═════════════════════════
  // Map common user terms to specialty names
  await index.updateSynonyms({
    // Specialty synonyms
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
    docteur: ["generaliste", "dermatologue", "cardiologue"],
    medecin: ["generaliste"],
    médecin: ["generaliste"],
    toubib: ["generaliste"],
    tbib: ["generaliste"],
    // City synonyms & aliases
    lamarsa: ["la-marsa"],
    marsa: ["la-marsa"],
    "la marsa": ["la-marsa"],
    lac: ["lac-1", "lac-2"],
    "lac 1": ["lac-1"],
    "lac 2": ["lac-2"],
    "lac1": ["lac-1"],
    "lac2": ["lac-2"],
    "berges du lac": ["lac-1", "lac-2"],
    centre: ["tunis"],
    centreville: ["tunis"],
    "centre ville": ["tunis"],
    ariana: ["ariana"],
    soukra: ["la-soukra"],
    lasoukra: ["la-soukra"],
    "la soukra": ["la-soukra"],
    manouba: ["manouba"],
  });

  // ═════════════════════════ STOP WORDS ═════════════════════════
  await index.updateStopWords([
    "le", "la", "les", "un", "une", "des", "de", "du", "au", "aux",
    "et", "ou", "pour", "dans", "sur", "avec", "sans", "par",
    "je", "tu", "il", "elle", "nous", "vous", "ils", "elles",
    "cherche", "trouve", "besoin", "voudrais", "veux",
  ]);

  // ═════════════════════════ TYPO TOLERANCE ═════════════════════════
  await index.updateTypoTolerance({
    enabled: true,
    minWordSizeForTypos: {
      oneTypo: 4, // Allow 1 typo for words ≥ 4 chars (e.g. "derm" → "derma")
      twoTypos: 7, // Allow 2 typos for words ≥ 7 chars
    },
    disableOnWords: [],
    disableOnAttributes: [],
  });

  // ═════════════════════════ PAGINATION ═════════════════════════
  await index.updatePagination({
    maxTotalHits: 500,
  });

  return NextResponse.json({
    synced: documents.length,
    configured: true,
  });
}
