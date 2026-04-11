/**
 * One-shot backfill: geocode any doctor with null latitude/longitude using
 * Nominatim (OSM). Run with:
 *
 *   DATABASE_URL=postgresql://... pnpm --filter @doktori/db exec tsx src/geocode-doctors.ts
 *
 * Rate-limited to 1 request/second to respect Nominatim usage policy.
 * After running, re-trigger the Meili sync so the new coordinates make it
 * into the search index.
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { and, eq, isNull, or } from "drizzle-orm";
import { doctors } from "./schema";

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://doktori:doktori_dev@localhost:5433/doktori";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "Doktori/1.0 (+https://doktori.tn; contact@doktori.tn)";

async function geocode(address: string): Promise<{ lat: number; lng: number } | null> {
  const params = new URLSearchParams({
    q: address,
    format: "json",
    limit: "1",
    countrycodes: "tn",
  });
  try {
    const res = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
      headers: { "User-Agent": USER_AGENT, "Accept-Language": "fr,ar" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{ lat: string; lon: string }>;
    if (!data.length) return null;
    return { lat: Number(data[0].lat), lng: Number(data[0].lon) };
  } catch {
    return null;
  }
}

async function main() {
  const client = postgres(DATABASE_URL);
  const db = drizzle(client);

  const pending = await db
    .select({
      id: doctors.id,
      name: doctors.name,
      address: doctors.address,
      city: doctors.city,
    })
    .from(doctors)
    .where(
      and(
        eq(doctors.isActive, true),
        or(isNull(doctors.latitude), isNull(doctors.longitude)),
      ),
    );

  console.log(`Found ${pending.length} doctor(s) needing geocoding.`);

  let ok = 0;
  let fail = 0;

  for (const d of pending) {
    const query = `${d.address}, ${d.city}, Tunisie`;
    process.stdout.write(`  ${d.name} — ${query} ... `);
    const geo = await geocode(query);
    if (geo) {
      await db
        .update(doctors)
        .set({ latitude: String(geo.lat), longitude: String(geo.lng) })
        .where(eq(doctors.id, d.id));
      console.log(`OK (${geo.lat.toFixed(4)}, ${geo.lng.toFixed(4)})`);
      ok++;
    } else {
      console.log("no match");
      fail++;
    }
    // Nominatim TOS: max 1 req/sec
    await new Promise((r) => setTimeout(r, 1100));
  }

  console.log(`\nDone. ${ok} geocoded, ${fail} unresolved.`);
  console.log("Next step: re-run the Meili sync so new coordinates land in the index.");
  await client.end();
}

main().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
