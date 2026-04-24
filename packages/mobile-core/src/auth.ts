import { api } from "./api";
import { getStoredToken, setStoredToken, clearStoredToken } from "./auth-storage";
import type { AuthUser, AuthState } from "./types";

type StaffLoginBody = { email: string; password: string; role: "doctor" | "secretary" };
type PatientLoginBody = { phone: string; password: string };

type LoginResponse = { token: string; user: AuthUser };

export async function loginStaff(body: StaffLoginBody): Promise<LoginResponse> {
  const res = await api<LoginResponse>("/api/auth/staff-login", {
    method: "POST",
    body,
    skipAuth: true,
  });
  await setStoredToken(res.token);
  return res;
}

export async function loginPatient(body: PatientLoginBody): Promise<LoginResponse> {
  // Backend endpoint TBD — patient-login mirrors staff-login shape.
  // For now, patients authenticate via the same OTP/SMS flow used on web;
  // this function will be wired once `/api/auth/patient-login` exists server-side.
  const res = await api<LoginResponse>("/api/auth/patient-login", {
    method: "POST",
    body,
    skipAuth: true,
  });
  await setStoredToken(res.token);
  return res;
}

export async function logout(): Promise<void> {
  // Best-effort: tell the server to invalidate the push token for this device,
  // then clear local storage. Even if the request fails, the local token is gone.
  try {
    await api("/api/push-tokens", {
      method: "DELETE",
      body: { token: await getCurrentPushToken() },
    });
  } catch {
    /* ignore */
  }
  await clearStoredToken();
}

async function getCurrentPushToken(): Promise<string | null> {
  // Resolved at runtime by the patient/staff app that holds the Expo push token.
  // Shared globalThis slot keeps this module React-free.
  return (
    (globalThis as unknown as { __DOKTORI_PUSH_TOKEN__?: string }).__DOKTORI_PUSH_TOKEN__ ?? null
  );
}

export async function restoreSession(): Promise<AuthState> {
  const token = await getStoredToken();
  if (!token) return { status: "unauthenticated" };
  try {
    const user = await api<AuthUser>("/api/doctor/me", { token });
    return { status: "authenticated", user, token };
  } catch {
    await clearStoredToken();
    return { status: "unauthenticated" };
  }
}

export { getStoredToken, setStoredToken, clearStoredToken };
