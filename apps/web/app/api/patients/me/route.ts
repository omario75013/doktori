import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { db, patients } from "@doktori/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getPatientFromRequest, setPatientCookie, PATIENT_COOKIE_NAME } from "@/lib/patient-auth";

export async function GET(req: NextRequest) {
  const payload = getPatientFromRequest(req);
  if (!payload) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const [row] = await db
    .select({
      id: patients.id,
      name: patients.name,
      phone: patients.phone,
      email: patients.email,
      dateOfBirth: patients.dateOfBirth,
      gender: patients.gender,
      bloodType: patients.bloodType,
      cin: patients.cin,
      nationality: patients.nationality,
      cnamNumber: patients.cnamNumber,
      insuranceProvider: patients.insuranceProvider,
      insuranceNumber: patients.insuranceNumber,
      emergencyContactName: patients.emergencyContactName,
      emergencyContactPhone: patients.emergencyContactPhone,
      emergencyContactRelation: patients.emergencyContactRelation,
      heightCm: patients.heightCm,
      weightKg: patients.weightKg,
      occupation: patients.occupation,
      maritalStatus: patients.maritalStatus,
      addressStreet: patients.addressStreet,
      addressCity: patients.addressCity,
      addressPostalCode: patients.addressPostalCode,
      photoUrl: patients.photoUrl,
      cnamCardUrl: patients.cnamCardUrl,
      insuranceCardUrl: patients.insuranceCardUrl,
    })
    .from(patients)
    .where(eq(patients.id, payload.id))
    .limit(1);

  if (!row) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const res = NextResponse.json(row);
  // Auto-migrate legacy clients: if the request authenticated via Bearer header
  // (no cookie yet), promote their JWT into a httpOnly cookie so future
  // requests carry it automatically and server-side redirects work.
  if (!req.cookies.get(PATIENT_COOKIE_NAME)) {
    const auth = req.headers.get("authorization");
    if (auth?.startsWith("Bearer ")) setPatientCookie(res, auth.slice(7));
  }
  return res;
}

const patchSchema = z.object({
  name: z.string().trim().min(2).max(255).optional(),
  email: z.string().trim().email().max(255).optional().nullable(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  gender: z.enum(["M", "F"]).optional().nullable(),
  bloodType: z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]).optional().nullable(),
  cin: z.string().trim().max(20).optional().nullable(),
  nationality: z.string().trim().max(40).optional().nullable(),
  cnamNumber: z.string().trim().max(20).optional().nullable(),
  insuranceProvider: z.string().trim().max(50).optional().nullable(),
  insuranceNumber: z.string().trim().max(30).optional().nullable(),
  emergencyContactName: z.string().trim().max(120).optional().nullable(),
  emergencyContactPhone: z.string().trim().max(30).optional().nullable(),
  emergencyContactRelation: z.string().trim().max(30).optional().nullable(),
  heightCm: z.number().int().min(30).max(260).optional().nullable(),
  weightKg: z.number().min(1).max(400).optional().nullable(),
  occupation: z.string().trim().max(100).optional().nullable(),
  maritalStatus: z.enum(["single", "married", "divorced", "widowed"]).optional().nullable(),
  addressStreet: z.string().trim().max(200).optional().nullable(),
  addressCity: z.string().trim().max(80).optional().nullable(),
  addressPostalCode: z.string().trim().max(10).optional().nullable(),
}).strict();

export async function PATCH(req: NextRequest) {
  const payload = getPatientFromRequest(req);
  if (!payload) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation échouée", details: parsed.error.flatten() }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(parsed.data)) {
    if (v !== undefined) update[k] = v;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Aucune donnée à mettre à jour" }, { status: 400 });
  }

  const [updated] = await db
    .update(patients)
    .set(update)
    .where(eq(patients.id, payload.id))
    .returning({
      id: patients.id,
      name: patients.name,
      phone: patients.phone,
      email: patients.email,
      dateOfBirth: patients.dateOfBirth,
      gender: patients.gender,
      bloodType: patients.bloodType,
      cin: patients.cin,
      nationality: patients.nationality,
      cnamNumber: patients.cnamNumber,
      insuranceProvider: patients.insuranceProvider,
      insuranceNumber: patients.insuranceNumber,
      emergencyContactName: patients.emergencyContactName,
      emergencyContactPhone: patients.emergencyContactPhone,
      emergencyContactRelation: patients.emergencyContactRelation,
      heightCm: patients.heightCm,
      weightKg: patients.weightKg,
      occupation: patients.occupation,
      maritalStatus: patients.maritalStatus,
      addressStreet: patients.addressStreet,
      addressCity: patients.addressCity,
      addressPostalCode: patients.addressPostalCode,
    });

  return NextResponse.json(updated);
}
