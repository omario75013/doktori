import { NextResponse, NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/require-auth";
import { db, secretaries } from "@doktori/db";
import { and, eq } from "drizzle-orm";
import { SECTIONS, parsePermissions } from "@/lib/secretary-permissions";

async function requireDoctorOwnsSecretary(secretaryId: string, req?: NextRequest) {
  const user = await requireAuth(req);
  if (!user || user.role !== "doctor") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const [row] = await db
    .select({ id: secretaries.id })
    .from(secretaries)
    .where(
      and(eq(secretaries.id, secretaryId), eq(secretaries.doctorId, user.id))
    )
    .limit(1);
  if (!row) {
    return NextResponse.json({ error: "Secrétaire introuvable" }, { status: 404 });
  }
  return { doctorId: user.id };
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authz = await requireDoctorOwnsSecretary(id, _req);
    if (authz instanceof NextResponse) return authz;

    await db
      .update(secretaries)
      .set({ isActive: false })
      .where(eq(secretaries.id, id));

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[DELETE /api/secretaries/[id]]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

const permissionsObject = z.object(
  Object.fromEntries(SECTIONS.map((s) => [s, z.boolean()])) as Record<
    (typeof SECTIONS)[number],
    z.ZodBoolean
  >
);

const patchSchema = z
  .object({
    name: z.string().trim().min(1).max(255).optional(),
    phone: z.string().trim().max(30).optional().nullable(),
    dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
    yearsOfExperience: z.number().int().min(0).max(70).optional().nullable(),
    monthlySalary: z.number().int().min(0).max(100_000_000).optional().nullable(),
    hireDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
    monthlyDayOffAllowance: z.number().min(0).max(31).optional().nullable(),
    permissions: permissionsObject.partial().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "Aucun champ à mettre à jour",
  });

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authz = await requireDoctorOwnsSecretary(id, req);
    if (authz instanceof NextResponse) return authz;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
    }

    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation échouée", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const update: Record<string, unknown> = {};

    if (parsed.data.permissions) {
      const [current] = await db
        .select({ permissions: secretaries.permissions })
        .from(secretaries)
        .where(eq(secretaries.id, id))
        .limit(1);
      const merged = parsePermissions(current?.permissions);
      for (const [k, v] of Object.entries(parsed.data.permissions)) {
        if (typeof v === "boolean") (merged as Record<string, boolean>)[k] = v;
      }
      update.permissions = merged;
    }

    for (const k of ["name", "phone", "dateOfBirth", "yearsOfExperience", "monthlySalary", "hireDate"] as const) {
      if ((parsed.data as Record<string, unknown>)[k] !== undefined) {
        update[k] = (parsed.data as Record<string, unknown>)[k];
      }
    }
    if (parsed.data.monthlyDayOffAllowance !== undefined) {
      update.monthlyDayOffAllowance =
        parsed.data.monthlyDayOffAllowance != null
          ? String(parsed.data.monthlyDayOffAllowance)
          : null;
    }
    if (parsed.data.isActive !== undefined) update.isActive = parsed.data.isActive;

    await db.update(secretaries).set(update).where(eq(secretaries.id, id));

    return NextResponse.json({ success: true, ...update });
  } catch (e) {
    console.error("[PATCH /api/secretaries/[id]]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
