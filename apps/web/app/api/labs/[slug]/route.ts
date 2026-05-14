import { NextResponse } from "next/server";
import { db, labs } from "@doktori/db";
import { and, eq } from "drizzle-orm";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const [lab] = await db
    .select({
      id: labs.id,
      name: labs.name,
      slug: labs.slug,
      address: labs.address,
      city: labs.city,
      phone: labs.phone,
      email: labs.email,
      logoUrl: labs.logoUrl,
      services: labs.services,
      accreditations: labs.accreditations,
      openingHours: labs.openingHours,
    })
    .from(labs)
    .where(and(eq(labs.slug, slug), eq(labs.verificationStatus, "verified")))
    .limit(1);

  if (!lab) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ lab });
}
