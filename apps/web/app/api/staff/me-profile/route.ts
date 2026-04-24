import { NextResponse, NextRequest } from "next/server";
import { z } from "zod";
import { db, secretaries, doctors } from "@doktori/db";
import { eq } from "drizzle-orm";
import { requireStaff } from "@/lib/staff-context";

export async function GET(req: NextRequest) {
  const ctx = await requireStaff(req);
  if ("err" in ctx) return ctx.err;

  if (ctx.selfType === "secretary") {
    const [row] = await db
      .select({
        name: secretaries.name,
        phone: secretaries.phone,
        email: secretaries.email,
        bio: secretaries.bio,
        photoUrl: secretaries.photoUrl,
      })
      .from(secretaries)
      .where(eq(secretaries.id, ctx.selfId))
      .limit(1);

    if (!row) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

    return NextResponse.json({
      name: row.name,
      phone: row.phone ?? null,
      email: row.email,
      bio: row.bio ?? null,
      photoUrl: row.photoUrl ?? null,
    });
  }

  // Doctor
  const [row] = await db
    .select({
      name: doctors.name,
      phone: doctors.phone,
      email: doctors.email,
      bio: doctors.bio,
      photoUrl: doctors.photoUrl,
    })
    .from(doctors)
    .where(eq(doctors.id, ctx.selfId))
    .limit(1);

  if (!row) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  return NextResponse.json({
    name: row.name,
    phone: row.phone ?? null,
    email: row.email,
    bio: row.bio ?? null,
    photoUrl: row.photoUrl ?? null,
  });
}

const patchSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  phone: z.string().max(30).optional(),
  bio: z.string().max(1000).optional(),
});

export async function PATCH(req: NextRequest) {
  const ctx = await requireStaff(req);
  if ("err" in ctx) return ctx.err;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const { name, phone, bio } = parsed.data;

  if (ctx.selfType === "secretary") {
    const secUpdates: Partial<{
      name: string;
      phone: string | null;
      bio: string | null;
    }> = {};
    if (name !== undefined) secUpdates.name = name.trim();
    if (phone !== undefined) secUpdates.phone = phone.trim() || null;
    if (bio !== undefined) secUpdates.bio = bio.trim() || null;

    if (Object.keys(secUpdates).length > 0) {
      await db.update(secretaries).set(secUpdates).where(eq(secretaries.id, ctx.selfId));
    }
  } else {
    const docUpdates: Partial<{
      name: string;
      phone: string;
      bio: string | null;
    }> = {};
    if (name !== undefined) docUpdates.name = name.trim();
    // doctors.phone is NOT NULL — only update if a non-empty value is provided
    if (phone !== undefined && phone.trim()) docUpdates.phone = phone.trim();
    if (bio !== undefined) docUpdates.bio = bio.trim() || null;

    if (Object.keys(docUpdates).length > 0) {
      await db.update(doctors).set(docUpdates).where(eq(doctors.id, ctx.selfId));
    }
  }

  return NextResponse.json({ ok: true });
}
