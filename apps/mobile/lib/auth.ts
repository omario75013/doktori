import * as SecureStore from "expo-secure-store";

const JWT_KEY = "jwt";
const PATIENT_KEY = "patient";

export type Patient = { id: string; phone: string; name?: string };

export async function getToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(JWT_KEY);
  } catch {
    return null;
  }
}

export async function setToken(token: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(JWT_KEY, token);
  } catch (e) {
    console.warn("[auth] setToken failed:", e);
  }
}

export async function getPatient(): Promise<Patient | null> {
  try {
    const raw = await SecureStore.getItemAsync(PATIENT_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function setPatient(patient: Patient): Promise<void> {
  try {
    await SecureStore.setItemAsync(PATIENT_KEY, JSON.stringify(patient));
  } catch (e) {
    console.warn("[auth] setPatient failed:", e);
  }
}

export async function logout(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(JWT_KEY);
    await SecureStore.deleteItemAsync(PATIENT_KEY);
  } catch {}
}

// Base64 decode that works in React Native (no atob)
function decodeBase64(str: string): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  let output = "";
  let i = 0;
  const input = str.replace(/[^A-Za-z0-9+/=]/g, "");
  while (i < input.length) {
    const a = chars.indexOf(input.charAt(i++));
    const b = chars.indexOf(input.charAt(i++));
    const c = chars.indexOf(input.charAt(i++));
    const d = chars.indexOf(input.charAt(i++));
    const bits = (a << 18) | (b << 12) | (c << 6) | d;
    output += String.fromCharCode((bits >> 16) & 0xff);
    if (c !== 64) output += String.fromCharCode((bits >> 8) & 0xff);
    if (d !== 64) output += String.fromCharCode(bits & 0xff);
  }
  return output;
}

export function isTokenValid(token: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    // Add padding if needed
    let payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    while (payload.length % 4) payload += "=";
    const decoded = decodeBase64(payload);
    const data = JSON.parse(decoded);
    return data.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}
