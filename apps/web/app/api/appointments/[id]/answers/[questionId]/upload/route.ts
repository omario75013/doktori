import { NextResponse } from "next/server";
import { db, appointmentAnswers } from "@doktori/db";
import { eq, and } from "drizzle-orm";
import { uploadToR2 } from "@/lib/r2";
import { randomUUID } from "crypto";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

/**
 * POST /api/appointments/[id]/answers/[questionId]/upload
 * Upload a file for a questionnaire answer (kind='file').
 * Stores the file in R2 and updates the answer's fileUrl.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; questionId: string }> },
) {
  const { id: appointmentId, questionId } = await params;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "Fichier requis" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Type de fichier non autorisé. Formats acceptés : JPEG, PNG, WebP, PDF" },
      { status: 400 },
    );
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "Fichier trop volumineux (max 5 Mo)" },
      { status: 400 },
    );
  }

  // Verify the answer exists
  const [answer] = await db
    .select({ id: appointmentAnswers.id })
    .from(appointmentAnswers)
    .where(
      and(
        eq(appointmentAnswers.appointmentId, appointmentId),
        eq(appointmentAnswers.questionId, questionId),
      ),
    )
    .limit(1);

  if (!answer) {
    return NextResponse.json({ error: "Réponse introuvable" }, { status: 404 });
  }

  try {
    const ext = file.name.split(".").pop() || "bin";
    const key = `answers/${appointmentId}/${questionId}/${randomUUID()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const publicUrl = await uploadToR2(buffer, key, file.type);

    // Update the answer with the file URL
    await db
      .update(appointmentAnswers)
      .set({ fileUrl: publicUrl })
      .where(eq(appointmentAnswers.id, answer.id));

    return NextResponse.json({ url: publicUrl });
  } catch (e) {
    console.error("[r2] upload failed:", e);
    return NextResponse.json(
      { error: "Erreur lors du téléversement" },
      { status: 500 },
    );
  }
}
