import { verify } from "jsonwebtoken";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const PATIENT_COOKIE_NAME = "doktori_patient";
const SEVEN_DAYS_SEC = 60 * 60 * 24 * 7;

interface PatientPayload {
  id: string;
  phone: string;
  role: "patient";
}

function verifyToken(token: string): PatientPayload | null {
  try {
    const payload = verify(token, process.env.NEXTAUTH_SECRET!) as PatientPayload;
    if (payload.role !== "patient") return null;
    return payload;
  } catch {
    return null;
  }
}

/**
 * Read patient identity from the request. Prefers httpOnly cookie
 * (the safer storage); falls back to `Authorization: Bearer …` for
 * existing clients still using localStorage tokens.
 */
export function getPatientFromRequest(req: NextRequest): PatientPayload | null {
  const cookieToken = req.cookies.get(PATIENT_COOKIE_NAME)?.value;
  if (cookieToken) {
    const payload = verifyToken(cookieToken);
    if (payload) return payload;
  }
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return verifyToken(authHeader.slice(7));
  }
  return null;
}

export function requirePatientAuth(req: NextRequest): PatientPayload | NextResponse {
  const patient = getPatientFromRequest(req);
  if (!patient) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  return patient;
}

/**
 * Server-side helper for layouts/pages (uses next/headers cookies()).
 * Returns the verified patient payload or null.
 */
export async function getPatientFromCookies(): Promise<PatientPayload | null> {
  const store = await cookies();
  const token = store.get(PATIENT_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

/**
 * Attach a httpOnly patient session cookie to a NextResponse.
 * Call from any login/registration route after generating the JWT.
 */
export function setPatientCookie(res: NextResponse, token: string): NextResponse {
  res.cookies.set({
    name: PATIENT_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SEVEN_DAYS_SEC,
  });
  return res;
}

export function clearPatientCookie(res: NextResponse): NextResponse {
  res.cookies.set({
    name: PATIENT_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}
