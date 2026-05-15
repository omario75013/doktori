import { NextRequest, NextResponse } from "next/server";
import { db, labs, clinicDoctors } from "@doktori/db";
import { eq, isNull, and, isNotNull, inArray } from "drizzle-orm";
import { requireAuth } from "@/lib/require-auth";

// Public endpoint — returns verified labs for the doctor's lab-order form.
//
// Query params:
//   ?priorityClinicId=<uuid>  → explicit clinic scope (returns { inHouse, external })
//   ?segment=true             → auto-detect doctor's clinics (returns { inHouse, external })
//   (none)                    → flat { labs: [...] } for backward compat
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const priorityClinicId = searchParams.get("priorityClinicId");
  const segment = searchParams.get("segment") === "true";

  const fields = {
    id: labs.id,
    name: labs.name,
    city: labs.city,
    services: labs.services,
    kind: labs.kind,
    clinicId: labs.clinicId,
  } as const;

  // Auto-segment: detect the calling doctor's clinic memberships
  if (segment && !priorityClinicId) {
    const user = await requireAuth(req);
    if (user?.role === "doctor") {
      const memberships = await db
        .select({ clinicId: clinicDoctors.clinicId })
        .from(clinicDoctors)
        .where(eq(clinicDoctors.doctorId, user.id));

      const clinicIds = memberships.map((m) => m.clinicId);

      if (clinicIds.length > 0) {
        const [inHouseRows, externalRows] = await Promise.all([
          db
            .select(fields)
            .from(labs)
            .where(
              and(
                eq(labs.verificationStatus, "verified"),
                isNotNull(labs.clinicId),
                inArray(labs.clinicId, clinicIds),
              )
            )
            .orderBy(labs.name),
          db
            .select(fields)
            .from(labs)
            .where(
              and(
                eq(labs.verificationStatus, "verified"),
                isNull(labs.clinicId),
              )
            )
            .orderBy(labs.name),
        ]);

        return NextResponse.json({ inHouse: inHouseRows, external: externalRows });
      }
    }
    // Fall through to flat list if not a clinic doctor
  }

  if (priorityClinicId) {
    // Return segmented response by explicit clinic
    const [inHouseRows, externalRows] = await Promise.all([
      db
        .select(fields)
        .from(labs)
        .where(
          and(
            eq(labs.verificationStatus, "verified"),
            isNotNull(labs.clinicId),
            eq(labs.clinicId, priorityClinicId),
          )
        )
        .orderBy(labs.name),
      db
        .select(fields)
        .from(labs)
        .where(
          and(
            eq(labs.verificationStatus, "verified"),
            isNull(labs.clinicId),
          )
        )
        .orderBy(labs.name),
    ]);

    return NextResponse.json({ inHouse: inHouseRows, external: externalRows });
  }

  // Backward-compatible flat list
  const rows = await db
    .select(fields)
    .from(labs)
    .where(eq(labs.verificationStatus, "verified"))
    .orderBy(labs.name);

  return NextResponse.json({ labs: rows });
}
