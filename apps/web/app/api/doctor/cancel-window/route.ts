import { NextRequest, NextResponse } from "next/server";
import { db, doctors } from "@doktori/db";
import { eq } from "drizzle-orm";
import { requireDoctor } from "@/lib/doctor-auth";

// GET  → current patient-cancellation window (hours).
// PATCH → set it. 0 = patients may cancel up to the start time. Cap at 168h
// (one week) so doctors don't lock down cancellations effectively forever
// by mistake.
const MAX_HOURS = 168;

export async function GET(req: NextRequest) {
  const doctor = await requireDoctor(req);
  if (doctor instanceof NextResponse) return doctor;
  const [row] = await db
    .select({ hours: doctors.patientCancelWindowHours })
    .from(doctors)
    .where(eq(doctors.id, doctor.id))
    .limit(1);
  return NextResponse.json({ hours: row?.hours ?? 2 });
}

export async function PATCH(req: NextRequest) {
  const doctor = await requireDoctor(req);
  if (doctor instanceof NextResponse) return doctor;
  let body: { hours?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }
  const n = Number(body.hours);
  if (!Number.isFinite(n) || n < 0 || n > MAX_HOURS || !Number.isInteger(n)) {
    return NextResponse.json(
      { error: `hours doit être un entier entre 0 et ${MAX_HOURS}` },
      { status: 400 },
    );
  }
  await db
    .update(doctors)
    .set({ patientCancelWindowHours: n })
    .where(eq(doctors.id, doctor.id));
  return NextResponse.json({ hours: n });
}
