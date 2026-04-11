import { NextResponse } from "next/server";
import { db, appointmentTypeQuestions } from "@doktori/db";
import { eq, asc } from "drizzle-orm";

// Public endpoint — no auth required.
// Used by the patient booking page to fetch questions for a given type.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const typeId = searchParams.get("typeId");

  if (!typeId) {
    return NextResponse.json({ error: "typeId requis" }, { status: 400 });
  }

  const questions = await db
    .select({
      id: appointmentTypeQuestions.id,
      label: appointmentTypeQuestions.label,
      kind: appointmentTypeQuestions.kind,
      choices: appointmentTypeQuestions.choices,
      required: appointmentTypeQuestions.required,
      displayOrder: appointmentTypeQuestions.displayOrder,
    })
    .from(appointmentTypeQuestions)
    .where(eq(appointmentTypeQuestions.appointmentTypeId, typeId))
    .orderBy(asc(appointmentTypeQuestions.displayOrder), asc(appointmentTypeQuestions.createdAt));

  return NextResponse.json(questions);
}
