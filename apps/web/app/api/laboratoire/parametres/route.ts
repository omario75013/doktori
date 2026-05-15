import { NextRequest, NextResponse } from "next/server";
import { db, labs } from "@doktori/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/require-auth";
import { z } from "zod";

const patchSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(50).optional(),
  phone: z.string().max(20).optional(),
  services: z.array(z.string()).optional(),
  accreditations: z.array(z.string()).optional(),
});

// GET — return current lab profile
export async function GET(req: NextRequest) {
  const user = await requireAuth(req);
  const role = (user as { role?: string } | undefined)?.role;
  if (!user || (role !== "lab" && role !== "lab_user")) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const labId = role === "lab_user"
    ? (user as { labId?: string }).labId!
    : user.id;

  const rows = await db.select().from(labs).where(eq(labs.id, labId));
  const lab = rows[0];
  if (!lab) {
    return NextResponse.json({ error: "Laboratoire introuvable" }, { status: 404 });
  }

  // Don't expose passwordHash
  const { passwordHash: _, ...safe } = lab;
  return NextResponse.json(safe);
}

// PATCH — update lab profile fields
export async function PATCH(req: NextRequest) {
  const user = await requireAuth(req);
  const role = (user as { role?: string } | undefined)?.role;
  if (!user || (role !== "lab" && role !== "lab_user")) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  if (role === "lab_user") {
    const labUserRole = (user as { labUserRole?: string }).labUserRole;
    if (labUserRole !== "admin") {
      return NextResponse.json({ error: "Réservé aux administrateurs du laboratoire" }, { status: 403 });
    }
  }
  const labId = role === "lab_user"
    ? (user as { labId?: string }).labId!
    : user.id;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", issues: parsed.error.issues },
      { status: 422 }
    );
  }

  const data = parsed.data;

  const updated = await db
    .update(labs)
    .set({
      ...(data.name !== undefined && { name: data.name }),
      ...(data.address !== undefined && { address: data.address }),
      ...(data.city !== undefined && { city: data.city }),
      ...(data.phone !== undefined && { phone: data.phone }),
      ...(data.services !== undefined && { services: data.services }),
      ...(data.accreditations !== undefined && { accreditations: data.accreditations }),
    })
    .where(eq(labs.id, labId))
    .returning();

  const lab = updated[0];
  if (!lab) {
    return NextResponse.json({ error: "Laboratoire introuvable" }, { status: 404 });
  }

  const { passwordHash: _, ...safe } = lab;
  return NextResponse.json(safe);
}
