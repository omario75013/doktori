import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, appointments, appointmentAnswers, appointmentTypeQuestions } from "@doktori/db";
import { eq, and } from "drizzle-orm";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  // Verify doctor owns this appointment
  const [appointment] = await db
    .select({ id: appointments.id, doctorId: appointments.doctorId })
    .from(appointments)
    .where(and(eq(appointments.id, id), eq(appointments.doctorId, session.user.id)))
    .limit(1);

  if (!appointment) {
    return NextResponse.json({ error: "Rendez-vous introuvable" }, { status: 404 });
  }

  const answers = await db
    .select({
      id: appointmentAnswers.id,
      questionId: appointmentAnswers.questionId,
      value: appointmentAnswers.value,
      fileUrl: appointmentAnswers.fileUrl,
      createdAt: appointmentAnswers.createdAt,
      label: appointmentTypeQuestions.label,
      kind: appointmentTypeQuestions.kind,
      displayOrder: appointmentTypeQuestions.displayOrder,
    })
    .from(appointmentAnswers)
    .innerJoin(
      appointmentTypeQuestions,
      eq(appointmentAnswers.questionId, appointmentTypeQuestions.id)
    )
    .where(eq(appointmentAnswers.appointmentId, id))
    .orderBy(appointmentTypeQuestions.displayOrder);

  return NextResponse.json(answers);
}
