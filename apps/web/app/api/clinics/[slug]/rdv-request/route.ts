import { NextRequest, NextResponse } from "next/server";
import { db, clinics, clinicRdvRequests } from "@doktori/db";
import { eq } from "drizzle-orm";
import { getPatientFromCookies } from "@/lib/patient-auth";

const TIME_RANGES = ["morning", "afternoon", "evening", "any"] as const;
type TimeRange = (typeof TIME_RANGES)[number];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : null;
  const cin = typeof body.cin === "string" ? body.cin.trim() : null;
  const motif = typeof body.motif === "string" ? body.motif.trim() : null;
  const specialtyHint = typeof body.specialty === "string" ? body.specialty.trim() : null;
  const preferredDate = typeof body.preferredDate === "string" ? body.preferredDate : "";
  const preferredTimeRange = (
    typeof body.preferredTimeRange === "string" ? body.preferredTimeRange : ""
  ) as TimeRange;
  const notes = typeof body.notes === "string" ? body.notes.trim() : null;

  if (!name) return NextResponse.json({ error: "Nom requis" }, { status: 400 });
  if (!phone) return NextResponse.json({ error: "Téléphone requis" }, { status: 400 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(preferredDate)) {
    return NextResponse.json({ error: "Date invalide" }, { status: 400 });
  }
  if (!TIME_RANGES.includes(preferredTimeRange)) {
    return NextResponse.json({ error: "Plage horaire invalide" }, { status: 400 });
  }

  const [clinic] = await db
    .select({ id: clinics.id, name: clinics.name })
    .from(clinics)
    .where(eq(clinics.slug, slug))
    .limit(1);
  if (!clinic) {
    return NextResponse.json({ error: "Clinique introuvable" }, { status: 404 });
  }

  const patientSession = await getPatientFromCookies();
  const patientId = patientSession?.id ?? null;

  const [row] = await db
    .insert(clinicRdvRequests)
    .values({
      clinicId: clinic.id,
      patientId: patientId ?? undefined,
      patientName: name,
      patientPhone: phone,
      patientEmail: email ?? undefined,
      patientCin: cin ?? undefined,
      motif: motif ?? undefined,
      specialtyHint: specialtyHint ?? undefined,
      preferredDate,
      preferredTimeRange,
      notes: notes ?? undefined,
    })
    .returning({ id: clinicRdvRequests.id });

  return NextResponse.json({ id: row.id, clinicName: clinic.name }, { status: 201 });
}
