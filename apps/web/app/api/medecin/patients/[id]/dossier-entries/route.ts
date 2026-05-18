import { NextRequest, NextResponse } from "next/server";
import {
  db,
  patientDossierEntries,
  appointments,
  doctors,
} from "@doktori/db";
import { eq, and, ne, or } from "drizzle-orm";
import { requireAuth } from "@/lib/require-auth";

const SECTIONS = new Set([
  "medicalSummary",
  "familyHistory",
  "lifestyle",
  "surgeries",
  "hospitalizations",
  "vaccinations",
  "womensHealth",
]);

async function hasAccess(doctorId: string, patientId: string): Promise<boolean> {
  const [link] = await db
    .select({ id: appointments.id })
    .from(appointments)
    .where(and(eq(appointments.doctorId, doctorId), eq(appointments.patientId, patientId)))
    .limit(1);
  return !!link;
}

// GET /api/medecin/patients/[id]/dossier-entries?section=medicalSummary
// Returns { own: {data, shared} | null, others: [{doctorId, doctorName, data, sharedAt}] }
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
    return NextResponse.json({ own: null, others: [] });
  }
  const section = new URL(req.url).searchParams.get("section");
  if (!section || !SECTIONS.has(section)) {
    return NextResponse.json({ error: "section requise" }, { status: 400 });
  }

  // Own entry (regardless of shared flag)
  const [own] = await db
    .select()
    .from(patientDossierEntries)
    .where(
      and(
        eq(patientDossierEntries.patientId, patientId),
        eq(patientDossierEntries.doctorId, user.id),
        eq(patientDossierEntries.section, section),
      ),
    )
    .limit(1);

  // Others' entries marked shared
  const otherRows = await db
    .select({
      id: patientDossierEntries.id,
      doctorId: patientDossierEntries.doctorId,
      doctorName: doctors.name,
      data: patientDossierEntries.data,
      updatedAt: patientDossierEntries.updatedAt,
    })
    .from(patientDossierEntries)
    .innerJoin(doctors, eq(patientDossierEntries.doctorId, doctors.id))
    .where(
      and(
        eq(patientDossierEntries.patientId, patientId),
        eq(patientDossierEntries.section, section),
        eq(patientDossierEntries.shared, true),
        ne(patientDossierEntries.doctorId, user.id),
      ),
    );

  return NextResponse.json({
    own: own ? { data: own.data, shared: own.shared } : null,
    others: otherRows,
  });
}

// PUT — upsert the viewer's own entry. Body: { section, data, shared? }
export async function PUT(
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
  const section = body.section as string;
  if (!SECTIONS.has(section)) {
    return NextResponse.json({ error: "section invalide" }, { status: 400 });
  }
  const data = (body.data ?? {}) as Record<string, unknown>;
  const shared = typeof body.shared === "boolean" ? body.shared : true;

  const now = new Date();
  const [existing] = await db
    .select({ id: patientDossierEntries.id })
    .from(patientDossierEntries)
    .where(
      and(
        eq(patientDossierEntries.patientId, patientId),
        eq(patientDossierEntries.doctorId, user.id),
        eq(patientDossierEntries.section, section),
      ),
    )
    .limit(1);

  if (existing) {
    await db
      .update(patientDossierEntries)
      .set({ data, shared, updatedAt: now })
      .where(eq(patientDossierEntries.id, existing.id));
  } else {
    await db.insert(patientDossierEntries).values({
      patientId,
      doctorId: user.id,
      section,
      data,
      shared,
    });
  }
  return NextResponse.json({ ok: true });
}
