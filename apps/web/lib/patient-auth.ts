import { verify } from "jsonwebtoken";
import { NextRequest } from "next/server";

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
