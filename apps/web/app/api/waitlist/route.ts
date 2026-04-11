import { NextRequest, NextResponse } from "next/server";
import { db, waitlist, patients } from "@doktori/db";
import { formatPhone } from "@doktori/shared";
import { eq, and } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { doctorId, patientName, patientPhone, preferredDate } = body;

  if (!doctorId || !patientName || !patientPhone || !preferredDate) {
    return NextResponse.json({ error: "Tous les champs sont requis" }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(preferredDate)) {
    return NextResponse.json({ error: "Date invalide" }, { status: 400 });
  }

  const phone = formatPhone(patientPhone);

  // Upsert patient
  let [patient] = await db.select().from(patients).where(eq(patients.phone, phone)).limit(1);
  if (!patient) {
    [patient] = await db.insert(patients).values({ name: patientName, phone }).returning();
  }

  // Check if already on waitlist for this day
  const [existing] = await db
    .select()
    .from(waitlist)
    .where(and(
      eq(waitlist.doctorId, doctorId),
      eq(waitlist.patientId, patient.id),
      eq(waitlist.preferredDate, preferredDate),
    ))
    .limit(1);

  if (existing) {
    return NextResponse.json({ error: "Vous êtes déjà sur la liste d'attente pour ce jour" }, { status: 409 });
  }

  const [entry] = await db
    .insert(waitlist)
    .values({ doctorId, patientId: patient.id, preferredDate })
    .returning();

  return NextResponse.json(entry, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 });

  const [deleted] = await db.delete(waitlist).where(eq(waitlist.id, id)).returning();
  if (!deleted) return NextResponse.json({ error: "Entrée introuvable" }, { status: 404 });

  return NextResponse.json({ success: true });
}
