import { NextResponse } from "next/server";
import { db, clinics } from "@doktori/db";
import { eq } from "drizzle-orm";
import { requireClinic } from "@/lib/clinic-auth";

export async function GET() {
  const clinic = await requireClinic();
  if (clinic instanceof NextResponse) return clinic;

  const [row] = await db
    .select({
      id: clinics.id,
      name: clinics.name,
      slug: clinics.slug,
      address: clinics.address,
      city: clinics.city,
      phone: clinics.phone,
      email: clinics.email,
      logoUrl: clinics.logoUrl,
      plan: clinics.plan,
    })
    .from(clinics)
    .where(eq(clinics.id, clinic.id))
    .limit(1);

  if (!row) {
    return NextResponse.json({ error: "Clinique introuvable" }, { status: 404 });
  }

  return NextResponse.json(row);
}

export async function PUT(req: Request) {
  const clinic = await requireClinic();
  if (clinic instanceof NextResponse) return clinic;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const { name, address, city, phone, logoUrl } = body as {
    name?: string;
    address?: string;
    city?: string;
    phone?: string;
    logoUrl?: string;
  };

  const updates: Partial<{
    name: string;
    address: string;
    city: string;
    phone: string;
    logoUrl: string;
  }> = {};
  if (name !== undefined) updates.name = name.trim();
  if (address !== undefined) updates.address = address.trim();
  if (city !== undefined) updates.city = city.trim();
  if (phone !== undefined) updates.phone = phone.trim();
  if (logoUrl !== undefined) updates.logoUrl = logoUrl.trim();

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Aucune modification fournie" }, { status: 400 });
  }

  await db.update(clinics).set(updates).where(eq(clinics.id, clinic.id));

  return NextResponse.json({ success: true });
}
