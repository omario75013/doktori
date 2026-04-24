/**
 * Token persistence. Uses expo-secure-store when available (Keychain/Keystore),
 * falls back to in-memory for SSR / web-preview environments.
 *
 * Separated from auth.ts so api.ts can consume it without pulling in React.
 */

type Storage = {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
};

let memoryToken: string | null = null;
const memoryStorage: Storage = {
  getItemAsync: async () => memoryToken,
  setItemAsync: async (_k, v) => {
    memoryToken = v;
  },
  deleteItemAsync: async () => {
    memoryToken = null;
  },
};

// Lazy-load expo-secure-store so this file works in environments without it
let secureStore: Storage | null = null;
async function getStorage(): Promise<Storage> {
  if (secureStore) return secureStore;
  try {
    const mod = await import("expo-secure-store");
    secureStore = mod;
    return mod;
  } catch {
    return memoryStorage;
  }
}

const TOKEN_KEY = "doktori.token";

export async function getStoredToken(): Promise<string | null> {
  const storage = await getStorage();
  return storage.getItemAsync(TOKEN_KEY);
}

export async function setStoredToken(token: string): Promise<void> {
  const storage = await getStorage();
  await storage.setItemAsync(TOKEN_KEY, token);
}

export async function clearStoredToken(): Promise<void> {
  const storage = await getStorage();
  await storage.deleteItemAsync(TOKEN_KEY);
}
