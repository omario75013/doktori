import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { db, doctors } from "@doktori/db";
import { eq } from "drizzle-orm";

// GET /api/doctor/status — return current status message (doctor or secretary)
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth || (auth.role !== "doctor" && auth.role !== "secretary")) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  // Secretary sees their doctor's status; doctor sees their own
  const doctorId = auth.role === "secretary" ? auth.doctorId : auth.id;

  const [doc] = await db
    .select({
      statusMessage: doctors.statusMessage,
      awayMessage: doctors.awayMessage,
      statusActiveUntil: doctors.statusActiveUntil,
    })
    .from(doctors)
    .where(eq(doctors.id, doctorId))
    .limit(1);

  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isActive =
    !!doc.statusMessage &&
    (!doc.statusActiveUntil || new Date(doc.statusActiveUntil) > new Date());

  return NextResponse.json({ ...doc, isActive });
}

// PATCH /api/doctor/status — set or clear status/away message
export async function PATCH(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth || auth.role !== "doctor") return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { statusMessage, awayMessage, statusActiveUntil } = body as Record<string, unknown>;

  const update: Partial<typeof doctors.$inferInsert> = {};

  // Pass null explicitly to clear the status
  if ("statusMessage" in (body as object)) {
    update.statusMessage =
      typeof statusMessage === "string" && statusMessage.trim().length > 0
        ? statusMessage.trim()
        : null;
  }
  if ("awayMessage" in (body as object)) {
    update.awayMessage =
      typeof awayMessage === "string" && awayMessage.trim().length > 0
        ? awayMessage.trim()
        : null;
  }
  if ("statusActiveUntil" in (body as object)) {
    update.statusActiveUntil =
      typeof statusActiveUntil === "string" ? new Date(statusActiveUntil) : null;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Aucun champ à mettre à jour" }, { status: 400 });
  }

  const [updated] = await db
    .update(doctors)
    .set(update)
    .where(eq(doctors.id, auth.id))
    .returning({
      statusMessage: doctors.statusMessage,
      awayMessage: doctors.awayMessage,
      statusActiveUntil: doctors.statusActiveUntil,
    });

  const isActive =
    !!updated?.statusMessage &&
    (!updated.statusActiveUntil || new Date(updated.statusActiveUntil) > new Date());

  return NextResponse.json({ ...updated, isActive });
}
