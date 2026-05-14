import { NextRequest, NextResponse } from "next/server";
import { db, labs } from "@doktori/db";
import { eq } from "drizzle-orm";

// Public endpoint — returns verified labs for the doctor's lab-order form.
export async function GET(_req: NextRequest) {
  const rows = await db
    .select({
      id: labs.id,
      name: labs.name,
      city: labs.city,
      services: labs.services,
    })
    .from(labs)
    .where(eq(labs.verificationStatus, "verified"))
    .orderBy(labs.name);

  return NextResponse.json({ labs: rows });
}
