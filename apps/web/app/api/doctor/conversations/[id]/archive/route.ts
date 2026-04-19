import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, conversations } from "@doktori/db";
import { eq, and } from "drizzle-orm";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "doctor") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { id: conversationId } = await params;

    const [updated] = await db
      .update(conversations)
      .set({ status: "archived" })
      .where(and(eq(conversations.id, conversationId), eq(conversations.doctorId, session.user.id)))
      .returning({ id: conversations.id, status: conversations.status });

    if (!updated) return NextResponse.json({ error: "Conversation introuvable" }, { status: 404 });

    return NextResponse.json(updated);
  } catch (e) {
    console.error("[POST /api//doctor/conversations/[id]/archive]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
