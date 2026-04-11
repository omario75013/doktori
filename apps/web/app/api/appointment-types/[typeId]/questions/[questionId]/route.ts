import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, appointmentTypes, appointmentTypeQuestions } from "@doktori/db";
import { eq, and } from "drizzle-orm";

const VALID_KINDS = ["text", "choice", "file", "yesno"] as const;
type QuestionKind = (typeof VALID_KINDS)[number];

function isValidKind(k: unknown): k is QuestionKind {
  return VALID_KINDS.includes(k as QuestionKind);
}

async function verifyOwnership(doctorId: string, typeId: string, questionId: string) {
  const [type] = await db
    .select({ id: appointmentTypes.id })
    .from(appointmentTypes)
    .where(and(eq(appointmentTypes.id, typeId), eq(appointmentTypes.doctorId, doctorId)))
    .limit(1);
  if (!type) return null;

  const [question] = await db
    .select()
    .from(appointmentTypeQuestions)
    .where(
      and(
        eq(appointmentTypeQuestions.id, questionId),
        eq(appointmentTypeQuestions.appointmentTypeId, typeId)
      )
    )
    .limit(1);
  return question ?? null;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ typeId: string; questionId: string }> }
) {
  const { typeId, questionId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const question = await verifyOwnership(session.user.id, typeId, questionId);
  if (!question) {
    return NextResponse.json({ error: "Question introuvable" }, { status: 404 });
  }

  const body = await req.json();

  type PatchFields = {
    label?: string;
    kind?: QuestionKind;
    choices?: string[] | null;
    required?: boolean;
    displayOrder?: number;
  };
  const patch: PatchFields = {};

  if (body.label !== undefined) {
    if (typeof body.label !== "string" || body.label.trim().length === 0 || body.label.length > 500) {
      return NextResponse.json({ error: "Label invalide (max 500 caractères)" }, { status: 400 });
    }
    patch.label = body.label.trim();
  }

  if (body.kind !== undefined) {
    if (!isValidKind(body.kind)) {
      return NextResponse.json(
        { error: "Kind invalide — valeurs acceptées: text, choice, file, yesno" },
        { status: 400 }
      );
    }
    patch.kind = body.kind;
  }

  const effectiveKind = (patch.kind ?? question.kind) as QuestionKind;

  if (body.choices !== undefined || effectiveKind === "choice") {
    if (effectiveKind === "choice") {
      const choices = body.choices ?? question.choices;
      if (
        !Array.isArray(choices) ||
        choices.length < 2 ||
        choices.some((c: unknown) => typeof c !== "string" || (c as string).trim().length === 0)
      ) {
        return NextResponse.json(
          { error: "choices est requis pour kind=choice (tableau de 2 éléments minimum)" },
          { status: 400 }
        );
      }
      patch.choices = choices as string[];
    } else {
      patch.choices = null;
    }
  }

  if (body.required !== undefined) {
    patch.required = Boolean(body.required);
  }

  if (body.displayOrder !== undefined) {
    if (typeof body.displayOrder !== "number") {
      return NextResponse.json({ error: "displayOrder doit être un nombre" }, { status: 400 });
    }
    patch.displayOrder = body.displayOrder;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Aucun champ à mettre à jour" }, { status: 400 });
  }

  const [updated] = await db
    .update(appointmentTypeQuestions)
    .set(patch)
    .where(eq(appointmentTypeQuestions.id, questionId))
    .returning();

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ typeId: string; questionId: string }> }
) {
  const { typeId, questionId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const question = await verifyOwnership(session.user.id, typeId, questionId);
  if (!question) {
    return NextResponse.json({ error: "Question introuvable" }, { status: 404 });
  }

  await db
    .delete(appointmentTypeQuestions)
    .where(eq(appointmentTypeQuestions.id, questionId));

  return NextResponse.json({ success: true });
}
