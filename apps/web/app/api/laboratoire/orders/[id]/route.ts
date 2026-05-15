import { NextRequest, NextResponse } from "next/server";
import { db, labOrders } from "@doktori/db";
import { eq, and, or } from "drizzle-orm";
import { requireLabContext } from "@/lib/lab-auth";

// PATCH /api/laboratoire/orders/[id]
// Updates workflow metadata: internalRef, specimenCollectedAt, expectedResultAt
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireLabContext();
  if (ctx instanceof NextResponse) return ctx;
  const { labId } = ctx;

  const { id } = await params;
  const body = await req.json() as {
    internalRef?: string | null;
    specimenCollectedAt?: string | null;
    expectedResultAt?: string | null;
  };

  // Verify ownership
  const [existing] = await db
    .select({ id: labOrders.id })
    .from(labOrders)
    .where(
      and(
        eq(labOrders.id, id),
        or(eq(labOrders.labId, labId), eq(labOrders.completedByLabId, labId))
      )
    )
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
  }

  await db
    .update(labOrders)
    .set({
      internalRef: body.internalRef ?? null,
      specimenCollectedAt: body.specimenCollectedAt ? new Date(body.specimenCollectedAt) : null,
      expectedResultAt: body.expectedResultAt ? new Date(body.expectedResultAt) : null,
      updatedAt: new Date(),
    })
    .where(eq(labOrders.id, id));

  return NextResponse.json({ ok: true });
}
