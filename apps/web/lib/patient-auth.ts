import { verify } from "jsonwebtoken";
import { NextRequest, NextResponse } from "next/server";

interface PatientPayload {
  id: string;
  phone: string;
  role: "patient";
}

export function getPatientFromRequest(req: NextRequest): PatientPayload | null {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  try {
    const token = authHeader.slice(7);
    const payload = verify(token, process.env.NEXTAUTH_SECRET!) as PatientPayload;
    if (payload.role !== "patient") return null;
    return payload;
  } catch {
    return null;
  }
}

export function requirePatientAuth(req: NextRequest): PatientPayload | NextResponse {
  const patient = getPatientFromRequest(req);
  if (!patient) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  return patient;
}
