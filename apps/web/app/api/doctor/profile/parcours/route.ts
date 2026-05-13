import { NextResponse, NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db, doctors } from "@doktori/db";
import { eq } from "drizzle-orm";
import { invalidateDoctor } from "@/lib/cache";
import { requireAuth } from "@/lib/require-auth";

export async function GET(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user || user.role !== "doctor") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const [doctor] = await db
    .select({
      educations: doctors.educations,
      experiences: doctors.experiences,
      languages: doctors.languages,
      expertise: doctors.expertise,
      yearsOfExperience: doctors.yearsOfExperience,
    })
    .from(doctors)
    .where(eq(doctors.id, user.id))
    .limit(1);
  if (!doctor) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json({
    educations: doctor.educations ?? [],
    experiences: doctor.experiences ?? [],
    languages: doctor.languages ?? [],
    expertise: doctor.expertise ?? [],
    yearsOfExperience: doctor.yearsOfExperience ?? null,
  });
}

type Body = {
  educations?: Array<{ degree: string; institution: string; year: number }>;
  experiences?: Array<{ role: string; place: string; startYear: number; endYear: number | null }>;
  languages?: string[];
  expertise?: string[];
  yearsOfExperience?: number | null;
};

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "doctor") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const educations = Array.isArray(body.educations)
    ? body.educations
        .filter((e) => e && typeof e.degree === "string" && typeof e.institution === "string")
        .map((e) => ({
          degree: String(e.degree).slice(0, 120),
          institution: String(e.institution).slice(0, 160),
          year: Number.isFinite(e.year) ? Math.round(Number(e.year)) : new Date().getFullYear(),
        }))
    : [];

  const experiences = Array.isArray(body.experiences)
    ? body.experiences
        .filter((e) => e && typeof e.role === "string" && typeof e.place === "string")
        .map((e) => ({
          role: String(e.role).slice(0, 120),
          place: String(e.place).slice(0, 160),
          startYear: Number.isFinite(e.startYear)
            ? Math.round(Number(e.startYear))
            : new Date().getFullYear(),
          endYear:
            e.endYear === null || e.endYear === undefined
              ? null
              : Number.isFinite(e.endYear)
                ? Math.round(Number(e.endYear))
                : null,
        }))
    : [];

  const languages = Array.isArray(body.languages)
    ? body.languages.filter((l) => typeof l === "string" && l.trim()).map((l) => l.trim().slice(0, 40))
    : [];

  const expertise = Array.isArray(body.expertise)
    ? body.expertise.filter((x) => typeof x === "string" && x.trim()).map((x) => x.trim().slice(0, 80))
    : [];

  const years =
    body.yearsOfExperience === null || body.yearsOfExperience === undefined
      ? null
      : Number.isFinite(body.yearsOfExperience)
        ? Math.max(0, Math.min(70, Math.round(Number(body.yearsOfExperience))))
        : null;

  const [updated] = await db
    .update(doctors)
    .set({
      educations,
      experiences,
      languages,
      expertise,
      yearsOfExperience: years,
      updatedAt: new Date(),
    })
    .where(eq(doctors.id, session.user.id))
    .returning({ slug: doctors.slug });

  if (updated?.slug) {
    await invalidateDoctor(session.user.id, updated.slug);
  }

  return NextResponse.json({ ok: true });
}
