import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { logAudit, extractRequestMeta } from "@/lib/admin-audit";
import { db, subscriptions } from "@doktori/db";
import { eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin(["super_admin", "finance"]);
    if (admin instanceof NextResponse) return admin;

    const { id } = await params;
    const body = (await req.json()) as { months?: unknown };

    const months = typeof body.months === "number" && Number.isInteger(body.months) && body.months > 0
      ? body.months
      : null;

    if (!months) {
      return NextResponse.json(
        { error: "Le champ months doit être un entier positif." },
        { status: 422 }
      );
    }

    const [before] = await db
      .select({ id: subscriptions.id, status: subscriptions.status, endsAt: subscriptions.endsAt })
      .from(subscriptions)
      .where(eq(subscriptions.id, id))
      .limit(1);

    if (!before) {
      return NextResponse.json({ error: "Abonnement introuvable" }, { status: 404 });
    }
    if (before.status === "cancelled") {
      return NextResponse.json({ error: "Impossible d'étendre un abonnement annulé." }, { status: 409 });
    }

    // Compute new end date in application code — no user input reaches SQL directly
    const baseDate = before.endsAt ?? new Date();
    const newEndsAt = new Date(baseDate);
    newEndsAt.setMonth(newEndsAt.getMonth() + months);

    const newStatus = before.status === "expired" ? "active" : before.status;

    const [updated] = await db
      .update(subscriptions)
      .set({
        endsAt: newEndsAt,
        status: newStatus,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, id))
      .returning({ id: subscriptions.id, endsAt: subscriptions.endsAt, status: subscriptions.status });

    const meta = extractRequestMeta(req);
    await logAudit({
      actor: admin,
      action: "subscription.extend",
      resourceType: "subscriptions",
      resourceId: id,
      before: { status: before.status, endsAt: before.endsAt?.toISOString() ?? null },
      after: { status: updated?.status, endsAt: updated?.endsAt?.toISOString() ?? null, extendedByMonths: months },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return NextResponse.json({ ok: true, subscription: updated });
  } catch (e) {
    console.error("[POST /api//admin/finance/subscriptions/[id]/extend]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
