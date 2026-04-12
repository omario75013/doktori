import * as SecureStore from "expo-secure-store";

const JWT_KEY = "jwt";
const PATIENT_KEY = "patient";

export type Patient = { id: string; phone: string; name?: string };

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(JWT_KEY);
}

export async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(JWT_KEY, token);
}

export async function getPatient(): Promise<Patient | null> {
  const raw = await SecureStore.getItemAsync(PATIENT_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export async function setPatient(patient: Patient): Promise<void> {
  await SecureStore.setItemAsync(PATIENT_KEY, JSON.stringify(patient));
}

export async function logout(): Promise<void> {
  await SecureStore.deleteItemAsync(JWT_KEY);
  await SecureStore.deleteItemAsync(PATIENT_KEY);
}

export function isTokenValid(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}
