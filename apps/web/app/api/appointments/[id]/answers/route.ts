import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { db, appointments, appointmentAnswers, appointmentTypeQuestions } from "@doktori/db";
import { eq, and } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await requireAuth(req);
  if (!user || (user.role !== "doctor" && user.role !== "secretary")) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const doctorId = user.role === "doctor" ? user.id : user.doctorId;

  const [appointment] = await db
    .select({ id: appointments.id, doctorId: appointments.doctorId })
    .from(appointments)
    .where(and(eq(appointments.id, id), eq(appointments.doctorId, doctorId)))
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
