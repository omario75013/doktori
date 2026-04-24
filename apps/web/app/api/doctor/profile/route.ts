import { NextResponse, NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/require-auth";
import { db, doctors } from "@doktori/db";
import { eq } from "drizzle-orm";

const patchSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  bio: z.string().max(1000).optional(),
  consultationFee: z.number().int().min(0).optional(),
  teleconsultFee: z.number().int().min(0).optional(),
  consultationMode: z.enum(["cabinet", "teleconsult", "both", "home"]).optional(),
  languages: z.array(z.string()).optional(),
  expertise: z.array(z.string()).optional(),
  yearsOfExperience: z.number().int().min(0).max(60).nullable().optional(),
});

export async function PATCH(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user || user.role !== "doctor") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides", details: parsed.error.flatten() }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) update.name = parsed.data.name;
  if (parsed.data.bio !== undefined) update.bio = parsed.data.bio || null;
  if (parsed.data.consultationFee !== undefined) update.consultationFee = parsed.data.consultationFee;
  if (parsed.data.teleconsultFee !== undefined) update.teleconsultFee = parsed.data.teleconsultFee;
  if (parsed.data.consultationMode !== undefined) update.consultationMode = parsed.data.consultationMode;
  if (parsed.data.languages !== undefined) update.languages = parsed.data.languages;
  if (parsed.data.expertise !== undefined) update.expertise = parsed.data.expertise;
  if (parsed.data.yearsOfExperience !== undefined) update.yearsOfExperience = parsed.data.yearsOfExperience;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ ok: true, message: "Rien à mettre à jour" });
  }

  const [updated] = await db
    .update(doctors)
    .set(update)
    .where(eq(doctors.id, user.id))
    .returning({
      id: doctors.id,
      name: doctors.name,
      bio: doctors.bio,
      consultationFee: doctors.consultationFee,
      teleconsultFee: doctors.teleconsultFee,
      consultationMode: doctors.consultationMode,
      languages: doctors.languages,
      expertise: doctors.expertise,
      yearsOfExperience: doctors.yearsOfExperience,
    });

  return NextResponse.json({ ok: true, doctor: updated });
}

export async function GET(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user || user.role !== "doctor") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const [doctor] = await db
    .select({
      id: doctors.id,
      name: doctors.name,
      email: doctors.email,
      bio: doctors.bio,
      consultationFee: doctors.consultationFee,
      teleconsultFee: doctors.teleconsultFee,
      consultationMode: doctors.consultationMode,
      languages: doctors.languages,
      expertise: doctors.expertise,
      yearsOfExperience: doctors.yearsOfExperience,
      specialty: doctors.specialty,
      city: doctors.city,
    })
    .from(doctors)
    .where(eq(doctors.id, user.id))
    .limit(1);

  if (!doctor) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json(doctor);
}
