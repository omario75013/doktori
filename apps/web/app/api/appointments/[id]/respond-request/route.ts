import { NextResponse, NextRequest } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { db, appointments } from "@doktori/db";
import { eq, and } from "drizzle-orm";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth(req);
  if (!user || (user.role !== "doctor" && user.role !== "secretary")) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;

  let body: { action?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }

  const { action } = body;
  if (action !== "accept" && action !== "decline") {
    return NextResponse.json({ error: "action doit être 'accept' ou 'decline'" }, { status: 400 });
  }

  try {
    const [appt] = await db
      .select()
      .from(appointments)
      .where(eq(appointments.id, id))
      .limit(1);

    if (!appt) {
      return NextResponse.json({ error: "RDV introuvable" }, { status: 404 });
    }

    // Verify ownership: doctor checks own id, secretary checks their doctorId
    const ownerDoctorId = user.role === "doctor" ? user.id : user.doctorId;
    if (appt.doctorId !== ownerDoctorId) {
      return NextResponse.json({ error: "RDV introuvable" }, { status: 404 });
    }

    if (
      appt.status !== "reschedule_requested" &&
      appt.status !== "cancel_requested"
    ) {
      return NextResponse.json(
        { error: "Ce RDV n'a pas de demande de changement en attente" },
        { status: 422 }
      );
    }

    const now = new Date();
    let newStatus: string;
    let extraFields: Record<string, unknown> = {};

    if (action === "accept") {
      if (appt.status === "cancel_requested") {
        newStatus = "cancelled";
        extraFields = { cancelledAt: now };
      } else {
        // reschedule_requested — reset to pending, patient will be contacted
        newStatus = "pending";
      }
    } else {
      // decline — restore to confirmed
      newStatus = "confirmed";
    }

    const [updated] = await db
      .update(appointments)
      .set({ status: newStatus, ...extraFields, updatedAt: now })
      .where(eq(appointments.id, id))
      .returning({ status: appointments.status });

    return NextResponse.json({ ok: true, status: updated.status });
  } catch (e) {
    console.error("[POST /api/appointments/[id]/respond-request]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
