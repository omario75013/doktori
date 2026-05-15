import { NextRequest, NextResponse } from "next/server";
import { db, labs, patientDocuments, patientNotifications } from "@doktori/db";
import { eq } from "drizzle-orm";
import { requireLabContext } from "@/lib/lab-auth";

// POST /api/laboratoire/send-to-patient
// Creates a patient_documents row + patient notification. Patient-only (no doctor share).
export async function POST(req: NextRequest) {
  const ctx = await requireLabContext();
  if (ctx instanceof NextResponse) return ctx;
  const { labId } = ctx;

  const body = await req.json() as {
    patientId: string;
    file: { url: string; name: string; mime: string; size: number };
    note?: string;
  };

  if (!body.patientId || !body.file?.url) {
    return NextResponse.json({ error: "patientId + file requis" }, { status: 400 });
  }

  // Get lab kind for category
  const [labRow] = await db
    .select({ kind: labs.kind, name: labs.name })
    .from(labs)
    .where(eq(labs.id, labId))
    .limit(1);
  const category = labRow?.kind === "radiology" ? "imagerie" : "analyse";

  const [doc] = await db
    .insert(patientDocuments)
    .values({
      patientId: body.patientId,
      uploadedBy: "lab",
      uploadedByLabId: labId,
      sharedWithDoctorIds: [],
      fileUrl: body.file.url,
      fileName: body.file.name.slice(0, 255),
      mimeType: body.file.mime,
      sizeBytes: body.file.size,
      category,
      note: body.note ?? null,
    })
    .returning({ id: patientDocuments.id });

  // Patient notification (fail-soft)
  try {
    await db.insert(patientNotifications).values({
      patientId: body.patientId,
      type: "lab_result",
      title: "Résultats disponibles",
      body: `${labRow?.name ?? "Le laboratoire"} a partagé un document avec vous.`,
      link: "/mes-documents",
    });
  } catch {
    // Fail-soft — notification is not critical
  }

  return NextResponse.json({ ok: true, documentId: doc?.id }, { status: 201 });
}
