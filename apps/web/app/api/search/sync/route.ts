import { NextResponse } from "next/server";
import { db, doctors, clinics } from "@doktori/db";
import { and, eq } from "drizzle-orm";
import { meili, DOCTORS_INDEX, CLINICS_INDEX } from "@/lib/meilisearch";
import { SPECIALTIES, CITIES } from "@doktori/shared";

// City centroids (WGS84) — used for geo-ranking when geolocation is absent
const CITY_CENTROIDS: Record<string, { lat: number; lng: number }> = {
  // Grand Tunis
  tunis: { lat: 36.8065, lng: 10.1815 },
  "la-marsa": { lat: 36.878, lng: 10.3246 },
  "lac-1": { lat: 36.8395, lng: 10.238 },
  "lac-2": { lat: 36.846, lng: 10.2423 },
  ariana: { lat: 36.862, lng: 10.196 },
  "la-soukra": { lat: 36.887, lng: 10.255 },
  raoued: { lat: 36.9, lng: 10.22 },
  manouba: { lat: 36.81, lng: 10.1 },
  "ben-arous": { lat: 36.7533, lng: 10.2283 },
  ezzahra: { lat: 36.7464, lng: 10.3095 },
  "hammam-lif": { lat: 36.7281, lng: 10.3373 },
  // Major cities
  sfax: { lat: 34.7406, lng: 10.7603 },
  sousse: { lat: 35.8254, lng: 10.6369 },
  monastir: { lat: 35.7643, lng: 10.8113 },
  bizerte: { lat: 37.2746, lng: 9.8739 },
  nabeul: { lat: 36.4561, lng: 10.7376 },
  hammamet: { lat: 36.4000, lng: 10.6167 },
  kairouan: { lat: 35.6781, lng: 10.0963 },
  gabes: { lat: 33.8815, lng: 10.0982 },
  medenine: { lat: 33.3549, lng: 10.5053 },
  djerba: { lat: 33.8076, lng: 10.8451 },
  beja: { lat: 36.7256, lng: 9.1817 },
  jendouba: { lat: 36.5011, lng: 8.7803 },
};

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Only index doctors who are active AND visible (visibility is controlled by subscription/trial status)
    const allDoctors = await db
      .select()
      .from(doctors)
      .where(and(eq(doctors.isActive, true), eq(doctors.isVisible, true)));

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
          spec?.labelAr,
          d.specialty,
          city?.label,
          city?.labelAr,
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
      // New specialties
      pneumo: ["pneumologue"],
      poumon: ["pneumologue"],
      neuro: ["neurologue"],
      neurologie: ["neurologue"],
      cerveau: ["neurologue"],
      rhumato: ["rhumatologue"],
      rhumatologie: ["rhumatologue"],
      articulations: ["rhumatologue"],
      uro: ["urologue"],
      urologie: ["urologue"],
      prostate: ["urologue"],
      reins: ["nephrologue"],
      rein: ["nephrologue"],
      dialyse: ["nephrologue"],
      endocrino: ["endocrinologue"],
      thyroide: ["endocrinologue"],
      hormones: ["endocrinologue"],
      psy: ["psychiatre"],
      psychologue: ["psychiatre"],
      depression: ["psychiatre"],
      radio: ["radiologue"],
      irm: ["radiologue"],
      scanner: ["radiologue"],
      chirurgie: ["chirurgien"],
      operation: ["chirurgien"],
      allergie: ["allergologue"],
      allergies: ["allergologue"],
      asthme: ["allergologue", "pneumologue"],
      // Cities — Grand Tunis
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
      "ben arous": ["ben-arous"],
      benarous: ["ben-arous"],
      zahra: ["ezzahra"],
      "hammam lif": ["hammam-lif"],
      // Cities — national
      sfax: ["sfax"],
      sousse: ["sousse"],
      monastir: ["monastir"],
      bizerte: ["bizerte"],
      nabeul: ["nabeul"],
      hammamet: ["hammamet"],
      kairouan: ["kairouan"],
      gabes: ["gabes"],
      medenine: ["medenine"],
      djerba: ["djerba"],
      jerba: ["djerba"],
      beja: ["beja"],
      béja: ["beja"],
      jendouba: ["jendouba"],
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

    // ── Index clinics ───────────────────────────────────────────────────────────
    const allClinics = await db.select().from(clinics);
    const clinicDocuments = allClinics.map((c) => {
      const cityLabel = CITIES.find((city) => city.id === c.city)?.label ?? c.city;
      return {
        id: `clinic-${c.id}`,
        type: "clinic" as const,
        name: c.name,
        city: c.city,
        cityLabel,
        address: c.address,
        slug: c.slug,
        logoUrl: c.logoUrl,
        searchContent: [c.name, c.city, cityLabel, c.address].filter(Boolean).join(" "),
      };
    });

    const clinicsIndex = meili.index(CLINICS_INDEX);
    await clinicsIndex.addDocuments(clinicDocuments, { primaryKey: "id" });

    await clinicsIndex.updateSearchableAttributes([
      "name",
      "cityLabel",
      "city",
      "address",
      "searchContent",
    ]);

    await clinicsIndex.updateFilterableAttributes(["city", "type"]);
    await clinicsIndex.updateSortableAttributes(["name"]);

    return NextResponse.json({
      synced: documents.length,
      clinicsSynced: clinicDocuments.length,
      configured: true,
    });
  } catch (e) {
    console.error("[POST /api//search/sync]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
