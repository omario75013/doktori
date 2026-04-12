import { NextRequest, NextResponse } from "next/server";
import { db, conversations, messages, appointments } from "@doktori/db";
import { eq, and } from "drizzle-orm";
import { getPatientFromRequest } from "@/lib/patient-auth";

export async function POST(req: NextRequest) {
  const patient = getPatientFromRequest(req);
  if (!patient) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await req.json();
  const { doctorId, content } = body;

  if (!doctorId || typeof doctorId !== "string") {
    return NextResponse.json({ error: "doctorId requis" }, { status: 400 });
  }
  if (!content || typeof content !== "string" || content.trim().length === 0) {
    return NextResponse.json({ error: "Message vide" }, { status: 400 });
  }
  if (content.length > 5000) {
    return NextResponse.json({ error: "Message trop long (max 5000 caractères)" }, { status: 400 });
  }

  // Verify patient has had at least one appointment with this doctor
  const [appt] = await db
    .select({ id: appointments.id })
    .from(appointments)
    .where(and(eq(appointments.doctorId, doctorId), eq(appointments.patientId, patient.id)))
    .limit(1);

  if (!appt) {
    return NextResponse.json(
      { error: "Vous ne pouvez contacter que des médecins avec qui vous avez eu un rendez-vous" },
      { status: 403 }
    );
  }

  const trimmedContent = content.trim();
  const now = new Date();

  // Upsert conversation (auto-create if none exists)
  const result = await db.transaction(async (tx) => {
    let [conv] = await tx
      .select()
      .from(conversations)
      .where(and(eq(conversations.doctorId, doctorId), eq(conversations.patientId, patient.id)))
      .limit(1);

    if (!conv) {
      [conv] = await tx
        .insert(conversations)
        .values({ doctorId, patientId: patient.id, lastMessageAt: now })
        .returning();
    } else {
      await tx
        .update(conversations)
        .set({ lastMessageAt: now })
        .where(eq(conversations.id, conv.id));
    }

    const [msg] = await tx
      .insert(messages)
      .values({
        conversationId: conv.id,
        senderType: "patient",
        senderId: patient.id,
        content: trimmedContent,
        createdAt: now,
      })
      .returning();

    return { conversation: conv, message: msg };
  });

  return NextResponse.json(result, { status: 201 });
}
