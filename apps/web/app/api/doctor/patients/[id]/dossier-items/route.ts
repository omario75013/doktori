import { NextRequest, NextResponse } from "next/server";
import {
  db,
  patientAllergies,
  patientVaccinations,
  patientAnalyses,
  appointments,
} from "@doktori/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "@/lib/require-auth";

const TABLES = {
  allergy: patientAllergies,
  vaccination: patientVaccinations,
  analysis: patientAnalyses,
} as const;

type DossierType = keyof typeof TABLES;

async function hasAccess(doctorId: string, patientId: string): Promise<boolean> {
  const [link] = await db
    .select({ id: appointments.id })
    .from(appointments)
    .where(and(eq(appointments.doctorId, doctorId), eq(appointments.patientId, patientId)))
    .limit(1);
  return !!link;
}

// GET /api/doctor/patients/[id]/dossier-items?type=allergy|vaccination|analysis
// Returns all entries (approved + pending + rejected) for that type.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireAuth(req);
  if (!user || user.role !== "doctor") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const { id: patientId } = await params;
  if (!(await hasAccess(user.id, patientId))) {
    return NextResponse.json({ items: [] });
  }

  const type = new URL(req.url).searchParams.get("type") as DossierType | null;
  if (!type || !TABLES[type]) {
    return NextResponse.json({ error: "type requis" }, { status: 400 });
  }
  const table = TABLES[type];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items = await db.select().from(table as any).where(eq((table as any).patientId, patientId)).orderBy(desc((table as any).createdAt));
  return NextResponse.json({ items });
}

// POST /api/doctor/patients/[id]/dossier-items
// Body: { type, ...fields }. Doctor-created → createdBy='doctor', approvalStatus='approved'.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireAuth(req);
  if (!user || user.role !== "doctor") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const { id: patientId } = await params;
  if (!(await hasAccess(user.id, patientId))) {
    return NextResponse.json({ error: "Patient introuvable" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  const type = body.type as DossierType;
  if (!TABLES[type]) return NextResponse.json({ error: "type invalide" }, { status: 400 });

  const now = new Date();
  const baseFields = {
    patientId,
    createdBy: "doctor" as const,
    approvalStatus: "approved" as const,
    approvedByDoctorId: user.id,
    approvedAt: now,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let row: any = null;
  if (type === "allergy") {
    if (!body.allergen?.trim()) return NextResponse.json({ error: "allergen requis" }, { status: 400 });
    [row] = await db
      .insert(patientAllergies)
      .values({
        ...baseFields,
        allergen: String(body.allergen).trim().slice(0, 160),
        severity: body.severity ?? null,
        reaction: body.reaction ?? null,
        diagnosedAt: body.diagnosedAt ?? null,
      })
      .returning();
  } else if (type === "vaccination") {
    if (!body.vaccineName?.trim()) return NextResponse.json({ error: "vaccineName requis" }, { status: 400 });
    if (!body.dateReceived) return NextResponse.json({ error: "dateReceived requis" }, { status: 400 });
    [row] = await db
      .insert(patientVaccinations)
      .values({
        ...baseFields,
        vaccineName: String(body.vaccineName).trim().slice(0, 120),
        dateReceived: body.dateReceived,
        batchNumber: body.batchNumber ?? null,
        givenBy: body.givenBy ?? null,
        notes: body.notes ?? null,
      })
      .returning();
  } else if (type === "analysis") {
    if (!body.title?.trim()) return NextResponse.json({ error: "title requis" }, { status: 400 });
    [row] = await db
      .insert(patientAnalyses)
      .values({
        ...baseFields,
        title: String(body.title).trim().slice(0, 200),
        labName: body.labName ?? null,
        testDate: body.testDate ?? null,
        fileUrl: body.fileUrl ?? null,
        notes: body.notes ?? null,
      })
      .returning();
  }
  return NextResponse.json({ item: row }, { status: 201 });
}
