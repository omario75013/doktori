import { db, platformSettings } from "@doktori/db";
import { eq } from "drizzle-orm";

const cache = new Map<string, { value: string; expiresAt: number }>();
const TTL = 60_000; // 60s cache

export async function getSetting(key: string): Promise<string | null> {
  const cached = cache.get(key);
  if (cached && Date.now() < cached.expiresAt) return cached.value;

  const [row] = await db
    .select({ value: platformSettings.value })
    .from(platformSettings)
    .where(eq(platformSettings.key, key))
    .limit(1);

  if (!row) return null;
  cache.set(key, { value: row.value, expiresAt: Date.now() + TTL });
  return row.value;
}

export async function getSettingOrDefault(key: string, defaultValue: string): Promise<string> {
  return (await getSetting(key)) ?? defaultValue;
}

export function invalidateSettingsCache(): void {
  cache.clear();
}
