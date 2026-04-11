/**
 * Nominatim (OpenStreetMap) geocoder.
 *
 * Free, no API key. We're within TOS (low volume, ≤1 req/s, identifying UA).
 * If we ever need higher throughput or stricter SLA, swap to Mapbox / Google.
 */

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "Doktori/1.0 (+https://doktori.tn; contact@doktori.tn)";

export interface GeocodeResult {
  lat: number;
  lng: number;
  displayName: string;
}

/**
 * Geocode a free-text address. Biased to Tunisia via `countrycodes=tn`.
 * Returns null if no match (caller decides fallback).
 */
export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  const q = address.trim();
  if (!q) return null;

  const params = new URLSearchParams({
    q,
    format: "json",
    limit: "1",
    countrycodes: "tn",
    addressdetails: "0",
  });

  try {
    const res = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
      headers: { "User-Agent": USER_AGENT, "Accept-Language": "fr,ar" },
      // No Next.js cache — geocoding is one-shot per signup/backfill
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
    if (!data.length) return null;
    const { lat, lon, display_name } = data[0];
    const latNum = Number(lat);
    const lngNum = Number(lon);
    if (Number.isNaN(latNum) || Number.isNaN(lngNum)) return null;
    return { lat: latNum, lng: lngNum, displayName: display_name };
  } catch {
    return null;
  }
}
