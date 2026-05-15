import { NextResponse, NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/require-auth";
import { db, secretaries, doctorPractices } from "@doktori/db";
import { eq, and } from "drizzle-orm";
import { hash } from "bcryptjs";
import { SECTIONS, DEFAULT_PERMISSIONS, parsePermissions } from "@/lib/secretary-permissions";

export async function GET(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user || user.role !== "doctor") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const rows = await db
    .select({
      id: secretaries.id,
      name: secretaries.name,
      email: secretaries.email,
      phone: secretaries.phone,
      isActive: secretaries.isActive,
      permissions: secretaries.permissions,
      dateOfBirth: secretaries.dateOfBirth,
      yearsOfExperience: secretaries.yearsOfExperience,
      monthlySalary: secretaries.monthlySalary,
      monthlyDayOffAllowance: secretaries.monthlyDayOffAllowance,
      hireDate: secretaries.hireDate,
      lastActiveAt: secretaries.lastActiveAt,
      createdAt: secretaries.createdAt,
    })
    .from(secretaries)
    .where(eq(secretaries.doctorId, user.id))
    .orderBy(secretaries.createdAt);

  return NextResponse.json(rows);
}

const permissionsObject = z.object(
  Object.fromEntries(SECTIONS.map((s) => [s, z.boolean()])) as Record<
    (typeof SECTIONS)[number],
    z.ZodBoolean
  >
);

const createSchema = z.object({
  name: z.string().trim().min(1).max(255),
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(200),
  phone: z.string().trim().max(30).optional().nullable(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  yearsOfExperience: z.number().int().min(0).max(70).optional().nullable(),
  monthlySalary: z.number().int().min(0).max(100_000_000).optional().nullable(),
  hireDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  monthlyDayOffAllowance: z.number().min(0).max(31).optional().nullable(),
  permissions: permissionsObject.partial().optional(),
  // Phase 3: optional cabinet scoping — must belong to this doctor
  practiceId: z.string().uuid().optional().nullable(),
});

export async function POST(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user || user.role !== "doctor") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation échouée", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const passwordHash = await hash(parsed.data.password, 12);
  const perms = { ...DEFAULT_PERMISSIONS, ...parsePermissions(parsed.data.permissions ?? {}) };

  // Phase 3: if practiceId supplied, verify it belongs to this doctor
  let resolvedPracticeId: string | null = null;
  if (parsed.data.practiceId) {
    const [practice] = await db
      .select({ id: doctorPractices.id })
      .from(doctorPractices)
      .where(
        and(
          eq(doctorPractices.id, parsed.data.practiceId),
          eq(doctorPractices.doctorId, user.id)
        )
      )
      .limit(1);
    if (!practice) {
      return NextResponse.json(
        { error: "Cabinet introuvable ou n'appartient pas à ce médecin" },
        { status: 403 }
      );
    }
    resolvedPracticeId = practice.id;
  } else {
    // Fallback: assign to the primary practice if one exists
    const [primary] = await db
      .select({ id: doctorPractices.id })
      .from(doctorPractices)
      .where(and(eq(doctorPractices.doctorId, user.id), eq(doctorPractices.isPrimary, true)))
      .limit(1);
    resolvedPracticeId = primary?.id ?? null;
  }

  try {
    const [secretary] = await db
      .insert(secretaries)
      .values({
        doctorId: user.id,
        name: parsed.data.name.trim(),
        email: parsed.data.email.toLowerCase().trim(),
        passwordHash,
        phone: parsed.data.phone ?? null,
        dateOfBirth: parsed.data.dateOfBirth ?? null,
        yearsOfExperience: parsed.data.yearsOfExperience ?? null,
        monthlySalary: parsed.data.monthlySalary ?? null,
        hireDate: parsed.data.hireDate ?? null,
        monthlyDayOffAllowance:
          parsed.data.monthlyDayOffAllowance != null
            ? String(parsed.data.monthlyDayOffAllowance)
            : null,
        permissions: perms,
        practiceId: resolvedPracticeId,
      })
      .returning({
        id: secretaries.id,
        name: secretaries.name,
        email: secretaries.email,
        phone: secretaries.phone,
        isActive: secretaries.isActive,
        permissions: secretaries.permissions,
        dateOfBirth: secretaries.dateOfBirth,
        yearsOfExperience: secretaries.yearsOfExperience,
        monthlySalary: secretaries.monthlySalary,
        hireDate: secretaries.hireDate,
        lastActiveAt: secretaries.lastActiveAt,
        createdAt: secretaries.createdAt,
      });

    return NextResponse.json(secretary, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("secretaries_email_idx")) {
      return NextResponse.json({ error: "Cet email est déjà utilisé" }, { status: 409 });
    }
    console.error("[POST /api/secretaries]", e);
    return NextResponse.json({ error: "Erreur lors de la création" }, { status: 500 });
  }
}
