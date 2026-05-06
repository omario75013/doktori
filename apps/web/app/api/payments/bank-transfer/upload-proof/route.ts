import { NextRequest, NextResponse } from "next/server";
import { db, bankTransferIntents } from "@doktori/db";
import { eq } from "drizzle-orm";
import { getPatientFromRequest } from "@/lib/patient-auth";
import { uploadToR2 } from "@/lib/r2";

const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png"] as const;
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

/**
 * POST /api/payments/bank-transfer/upload-proof
 *
 * Patient uploads a proof-of-transfer document (PDF/JPG/PNG, max 5MB) for a
 * pending bank_transfer_intent. Stores file in R2 under `bank-transfer-proofs/`
 * and updates `proof_file_url` on the intent.
 *
 * Auth: patient bearer token (NEXTAUTH_SECRET).
 * Constraints: type allowlist, size cap, ownership check, status must be `pending`.
 */
export async function POST(req: NextRequest) {
  const patient = getPatientFromRequest(req);
  if (!patient) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "multipart/form-data attendu" }, { status: 400 });
  }

  const intentId = form.get("intentId");
  const file = form.get("file");

  if (typeof intentId !== "string") {
    return NextResponse.json({ error: "intentId required" }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type as (typeof ALLOWED_TYPES)[number])) {
    return NextResponse.json(
      { error: "Type non autorisé. Accepté: PDF, JPG, PNG" },
      { status: 400 }
    );
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Fichier trop volumineux (max 5 MB)" }, { status: 400 });
  }

  // Ownership + status check
  const [intent] = await db
    .select({
      id: bankTransferIntents.id,
      patientId: bankTransferIntents.patientId,
      status: bankTransferIntents.status,
    })
    .from(bankTransferIntents)
    .where(eq(bankTransferIntents.id, intentId))
    .limit(1);

  if (!intent) {
    return NextResponse.json({ error: "Intent introuvable" }, { status: 404 });
  }
  if (intent.patientId !== patient.id) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }
  if (intent.status !== "pending") {
    return NextResponse.json(
      { error: `Cannot upload proof for intent in status: ${intent.status}` },
      { status: 409 }
    );
  }

  // Upload to R2 (or local public/uploads in dev)
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const ext =
    file.type === "application/pdf" ? "pdf" : file.type === "image/jpeg" ? "jpg" : "png";
  const key = `bank-transfer-proofs/${intentId}.${ext}`;

  let publicUrl: string;
  try {
    publicUrl = await uploadToR2(buffer, key, file.type);
  } catch (e) {
    console.error("[bank-transfer/upload-proof] R2 upload failed:", e);
    return NextResponse.json({ error: "Erreur lors de l'upload" }, { status: 503 });
  }

  await db
    .update(bankTransferIntents)
    .set({ proofFileUrl: publicUrl })
    .where(eq(bankTransferIntents.id, intentId));

  return NextResponse.json({ ok: true, proofFileUrl: publicUrl });
}
