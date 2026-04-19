import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, secretaries } from "@doktori/db";
import { and, eq } from "drizzle-orm";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { id } = await params;

    // Soft-deactivate — only if the secretary belongs to this doctor
    const [updated] = await db
      .update(secretaries)
      .set({ isActive: false })
      .where(
        and(
          eq(secretaries.id, id),
          eq(secretaries.doctorId, session.user.id),
        )
      )
      .returning({ id: secretaries.id });

    if (!updated) {
      return NextResponse.json({ error: "Secrétaire introuvable" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[DELETE /api//secretaries/[id]]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
