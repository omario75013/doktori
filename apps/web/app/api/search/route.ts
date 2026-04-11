import { NextResponse } from "next/server";
import { meili, DOCTORS_INDEX } from "@/lib/meilisearch";
import { SPECIALTIES, CITIES } from "@doktori/shared";

// Normalize a string for matching: lowercase, strip accents, trim
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

// Build keyword maps from SPECIALTIES and CITIES
const SPECIALTY_KEYWORDS = new Map<string, string>();
for (const spec of SPECIALTIES) {
  SPECIALTY_KEYWORDS.set(normalize(spec.id), spec.id);
  SPECIALTY_KEYWORDS.set(normalize(spec.label), spec.id);
  // Add common shortforms
  const short = normalize(spec.label).slice(0, 6);
  if (short.length >= 4) SPECIALTY_KEYWORDS.set(short, spec.id);
}
// Additional manual specialty aliases
const SPECIALTY_ALIASES: Record<string, string> = {
  dermato: "dermatologue",
  dermatologie: "dermatologue",
  ophtalmo: "ophtalmologue",
  ophtalmologie: "ophtalmologue",
  gyneco: "gynecologue",
  gynecologie: "gynecologue",
  pediatre: "pediatre",
  pediatrie: "pediatre",
  cardio: "cardiologue",
  cardiologie: "cardiologue",
  ortho: "orthopediste",
  orthopedie: "orthopediste",
  gastro: "gastrologue",
  generaliste: "generaliste",
  mg: "generaliste",
  medecin: "generaliste",
  toubib: "generaliste",
  tbib: "generaliste",
  orl: "orl",
  dentaire: "dentiste",
  dentiste: "dentiste",
};
for (const [k, v] of Object.entries(SPECIALTY_ALIASES)) {
  SPECIALTY_KEYWORDS.set(normalize(k), v);
}

const CITY_KEYWORDS = new Map<string, string>();
for (const city of CITIES) {
  CITY_KEYWORDS.set(normalize(city.id), city.id);
  CITY_KEYWORDS.set(normalize(city.label), city.id);
}
const CITY_ALIASES: Record<string, string> = {
  marsa: "la-marsa",
  lamarsa: "la-marsa",
  "la marsa": "la-marsa",
  soukra: "la-soukra",
  lasoukra: "la-soukra",
  "la soukra": "la-soukra",
  "lac 1": "lac-1",
  "lac1": "lac-1",
  "lac 2": "lac-2",
  "lac2": "lac-2",
  centre: "tunis",
  centreville: "tunis",
  "centre ville": "tunis",
  tunis: "tunis",
  ariana: "ariana",
  manouba: "manouba",
  raoued: "raoued",
};
for (const [k, v] of Object.entries(CITY_ALIASES)) {
  CITY_KEYWORDS.set(normalize(k), v);
}

/**
 * Parse a free-text query and extract:
 * - Detected specialty (if any)
 * - Detected city (if any)
 * - Remaining free-text (e.g. doctor name)
 *
 * Example: "dermato ariana" → { specialty: "dermatologue", city: "ariana", rest: "" }
 *          "trabelsi" → { specialty: null, city: null, rest: "trabelsi" }
 *          "dermatologue karim la marsa" → { specialty: "dermatologue", city: "la-marsa", rest: "karim" }
 */
function parseQuery(raw: string): {
  specialty: string | null;
  city: string | null;
  rest: string;
} {
  const normalized = normalize(raw);
  if (!normalized) return { specialty: null, city: null, rest: "" };

  let specialty: string | null = null;
  let city: string | null = null;
  const tokens = normalized.split(/\s+/);
  const remaining: string[] = [];

  // First pass: try multi-word matches (e.g. "la marsa", "lac 1", "centre ville")
  const joined = tokens.join(" ");
  // Check multi-word city names (2 words)
  for (let i = 0; i < tokens.length - 1; i++) {
    const two = `${tokens[i]} ${tokens[i + 1]}`;
    if (!city && CITY_KEYWORDS.has(two)) {
      city = CITY_KEYWORDS.get(two)!;
      tokens[i] = "";
      tokens[i + 1] = "";
    }
  }

  // Second pass: single-word matches
  for (const token of tokens) {
    if (!token) continue;
    if (!specialty && SPECIALTY_KEYWORDS.has(token)) {
      specialty = SPECIALTY_KEYWORDS.get(token)!;
      continue;
    }
    if (!city && CITY_KEYWORDS.has(token)) {
      city = CITY_KEYWORDS.get(token)!;
      continue;
    }
    remaining.push(token);
  }

  return {
    specialty,
    city,
    rest: remaining.join(" ").trim(),
  };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const explicitSpecialty = searchParams.get("specialty");
  const explicitCity = searchParams.get("city");

  // Parse the query to extract implicit filters
  const parsed = parseQuery(q);

  // Explicit filters always win over parsed ones
  const specialty = explicitSpecialty || parsed.specialty;
  const city = explicitCity || parsed.city;
  const searchText = parsed.rest || (specialty || city ? "" : q);

  // Build Meilisearch filters
  const filters: string[] = [];
  if (specialty) filters.push(`specialty = "${specialty}"`);
  if (city) filters.push(`city = "${city}"`);

  const index = meili.index(DOCTORS_INDEX);

  // First attempt: strict AND matching
  let results = await index.search(searchText, {
    filter: filters.length > 0 ? filters.join(" AND ") : undefined,
    limit: 20,
    matchingStrategy: "last", // Fallback: drop trailing words if no match
  });

  // Fallback: if AND search returns nothing, try OR with just the raw query
  if (results.hits.length === 0 && q && (specialty || city)) {
    results = await index.search(q, {
      limit: 20,
      matchingStrategy: "last",
    });
  }

  // Second fallback: if still nothing, retry with original q and no filters
  if (results.hits.length === 0 && q) {
    results = await index.search(q, {
      limit: 20,
      matchingStrategy: "last",
    });
  }

  return NextResponse.json({
    ...results,
    // Expose parsed filters so UI can show them as chips
    parsed: {
      specialty: specialty ?? null,
      city: city ?? null,
      text: searchText,
    },
  });
}
