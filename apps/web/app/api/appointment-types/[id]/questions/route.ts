import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, appointmentTypes, appointmentTypeQuestions } from "@doktori/db";
import { eq, and, asc } from "drizzle-orm";

const VALID_KINDS = ["text", "choice", "file", "yesno"] as const;
type QuestionKind = (typeof VALID_KINDS)[number];

function isValidKind(k: unknown): k is QuestionKind {
  return VALID_KINDS.includes(k as QuestionKind);
}

// Verify the authenticated doctor owns this appointment type
async function verifyOwnership(doctorId: string, typeId: string) {
  const [type] = await db
    .select({ id: appointmentTypes.id })
    .from(appointmentTypes)
    .where(and(eq(appointmentTypes.id, typeId), eq(appointmentTypes.doctorId, doctorId)))
    .limit(1);
  return type ?? null;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: typeId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const owned = await verifyOwnership(session.user.id, typeId);
  if (!owned) {
    return NextResponse.json({ error: "Type introuvable" }, { status: 404 });
  }

  const questions = await db
    .select()
    .from(appointmentTypeQuestions)
    .where(eq(appointmentTypeQuestions.appointmentTypeId, typeId))
    .orderBy(asc(appointmentTypeQuestions.displayOrder), asc(appointmentTypeQuestions.createdAt));

  return NextResponse.json(questions);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: typeId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const owned = await verifyOwnership(session.user.id, typeId);
    if (!owned) {
      return NextResponse.json({ error: "Type introuvable" }, { status: 404 });
    }

    const body = await req.json();
    const { label, kind, choices, required, displayOrder } = body;

    if (!label || typeof label !== "string" || label.trim().length === 0 || label.length > 500) {
      return NextResponse.json({ error: "Label invalide (max 500 caractères)" }, { status: 400 });
    }

    if (!isValidKind(kind)) {
      return NextResponse.json(
        { error: "Kind invalide — valeurs acceptées: text, choice, file, yesno" },
        { status: 400 }
      );
    }

    if (kind === "choice") {
      if (
        !Array.isArray(choices) ||
        choices.length < 2 ||
        choices.some((c) => typeof c !== "string" || c.trim().length === 0)
      ) {
        return NextResponse.json(
          { error: "choices est requis pour kind=choice (tableau de 2 éléments minimum)" },
          { status: 400 }
        );
      }
    }

    const [created] = await db
      .insert(appointmentTypeQuestions)
      .values({
        appointmentTypeId: typeId,
        label: label.trim(),
        kind,
        choices: kind === "choice" ? (choices as string[]) : null,
        required: Boolean(required),
        displayOrder: typeof displayOrder === "number" ? displayOrder : 0,
      })
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    console.error("[POST /api//appointment-types/[id]/questions]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
