import { NextResponse } from "next/server";
import { meili, DOCTORS_INDEX } from "@/lib/meilisearch";
import { SPECIALTIES, CITIES } from "@doktori/shared";
import { db, doctorSchedules, appointments, doctors } from "@doktori/db";
import { eq, and, gte, lte, not, inArray, sql } from "drizzle-orm";

// ─────────────────────────────── UTILITIES ────────────────────────────────────

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

// City centroids for geo-sorting fallback
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

// ─────────────────────────── QUERY PARSER ─────────────────────────────────────

const SPECIALTY_KEYWORDS = new Map<string, string>();
for (const spec of SPECIALTIES) {
  SPECIALTY_KEYWORDS.set(normalize(spec.id), spec.id);
  SPECIALTY_KEYWORDS.set(normalize(spec.label), spec.id);
}
const SPECIALTY_ALIASES: Record<string, string> = {
  dermato: "dermatologue",
  dermatologie: "dermatologue",
  ophtalmo: "ophtalmologue",
  ophtalmologie: "ophtalmologue",
  gyneco: "gynecologue",
  gynecologie: "gynecologue",
  pediatrie: "pediatre",
  cardio: "cardiologue",
  cardiologie: "cardiologue",
  ortho: "orthopediste",
  orthopedie: "orthopediste",
  gastro: "gastrologue",
  mg: "generaliste",
  medecin: "generaliste",
  toubib: "generaliste",
  tbib: "generaliste",
  orl: "orl",
  dentaire: "dentiste",
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
  lac1: "lac-1",
  "lac 2": "lac-2",
  lac2: "lac-2",
  centre: "tunis",
  centreville: "tunis",
  "centre ville": "tunis",
};
for (const [k, v] of Object.entries(CITY_ALIASES)) {
  CITY_KEYWORDS.set(normalize(k), v);
}

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

  // Multi-word city matches first
  for (let i = 0; i < tokens.length - 1; i++) {
    const two = `${tokens[i]} ${tokens[i + 1]}`;
    if (!city && CITY_KEYWORDS.has(two)) {
      city = CITY_KEYWORDS.get(two)!;
      tokens[i] = "";
      tokens[i + 1] = "";
    }
  }

  const remaining: string[] = [];
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

  return { specialty, city, rest: remaining.join(" ").trim() };
}

// ─────────────────────── AVAILABILITY CHECK ───────────────────────────────────

/**
 * For a given date, return the set of doctor IDs that have at least 1
 * available slot (based on their schedule and existing non-cancelled appointments).
 */
async function getAvailableDoctorIds(date: string): Promise<Set<string>> {
  const targetDate = new Date(`${date}T00:00:00`);
  if (isNaN(targetDate.getTime())) return new Set();

  const dayOfWeek = targetDate.getDay();
  const dayStart = new Date(targetDate);
  const dayEnd = new Date(targetDate);
  dayEnd.setDate(dayEnd.getDate() + 1);

  // Doctors with any schedule row for this day of week
  const schedules = await db
    .select({
      doctorId: doctorSchedules.doctorId,
      startTime: doctorSchedules.startTime,
      endTime: doctorSchedules.endTime,
      slotDuration: doctorSchedules.slotDuration,
    })
    .from(doctorSchedules)
    .where(
      and(
        eq(doctorSchedules.dayOfWeek, dayOfWeek),
        eq(doctorSchedules.isActive, true)
      )
    );

  if (schedules.length === 0) return new Set();

  // Aggregate total working minutes per doctor and track slot duration
  const workMinutesByDoctor = new Map<string, number>();
  const slotDurationByDoctor = new Map<string, number>();
  for (const s of schedules) {
    const [sh, sm] = s.startTime.split(":").map(Number);
    const [eh, em] = s.endTime.split(":").map(Number);
    const minutes = eh * 60 + em - (sh * 60 + sm);
    workMinutesByDoctor.set(
      s.doctorId,
      (workMinutesByDoctor.get(s.doctorId) || 0) + minutes
    );
    // Use the first schedule row's slotDuration for this doctor
    if (!slotDurationByDoctor.has(s.doctorId)) {
      slotDurationByDoctor.set(s.doctorId, s.slotDuration);
    }
  }

  // Booked appointments on that day (non-cancelled)
  const booked = await db
    .select({ doctorId: appointments.doctorId })
    .from(appointments)
    .where(
      and(
        gte(appointments.startsAt, dayStart),
        lte(appointments.startsAt, dayEnd),
        not(inArray(appointments.status, ["cancelled", "no_show"]))
      )
    );

  // Count bookings per doctor
  const bookingsByDoctor = new Map<string, number>();
  for (const b of booked) {
    bookingsByDoctor.set(
      b.doctorId,
      (bookingsByDoctor.get(b.doctorId) || 0) + 1
    );
  }

  // Return doctors with available time left
  // (working minutes / doctor's actual slotDuration) > bookings
  const available = new Set<string>();
  for (const [doctorId, minutes] of workMinutesByDoctor) {
    const slotDuration = slotDurationByDoctor.get(doctorId) ?? 20;
    const maxSlots = Math.floor(minutes / slotDuration);
    const used = bookingsByDoctor.get(doctorId) || 0;
    if (used < maxSlots) available.add(doctorId);
  }

  return available;
}

// ─────────────────────────── MAIN HANDLER ─────────────────────────────────────

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const explicitSpecialty = searchParams.get("specialty") || "";
  const explicitCity = searchParams.get("city") || "";
  const date = searchParams.get("date") || "";
  // Patient's actual GPS coordinates (browser geolocation)
  const userLat = searchParams.get("lat");
  const userLng = searchParams.get("lng");
  // Enriched filters
  const sort = searchParams.get("sort") || ""; // proximity | price_asc | price_desc | name
  const priceMin = searchParams.get("priceMin");
  const priceMax = searchParams.get("priceMax");
  const minRating = searchParams.get("minRating");
  const availabilityWindow = searchParams.get("availability") || ""; // today | tomorrow | week
  const mode = searchParams.get("mode") || ""; // teleconsult

  const parsed = parseQuery(q);

  // Explicit filters win over parsed
  const specialty = explicitSpecialty || parsed.specialty || null;
  const city = explicitCity || parsed.city || null;
  const searchText = parsed.rest || (specialty || city ? "" : q);

  const index = meili.index(DOCTORS_INDEX);

  // Build filters — specialty/city + optional price range
  const buildFilters = (useCity: boolean) => {
    const f: string[] = [];
    if (specialty) f.push(`specialty = "${specialty}"`);
    if (useCity && city) f.push(`city = "${city}"`);
    if (priceMin) {
      const millimes = Number(priceMin) * 1000;
      if (!isNaN(millimes)) f.push(`consultationFee >= ${millimes}`);
    }
    if (priceMax) {
      const millimes = Number(priceMax) * 1000;
      if (!isNaN(millimes)) f.push(`consultationFee <= ${millimes}`);
    }
    return f.length > 0 ? f.join(" AND ") : undefined;
  };

  // Geo-sort priority: user GPS > detected city centroid
  let sortOrigin: { lat: number; lng: number } | null = null;
  if (userLat && userLng) {
    const lat = parseFloat(userLat);
    const lng = parseFloat(userLng);
    if (!isNaN(lat) && !isNaN(lng)) {
      sortOrigin = { lat, lng };
    }
  }
  if (!sortOrigin && city) {
    sortOrigin = CITY_CENTROIDS[city] || null;
  }

  // Build sort array based on user choice
  let sortArray: string[] | undefined;
  if (sort === "price_asc") {
    sortArray = ["consultationFee:asc"];
  } else if (sort === "price_desc") {
    sortArray = ["consultationFee:desc"];
  } else if (sort === "name") {
    sortArray = ["name:asc"];
  } else if (sortOrigin) {
    // Default: proximity if we have a location
    sortArray = [`_geoPoint(${sortOrigin.lat}, ${sortOrigin.lng}):asc`];
  }

  // ═══ TIER 1: Strict match (specialty + city) + facet counts ═══
  const tier1 = await index.search(searchText, {
    filter: buildFilters(true),
    sort: sortArray,
    limit: 50,
    matchingStrategy: "last",
    facets: ["specialty", "city"],
  });

  const facetDistribution = tier1.facetDistribution || {};

  let hits = [...tier1.hits];
  let expanded = false;

  // ═══ TIER 2: Same specialty, nearby cities (if <3 results in tier 1) ═══
  if (specialty && city && hits.length < 3) {
    const tier2 = await index.search(searchText, {
      filter: buildFilters(false),
      sort: sortArray,
      limit: 50,
      matchingStrategy: "last",
    });
    const existingIds = new Set(hits.map((h) => (h as { id: string }).id));
    const extra = tier2.hits.filter((h) => !existingIds.has((h as { id: string }).id));
    hits = [...hits, ...extra];
    expanded = true;
  }

  // ═══ TIER 3: If still empty, broad fallback ═══
  if (hits.length === 0 && q) {
    const tier3 = await index.search(q, {
      limit: 50,
      matchingStrategy: "last",
    });
    hits = tier3.hits;
  }

  // ═══ DATE-AWARE AVAILABILITY FILTER ═══
  if (date) {
    const availableIds = await getAvailableDoctorIds(date);
    hits = hits.filter((h) => availableIds.has((h as { id: string }).id));
  }

  // Availability window (today / tomorrow / this week)
  if (availabilityWindow === "today") {
    const today = new Date().toISOString().slice(0, 10);
    const ids = await getAvailableDoctorIds(today);
    hits = hits.filter((h) => ids.has((h as { id: string }).id));
  } else if (availabilityWindow === "tomorrow") {
    const tmr = new Date();
    tmr.setDate(tmr.getDate() + 1);
    const ids = await getAvailableDoctorIds(tmr.toISOString().slice(0, 10));
    hits = hits.filter((h) => ids.has((h as { id: string }).id));
  } else if (availabilityWindow === "week") {
    const idSets = await Promise.all(
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() + i);
        return getAvailableDoctorIds(d.toISOString().slice(0, 10));
      })
    );
    const union = new Set<string>();
    for (const s of idSets) for (const id of s) union.add(id);
    hits = hits.filter((h) => union.has((h as { id: string }).id));
  }

  // Teleconsult mode filter — DB cross-check since Meilisearch may not have this attribute yet
  if (mode === "teleconsult" && hits.length > 0) {
    const ids = hits.map((h) => (h as { id: string }).id);
    const teleconsultRows = await db
      .select({ id: doctors.id })
      .from(doctors)
      .where(
        and(
          inArray(doctors.id, ids),
          sql`${doctors.consultationMode} IN ('teleconsult', 'both')`
        )
      );
    const teleconsultIds = new Set(teleconsultRows.map((d) => d.id));
    hits = hits.filter((h) => teleconsultIds.has((h as { id: string }).id));
  }

  // TODO: minRating filter removed — real per-doctor ratings not yet stored per doctor.
  // Re-enable once doctor.avgRating is populated.

  // Final limit 20
  const totalBeforeLimit = hits.length;
  hits = hits.slice(0, 20);

  return NextResponse.json({
    hits,
    totalCount: totalBeforeLimit,
    parsed: { specialty, city, text: searchText },
    expanded,
    facets: {
      specialty: facetDistribution.specialty || {},
      city: facetDistribution.city || {},
    },
    activeFilters: {
      specialty,
      city,
      date: date || null,
      priceMin: priceMin ? Number(priceMin) : null,
      priceMax: priceMax ? Number(priceMax) : null,
      availability: availabilityWindow || null,
      sort: sort || "relevance",
      location: sortOrigin,
    },
  });
}
