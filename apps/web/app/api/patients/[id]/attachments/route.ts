import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  db,
  appointments,
  patientAttachments,
} from "@doktori/db";
import { and, eq, desc, isNull } from "drizzle-orm";
import { uploadToR2 } from "@/lib/r2";
import { randomUUID } from "node:crypto";

async function authorize(
  patientId: string
): Promise<
  | { doctorId: string; actorId: string; role: "doctor" | "secretary" }
  | NextResponse
> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const role = session.user.role;
  if (role !== "doctor" && role !== "secretary") {
    return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
  }
  const doctorId =
    role === "doctor" ? session.user.id : session.user.doctorId;
  if (!doctorId) {
    return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
  }
  const [link] = await db
    .select({ id: appointments.id })
    .from(appointments)
    .where(
      and(eq(appointments.patientId, patientId), eq(appointments.doctorId, doctorId))
    )
    .limit(1);
  if (!link) {
    return NextResponse.json({ error: "Patient introuvable" }, { status: 404 });
  }
  return { doctorId, actorId: session.user.id, role };
}

const MAX_SIZE = 15 * 1024 * 1024; // 15 MB
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
]);

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authz = await authorize(id);
  if (authz instanceof NextResponse) return authz;

  const rows = await db
    .select({
      id: patientAttachments.id,
      category: patientAttachments.category,
      title: patientAttachments.title,
      description: patientAttachments.description,
      fileUrl: patientAttachments.fileUrl,
      filename: patientAttachments.filename,
      mimeType: patientAttachments.mimeType,
      sizeBytes: patientAttachments.sizeBytes,
      issuedAt: patientAttachments.issuedAt,
      uploadedAt: patientAttachments.uploadedAt,
    })
    .from(patientAttachments)
    .where(
      and(
        eq(patientAttachments.patientId, id),
        isNull(patientAttachments.deletedAt)
      )
    )
    .orderBy(desc(patientAttachments.uploadedAt));

  return NextResponse.json({ attachments: rows });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authz = await authorize(id);
  if (authz instanceof NextResponse) return authz;

  const form = await req.formData();
  const file = form.get("file");
  const title = (form.get("title") as string | null)?.trim() || "";
  const category = (form.get("category") as string | null)?.trim() || "autre";
  const description = (form.get("description") as string | null)?.trim() || null;
  const issuedAt = (form.get("issuedAt") as string | null)?.trim() || null;

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });
  }
  if (!title) {
    return NextResponse.json({ error: "Titre manquant" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Fichier trop volumineux (max 15 Mo)" }, { status: 413 });
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json({ error: `Type ${file.type} non supporté` }, { status: 415 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const key = `patient-attachments/${id}/${randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const url = await uploadToR2(buffer, key, file.type);

  const [row] = await db
    .insert(patientAttachments)
    .values({
      patientId: id,
      doctorId: authz.role === "doctor" ? authz.doctorId : null,
      secretaryId: authz.role === "secretary" ? authz.actorId : null,
      category,
      title: title.slice(0, 200),
      description,
      fileUrl: url,
      fileKey: `doktori/${key}`,
      filename: file.name.slice(0, 255),
      mimeType: file.type,
      sizeBytes: file.size,
      issuedAt: issuedAt && /^\d{4}-\d{2}-\d{2}$/.test(issuedAt) ? issuedAt : null,
    })
    .returning({
      id: patientAttachments.id,
      category: patientAttachments.category,
      title: patientAttachments.title,
      description: patientAttachments.description,
      fileUrl: patientAttachments.fileUrl,
      filename: patientAttachments.filename,
      mimeType: patientAttachments.mimeType,
      sizeBytes: patientAttachments.sizeBytes,
      issuedAt: patientAttachments.issuedAt,
      uploadedAt: patientAttachments.uploadedAt,
    });

  return NextResponse.json({ attachment: row });
}
