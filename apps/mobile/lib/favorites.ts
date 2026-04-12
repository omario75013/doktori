import * as SecureStore from "expo-secure-store";

const KEY = "favorite_doctors";
const RECENT_KEY = "recent_doctors";
const MAX_RECENT = 10;

export type SavedDoctor = {
  id: string;
  name: string;
  slug: string;
  specialty: string;
  city: string;
};

async function getList(key: string): Promise<SavedDoctor[]> {
  try {
    const raw = await SecureStore.getItemAsync(key);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

async function setList(key: string, list: SavedDoctor[]) {
  try { await SecureStore.setItemAsync(key, JSON.stringify(list)); } catch {}
}

// Favorites
export async function getFavorites(): Promise<SavedDoctor[]> {
  return getList(KEY);
}

export async function toggleFavorite(doctor: SavedDoctor): Promise<boolean> {
  const list = await getList(KEY);
  const idx = list.findIndex((d) => d.id === doctor.id);
  if (idx >= 0) {
    list.splice(idx, 1);
    await setList(KEY, list);
    return false;
  } else {
    list.unshift(doctor);
    await setList(KEY, list);
    return true;
  }
}

export async function isFavorite(doctorId: string): Promise<boolean> {
  const list = await getList(KEY);
  return list.some((d) => d.id === doctorId);
}

// Recent doctors
export async function getRecentDoctors(): Promise<SavedDoctor[]> {
  return getList(RECENT_KEY);
}

export async function addRecentDoctor(doctor: SavedDoctor): Promise<void> {
  const list = await getList(RECENT_KEY);
  const filtered = list.filter((d) => d.id !== doctor.id);
  filtered.unshift(doctor);
  await setList(RECENT_KEY, filtered.slice(0, MAX_RECENT));
}
