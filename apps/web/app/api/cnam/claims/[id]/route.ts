import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, cnamClaims, patients, doctors } from "@doktori/db";
import { eq, and } from "drizzle-orm";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;

  const [row] = await db
    .select({
      claim: cnamClaims,
      patientName: patients.name,
      patientPhone: patients.phone,
      patientDob: patients.dateOfBirth,
      doctorName: doctors.name,
      doctorSpecialty: doctors.specialty,
      doctorAddress: doctors.address,
      doctorCity: doctors.city,
      doctorPhone: doctors.phone,
    })
    .from(cnamClaims)
    .innerJoin(patients, eq(cnamClaims.patientId, patients.id))
    .innerJoin(doctors, eq(cnamClaims.doctorId, doctors.id))
    .where(and(eq(cnamClaims.id, id), eq(cnamClaims.doctorId, session.user.id)))
    .limit(1);

  if (!row) return NextResponse.json({ error: "Bordereau introuvable" }, { status: 404 });
  return NextResponse.json(row);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const { id } = await params;
    const { status } = await req.json().catch(() => ({}));
    if (!["draft", "submitted", "reimbursed", "rejected"].includes(status)) {
      return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
    }

    const now = new Date();
    const patch: Record<string, unknown> = { status };
    if (status === "submitted") patch.submittedAt = now;
    if (status === "reimbursed") patch.reimbursedAt = now;

    const [updated] = await db
      .update(cnamClaims)
      .set(patch)
      .where(and(eq(cnamClaims.id, id), eq(cnamClaims.doctorId, session.user.id)))
      .returning();

    if (!updated) return NextResponse.json({ error: "Bordereau introuvable" }, { status: 404 });
    return NextResponse.json(updated);
  } catch (e) {
    console.error("[PATCH /api//cnam/claims/[id]]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
