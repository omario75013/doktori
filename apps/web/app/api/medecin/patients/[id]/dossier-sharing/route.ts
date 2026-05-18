import { NextRequest, NextResponse } from "next/server";
import { db, patientDossierSharing, appointments } from "@doktori/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "@/lib/require-auth";

const SECTION_KEYS = [
  "medicalSummary",
  "familyHistory",
  "lifestyle",
  "surgeries",
  "hospitalizations",
  "vaccinations",
  "womensHealth",
] as const;

async function doctorHasAccess(doctorId: string, patientId: string): Promise<boolean> {
  const [link] = await db
    .select({ id: appointments.id })
    .from(appointments)
    .where(and(eq(appointments.doctorId, doctorId), eq(appointments.patientId, patientId)))
    .limit(1);
  return !!link;
}

// GET — returns { sharing, setByDoctorId, isOwner } so the UI can render toggles
// only for the owning doctor.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireAuth(req);
  if (!user || user.role !== "doctor") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const { id: patientId } = await params;
  if (!(await doctorHasAccess(user.id, patientId))) {
    return NextResponse.json({ error: "Patient introuvable" }, { status: 404 });
  }

  const [row] = await db
    .select()
    .from(patientDossierSharing)
    .where(eq(patientDossierSharing.patientId, patientId))
    .limit(1);

  return NextResponse.json({
    sharing: row?.sharing ?? {},
    setByDoctorId: row?.setByDoctorId ?? null,
    isOwner: !row || row.setByDoctorId === user.id,
  });
}

// PATCH — body: { sharing: { medicalSummary?: bool, ... } }
// Replaces the sharing record and stamps set_by_doctor_id = current doctor.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireAuth(req);
  if (!user || user.role !== "doctor") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const { id: patientId } = await params;
  if (!(await doctorHasAccess(user.id, patientId))) {
    return NextResponse.json({ error: "Patient introuvable" }, { status: 404 });
  }
  const body = await req.json().catch(() => null);
  if (!body || typeof body.sharing !== "object" || body.sharing === null) {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }

  const sanitized: Record<string, boolean> = {};
  for (const key of SECTION_KEYS) {
    if (typeof body.sharing[key] === "boolean") sanitized[key] = body.sharing[key];
  }

  const now = new Date();
  const [existing] = await db
    .select({ patientId: patientDossierSharing.patientId })
    .from(patientDossierSharing)
    .where(eq(patientDossierSharing.patientId, patientId))
    .limit(1);

  if (existing) {
    await db
      .update(patientDossierSharing)
      .set({ sharing: sanitized, setByDoctorId: user.id, updatedAt: now })
      .where(eq(patientDossierSharing.patientId, patientId));
  } else {
    await db
      .insert(patientDossierSharing)
      .values({ patientId, sharing: sanitized, setByDoctorId: user.id, updatedAt: now });
  }
  return NextResponse.json({ ok: true });
}
